import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash } from "node:crypto";
import app from "../src/app.js";
import Product from "../src/models/Product_model.js";
import Order from "../src/models/Order_model.js";

let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/store`;
});
after(() => new Promise(resolve => server.close(resolve)));
const body = { productId: "507f1f77bcf86cd799439012", paymentMethod: "cash",
  requestKey: "b287430e-6332-4af9-b399-656386911125", quantity: 2,
  customer: { name: "Test Customer", phone: "9800000000", address: "Kathmandu, Nepal" } };
const post = (path, data) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

test("guest checkout validates required details without login", async () => {
  for (const change of [{ customer: {} }, { quantity: 0 }, { quantity: 1.5 }, { customer: { ...body.customer, phone: "bad" } }]) {
    assert.equal((await post("/orders", { ...body, ...change })).status, 400);
  }
});
test("guest checkout calculates total on server and assigns order to product owner", async t => {
  t.mock.method(Order, "findOne", async () => null);
  t.mock.method(Product, "findById", async () => ({ _id: body.productId, owner: "507f1f77bcf86cd799439011", title: "Book", price: 125.50 }));
  t.mock.method(Order, "create", async data => {
    assert.equal(data.amount, 251);
    assert.equal(data.buyer, "507f1f77bcf86cd799439011");
    assert.equal(data.customer.name, body.customer.name);
    return { ...data, _id: "507f1f77bcf86cd799439013", paymentStatus: "pending" };
  });
  const response = await post("/orders", { ...body, amount: 1 });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.order.amount, 251);
  assert.equal(result.order.guestTokenHash, undefined);
  assert.equal(result.order.customer, undefined);
  assert.equal(result.payment, null);
});
test("guest checkout retry returns existing order and rejects changed details", async t => {
  t.mock.method(Order, "findOne", async () => ({ ...body, product: body.productId, customer: body.customer, _id: "507f1f77bcf86cd799439013" }));
  t.mock.method(Order, "create", () => { throw new Error("Must not create twice"); });
  assert.equal((await post("/orders", body)).status, 201);
  assert.equal((await post("/orders", { ...body, quantity: 3 })).status, 409);
});
test("guest verification requires private token, never just order ID", async t => {
  assert.equal((await post("/orders/507f1f77bcf86cd799439013/verify", {})).status, 404);
  t.mock.method(Order, "findOne", async filter => {
    assert.equal(filter.guestTokenHash, createHash("sha256").update(body.requestKey).digest("hex"));
    return null;
  });
  assert.equal((await post("/orders/507f1f77bcf86cd799439013/verify", { token: body.requestKey })).status, 404);
});
