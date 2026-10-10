import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "../src/app.js";
import Product from "../src/models/Product_model.js";
import User from "../src/models/User_model.js";
import { cache, createCache, storefrontCacheScope } from "../src/utils/cache.js";
import { generateAccessToken, generateRefreshToken } from "../src/utils/token.js";

function fakeRedis() {
  const values = new Map();
  return {
    isReady: true,
    now: 0,
    values,
    withCommandOptions() { return this; },
    async get(key) {
      const item = values.get(key);
      return item && item.expires > this.now ? item.value : null;
    },
    async set(key, value, options) {
      assert.ok(options.EX > 0, "Every cache key must expire");
      if (options.NX && await this.get(key) !== null) return null;
      values.set(key, { value, expires: this.now + options.EX * 1000 });
      return "OK";
    }
  };
}

test("cache hits, user isolation, TTL expiry and revision expiry", async () => {
  const client = fakeRedis();
  const cached = createCache(client);
  let reads = 0;
  const load = async () => ({ read: ++reads });
  assert.deepEqual(await cached.remember("user:1", "list", load), { read: 1 });
  assert.deepEqual(await cached.remember("user:1", "list", load), { read: 1 });
  assert.deepEqual(await cached.remember("user:2", "list", load), { read: 2 });
  client.now += 61000;
  assert.deepEqual(await cached.remember("user:1", "list", load), { read: 3 });
  client.now += 121000;
  assert.deepEqual(await cached.remember("user:1", "list", load), { read: 4 });
});

test("invalidation across instances prevents an in-flight read repopulating current cache", async () => {
  const client = fakeRedis();
  const reader = createCache(client);
  const writer = createCache(client);
  let finishRead, signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const pending = reader.remember("user:1", "list", () => {
    signalStarted();
    return new Promise(resolve => { finishRead = resolve; });
  });
  await started;
  await writer.invalidate("user:1");
  finishRead(["old"]);
  await pending;
  assert.deepEqual(await reader.remember("user:1", "list", async () => ["new"]), ["new"]);
});

test("Redis outage, corrupt JSON and command failures fall back; database errors propagate", async () => {
  const client = fakeRedis();
  const cached = createCache(client);
  await cached.remember("user:1", "list", async () => ["old"]);
  const entry = [...client.values.keys()].find(key => key.endsWith(":list"));
  client.values.get(entry).value = "broken-json";
  assert.deepEqual(await cached.remember("user:1", "list", async () => ["fresh"]), ["fresh"]);
  client.isReady = false;
  await cached.invalidate("user:1");
  assert.deepEqual(await cached.remember("user:1", "list", async () => []), []);
  client.isReady = true;
  // After a missed invalidation, skip potentially stale entries for a full TTL.
  assert.deepEqual(await cached.remember("user:1", "list", async () => ["after outage"]), ["after outage"]);
  await assert.rejects(cached.remember("user:1", "list", async () => { throw new Error("DB failed"); }), /DB failed/);
  const failed = fakeRedis();
  failed.set = async () => { throw new Error("Redis down"); };
  const failedCache = createCache(failed);
  await failedCache.invalidate("user:1");
  assert.equal(await failedCache.remember("user:1", "list", async () => "database"), "database");
  assert.equal(await createCache(failed).remember("user:1", "list", async () => "database"), "database");
});

test("missing data is not cached", async () => {
  const cached = createCache(fakeRedis());
  assert.equal(await cached.remember("u", "item", async () => null), null);
  assert.deepEqual(await cached.remember("u", "item", async () => ({ id: 1 })), { id: 1 });
});

let server, base;
const user = { _id: "507f1f77bcf86cd799439011", username: "cache-user" };
const other = { _id: "507f191e810c19729de860ea", username: "other-user" };
before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "cache-test-access-secret";
  process.env.REFRESH_TOKEN_SECRET = "cache-test-refresh-secret";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

