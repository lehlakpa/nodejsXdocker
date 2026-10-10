import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import app from "../src/app.js";
import Order from "../src/models/Order_model.js";
import { generateAccessToken } from "../src/utils/token.js";

const user = { _id: "507f1f77bcf86cd799439011" };
const orderId = "507f1f77bcf86cd799439012";
let server, base;
before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "order-delete-test-secret";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/orders/`;
});
after(() => new Promise(resolve => server.close(resolve)));
const remove = (id = orderId, auth = true) => fetch(base + id, { method: "DELETE",
  headers: auth ? { Cookie: `accessToken=${generateAccessToken(user)}` } : {} });

test("order deletion requires authentication and a valid ID", async t => {
  t.mock.method(Order, "findOneAndDelete", () => { throw new Error("Must not touch the database"); });
  assert.equal((await remove(orderId, false)).status, 401);
  assert.equal((await remove("invalid")).status, 400);
});
test("order deletion is scoped to the signed-in owner", async t => {
  t.mock.method(Order, "findOneAndDelete", async filter => {
    assert.deepEqual(filter, { _id: orderId, buyer: user._id });
    return { _id: orderId };
  });
  const response = await remove();
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
});
test("missing, already deleted and other owners' orders return not found", async t => {
  t.mock.method(Order, "findOneAndDelete", async () => null);
  assert.equal((await remove()).status, 404);
});
