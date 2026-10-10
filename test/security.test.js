import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/User_model.js";
import { validateSecurityConfig } from "../src/config/security.js";

let server, base;
before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "security-test-key";
  process.env.CLIENT_URL = "http://localhost:5173";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => new Promise(resolve => server.close(resolve)));
test("cross-origin writes are rejected before authentication or database access", async () => {
  const response = await fetch(base + "/products", { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(response.status, 403);
  assert.equal((await fetch(base + "/health")).status, 200);
});
test("production cookie writes require a trusted origin", async () => {
  process.env.NODE_ENV = "production";
  try {
    const response = await fetch(base + "/auth/logout", { method: "POST", headers: { Cookie: "accessToken=test" } });
    assert.equal(response.status, 403);
  } finally { delete process.env.NODE_ENV; }
});
test("admin self-registration is closed by default", async () => {
  delete process.env.ALLOW_REGISTRATION;
  const response = await fetch(base + "/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Uninvited", username: "uninvited", password: "long-enough-password" }) });
  assert.equal(response.status, 403);
});
test("JWT verification rejects unexpected signing algorithms", async () => {
  const token = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, process.env.ACCESS_TOKEN_SECRET, { algorithm: "HS384" });
  const response = await fetch(base + "/products", { headers: { Cookie: `accessToken=${token}` } });
  assert.equal(response.status, 401);
});
test("API responses disable caching and framework disclosure", async () => {
  const response = await fetch(base + "/health");
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});
test("unsafe production configuration is rejected before startup", () => {
  const config = { NODE_ENV: "production", ACCESS_TOKEN_SECRET: "a".repeat(64), REFRESH_TOKEN_SECRET: "b".repeat(64), CLIENT_URL: "https://shop.example", ESEWA_MODE: "production", ESEWA_PRODUCT_CODE: "MERCHANT", ESEWA_SECRET_KEY: "merchant-secret" };
  assert.doesNotThrow(() => validateSecurityConfig(config));
  for (const change of [{ CLIENT_URL: "http://shop.example" }, { ACCESS_TOKEN_SECRET: "short" }, { REFRESH_TOKEN_SECRET: config.ACCESS_TOKEN_SECRET }, { ALLOW_REGISTRATION: "true" }, { ESEWA_MODE: "test" }]) {
    assert.throws(() => validateSecurityConfig({ ...config, ...change }));
  }
});
test("login brute force is limited with a JSON response", async t => {
  t.mock.method(User, "findOne", async () => null);
  let response;
  for (let i = 0; i < 31; i++) response = await fetch(base + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "no-user", password: "wrong-password" }) });
  assert.equal(response.status, 429);
  assert.match((await response.json()).message, /Too many/);
});
