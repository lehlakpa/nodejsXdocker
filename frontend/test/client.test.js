import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/api/client.js";
import { createConfig } from "../src/config/env.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });

test("client uses configured API origin, cookies, JSON payloads and cancellation signal", async () => {
  let captured;
  const client = createApiClient({
    baseUrl: "https://api.example.test/api",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return json({ product: { title: "Book" } });
    },
  });
  await client.request("/products", {
    method: "POST",
    body: { title: "Book", price: 0 },
  });
  assert.equal(captured.url, "https://api.example.test/api/products");
  assert.equal(captured.options.credentials, "include");
  assert.equal(captured.options.method, "POST");
  assert.deepEqual(JSON.parse(captured.options.body), {
    title: "Book",
    price: 0,
  });
  assert.ok(captured.options.signal instanceof AbortSignal);
});

test("concurrent expired requests share one token refresh and retry once", async () => {
  let refreshes = 0;
  let resolveRefresh;
  const calls = new Map();
  const client = createApiClient({
    fetchImpl: async (url) => {
      if (url.endsWith("/auth/refresh")) {
        refreshes++;
        return new Promise((resolve) => {
          resolveRefresh = () => resolve(json({ success: true }));
        });
      }
      const count = (calls.get(url) || 0) + 1;
      calls.set(url, count);
      return count === 1
        ? json({ message: "expired" }, 401)
        : json({ success: true });
    },
  });
  const first = client.request("/products");
  const second = client.request("/auth/me");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(refreshes, 1);
  resolveRefresh();
  assert.deepEqual(await Promise.all([first, second]), [
    { success: true },
    { success: true },
  ]);
  assert.deepEqual([...calls.values()], [2, 2]);
});

test("invalid login never refreshes and failed refresh never loops", async () => {
  const urls = [];
  const client = createApiClient({
    fetchImpl: async (url) => {
      urls.push(url);
      return json({ message: "Unauthorized" }, 401);
    },
  });
  await assert.rejects(
    client.request("/auth/login", { method: "POST", refresh: false }),
    { status: 401 },
  );
  assert.deepEqual(urls, ["/api/auth/login"]);
  urls.length = 0;
  await assert.rejects(client.request("/products"), { status: 401 });
  assert.deepEqual(urls, ["/api/products", "/api/auth/refresh"]);
});

test("a failed retry stops even if refresh succeeded", async () => {
  let calls = 0;
  const client = createApiClient({
    fetchImpl: async (url) => {
      calls++;
      return url.endsWith("/refresh") ? json({ success: true }) : json({}, 401);
    },
  });
  await assert.rejects(client.request("/products"), { status: 401 });
  assert.equal(calls, 3);
});

test("network failure does not replay writes; malformed response is explicit", async () => {
  let calls = 0;
  const offline = createApiClient({
    fetchImpl: async () => {
      calls++;
      throw new TypeError("fetch failed");
    },
  });
  await assert.rejects(
    offline.request("/products", { method: "POST", body: {} }),
    { code: "NETWORK_ERROR" },
  );
  assert.equal(calls, 1);
  const malformed = createApiClient({
    fetchImpl: async () =>
      new Response("<html>proxy error</html>", { status: 502 }),
  });
  await assert.rejects(malformed.request("/products"), {
    code: "INVALID_RESPONSE",
    status: 502,
  });
});

test("aborted requests are cancelled without refresh or network work", async () => {
  let calls = 0;
  const client = createApiClient({
    fetchImpl: async () => {
      calls++;
      return json({});
    },
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    client.request("/products", { signal: controller.signal }),
    { name: "AbortError" },
  );
  assert.equal(calls, 0);
});

test("API configuration validates URLs and timeouts", () => {
  assert.deepEqual(
    createConfig({
      VITE_API_BASE_URL: "https://api.example.test/api/",
      VITE_API_TIMEOUT_MS: "2500",
    }),
    { apiBaseUrl: "https://api.example.test/api", timeoutMs: 2500 },
  );
  assert.throws(() => createConfig({ VITE_API_BASE_URL: "//example.test" }));
  assert.throws(() => createConfig({ VITE_API_TIMEOUT_MS: "invalid" }));
});
