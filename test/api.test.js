import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User_model.js";
import Product from "../src/models/Product_model.js";
import { generateAccessToken, generateRefreshToken, digestRefreshToken } from "../src/utils/token.js";

let server, base;
const user = { _id: "507f1f77bcf86cd799439011", username: "tester" };
before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
const request = (path, body, authenticated = false, method = "POST") => fetch(base + path, {
  method,
  headers: {
    "Content-Type": "application/json",
    ...(authenticated ? { Cookie: `accessToken=${generateAccessToken(user)}` } : {})
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
});

test("backend serves health response, protects products and does not serve frontend", async () => {
  assert.equal((await fetch(base)).status, 404);
  assert.deepEqual(await (await fetch(base + "/api/health")).json(), {
    success: true,
    message: "API running"
  });
  assert.equal((await fetch(base + "/api/products")).status, 401);
});

test("missing and malformed auth fields return 400", async () => {
  for (const route of ["register", "login"]) {
    for (const body of [undefined, {}, { fullName: "Test", username: {}, password: "secret" }, { fullName: " ", username: " ", password: "secret" }]) {
      assert.equal((await request(`/api/auth/${route}`, body)).status, 400);
    }
  }
});

test("invalid product input returns 400", async () => {
  for (const body of [undefined, {}, { title: " ", price: 1 }, { title: "Test", price: -1 }, { title: "Test", price: null }]) {
    assert.equal((await request("/api/products", body, true)).status, 400);
  }
});

test("product updates cannot transfer ownership or inject update operators", async (t) => {
  let captured;
  t.mock.method(Product, "findOneAndUpdate", async (filter, update) => {
    captured = { filter, update };
    return { title: update.$set.title, owner: filter.owner };
  });
  const response = await request(`/api/products/${user._id}`, {
    title: "Changed", owner: "507f191e810c19729de860ea", $unset: { owner: 1 }
  }, true, "PUT");
  assert.equal(response.status, 200);
  assert.equal(captured.filter.owner, user._id);
  assert.deepEqual(captured.update, { $set: { title: "Changed" } });
});

test("database input errors return appropriate client statuses", async (t) => {
  t.mock.method(Product, "findOne", async () => { throw new mongoose.Error.CastError("ObjectId", "invalid", "_id"); });
  assert.equal((await request("/api/products/invalid", undefined, true, "GET")).status, 400);
  t.mock.method(User, "findOne", async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); });
  assert.equal((await request("/api/auth/register", { fullName: "Test", username: "test", password: "secret" })).status, 409);
});

test("refresh rotates tokens and rejects the previous token", async (t) => {
  const oldToken = generateRefreshToken(user);
  const storedUser = { ...user, refreshTokenHash: await bcrypt.hash(digestRefreshToken(oldToken), 4), save: async () => {} };
  t.mock.method(User, "findById", async () => storedUser);
  const refresh = (token) => fetch(base + "/api/auth/refresh", { method: "POST", headers: { Cookie: `refreshToken=${token}` } });
  const response = await refresh(oldToken);
  assert.equal(response.status, 200);
  const cookie = response.headers.getSetCookie().find(value => value.startsWith("refreshToken="));
  const newToken = cookie.split(";")[0].slice("refreshToken=".length);
  assert.notEqual(newToken, oldToken);
  assert.equal((await refresh(oldToken)).status, 401);
  assert.equal((await refresh(newToken)).status, 200);
});