function request(path, method = "GET", body, identity = user) {
  return fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(identity ? { Cookie: `accessToken=${generateAccessToken(identity)}` } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

function installCache(t) {
  const client = fakeRedis();
  const instance = createCache(client);
  t.mock.method(cache, "remember", instance.remember);
  t.mock.method(cache, "invalidate", instance.invalidate);
  return client;
}

test("product API caches authenticated reads and invalidates list/detail on every write", async (t) => {
  installCache(t);
  let data = [{ _id: user._id, owner: user._id, title: "Keyboard", price: 1500 }];
  let listReads = 0, itemReads = 0;
  t.mock.method(Product, "find", ({ owner }) => ({ sort: async () => {
    listReads++;
    return structuredClone(data.filter(item => item.owner === owner));
  } }));
  t.mock.method(Product, "findOne", async ({ _id, owner }) => {
    itemReads++;
    return structuredClone(data.find(item => item._id === _id && item.owner === owner) ?? null);
  });
  t.mock.method(Product, "create", async value => {
    const product = { ...value, _id: other._id };
    data.push(product);
    return product;
  });
  t.mock.method(Product, "findOneAndUpdate", async ({ _id, owner }, update) => {
    const product = data.find(item => item._id === _id && item.owner === owner);
    if (!product) return null;
    Object.assign(product, update.$set);
    return structuredClone(product);
  });
  t.mock.method(Product, "findOneAndDelete", async ({ _id, owner }) => {
    const product = data.find(item => item._id === _id && item.owner === owner);
    data = data.filter(item => item !== product);
    return product ?? null;
  });
  const list = async (identity = user) => (await request("/api/products", "GET", undefined, identity)).json();
  const item = async () => (await request(`/api/products/${user._id}`)).json();
  assert.equal((await list()).products.length, 1);
  assert.equal((await list()).products.length, 1);
  assert.equal(listReads, 1);
  assert.equal((await item()).product.price, 1500);
  await item();
  assert.equal(itemReads, 1);
  assert.deepEqual((await list(other)).products, []);
  assert.equal((await request(`/api/products/${user._id}`, "GET", undefined, other)).status, 404);
  assert.equal((await request("/api/products", "GET", undefined, null)).status, 401);
  assert.equal((await request("/api/products", "POST", { title: "Mouse", price: 800 })).status, 201);
  assert.equal((await list()).products.length, 2);
  assert.equal((await request(`/api/products/${user._id}`, "PUT", { price: 2000 })).status, 200);
  assert.equal((await item()).product.price, 2000);
  assert.equal((await list()).products[0].price, 2000);
  assert.equal((await request(`/api/products/${user._id}`, "DELETE")).status, 200);
  assert.equal((await request(`/api/products/${user._id}`)).status, 404);
  assert.equal((await list()).products.length, 1);
});

test("profile cache excludes secrets, keeps users separate and clears on logout", async (t) => {
  const client = installCache(t);
  let reads = 0;
  t.mock.method(User, "findById", id => ({ select: async projection => {
    assert.equal(projection, "-password -refreshTokenHash");
    reads++;
    return { _id: id, username: id === user._id ? user.username : other.username };
  } }));
  t.mock.method(User, "findByIdAndUpdate", async () => ({}));
  const profile = async identity => (await request("/api/auth/me", "GET", undefined, identity)).json();
  assert.equal((await profile(user)).user.username, user.username);
  await profile(user);
  assert.equal(reads, 1);
  assert.equal((await profile(other)).user.username, other.username);
  assert.equal((await request("/api/auth/me", "GET", undefined, null)).status, 401);
  assert.ok([...client.values.values()].every(item => !/password|refreshTokenHash/.test(item.value)));
  const response = await fetch(base + "/api/auth/logout", {
    method: "POST", headers: { Cookie: `refreshToken=${generateRefreshToken(user)}` }
  });
  assert.equal(response.status, 200);
  await profile(user);
  assert.equal(reads, 3);
});

test("product writes and reads still succeed with Redis offline", async (t) => {
  const client = installCache(t);
  client.isReady = false;
  t.mock.method(Product, "create", async value => value);
  t.mock.method(Product, "find", () => ({ sort: async () => [] }));
  assert.equal((await request("/api/products", "POST", { title: "Offline", price: 1 })).status, 201);
  assert.deepEqual((await (await request("/api/products")).json()).products, []);
});

test("public catalogue is cached and product changes invalidate it", async t => {
  installCache(t);
  let reads = 0;
  let title = "Original";
  t.mock.method(Product, "find", () => ({ select: projection => {
    assert.equal(projection, "title description price images.url");
    return { sort: () => ({ lean: async () => { reads++; return [{ title }]; } }) };
  } }));
  const list = async () => (await (await request("/api/store/products", "GET", undefined, null)).json()).products;
  assert.equal((await list())[0].title, "Original");
  await list();
  assert.equal(reads, 1);
  title = "Updated";
  await cache.invalidate(storefrontCacheScope);
  assert.equal((await list())[0].title, "Updated");
  assert.equal(reads, 2);
});
