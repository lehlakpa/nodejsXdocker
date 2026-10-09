import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHmac } from "node:crypto";
import app from "../src/app.js";
import Product from "../src/models/Product_model.js";
import Order from "../src/models/Order_model.js";
import { generateAccessToken } from "../src/utils/token.js";
import { esewaConfig, paymentForm, verifyPayment } from "../src/utils/esewa.js";

const user = { _id: "507f1f77bcf86cd799439011" };
const productId = "507f1f77bcf86cd799439012";
const orderId = "507f1f77bcf86cd799439013";
const sample = { _id: orderId, product: productId, buyer: user._id, title: "Book", amount: 125.5,
  paymentMethod: "esewa", paymentStatus: "pending", transactionUuid: "test-transaction", productCode: "EPAYTEST", esewaMode: "test" };
let server, base;
before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "test-payment-secret";
  process.env.ESEWA_MODE = "test";
  delete process.env.ESEWA_PRODUCT_CODE;
  delete process.env.ESEWA_SECRET_KEY;
  process.env.CLIENT_URL = "http://localhost:5173";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
const request = (path, body, auth = true) => fetch(base + path, { method: "POST",
  headers: { "Content-Type": "application/json", ...(auth ? { Cookie: `accessToken=${generateAccessToken(user)}` } : {}) },
  body: JSON.stringify(body ?? {}) });

test("payment form uses server amount, HMAC and configured callback origin", () => {
  const config = esewaConfig();
  assert.equal(config.statusUrl, "https://rc.esewa.com.np/api/epay/transaction/status/");
  const { fields, action } = paymentForm(sample, config);
  assert.match(action, /^https:\/\/rc-epay.esewa.com.np\//);
  assert.equal(fields.total_amount, "125.50");
  assert.equal(fields.signature, createHmac("sha256", config.secret).update("total_amount=125.50,transaction_uuid=test-transaction,product_code=EPAYTEST").digest("base64"));
  assert.equal(new URL(fields.success_url).searchParams.get("order"), orderId);
  assert.equal(new URL(fields.failure_url).searchParams.get("payment"), "cancelled");
  assert.equal(JSON.stringify(fields).includes(config.secret), false);
});

test("verification rejects mismatched transactions and only accepts COMPLETE", async () => {
  const valid = { status: "COMPLETE", transaction_uuid: sample.transactionUuid, product_code: "EPAYTEST", total_amount: "125.50", ref_id: "ref-1" };
  const response = data => async url => {
    assert.equal(new URL(url).searchParams.get("total_amount"), "125.50");
    return { ok: true, json: async () => data };
  };
  assert.equal(await verifyPayment(sample, response(valid)), "ref-1");
  for (const status of ["PENDING", "CANCELED", "NOT_FOUND", "FULL_REFUND"]) {
    assert.equal(await verifyPayment(sample, response({ ...valid, status })), null);
  }
  for (const change of [{ total_amount: 1 }, { transaction_uuid: "different" }, { product_code: "other" }, { ref_id: null }]) {
    await assert.rejects(verifyPayment(sample, response({ ...valid, ...change })));
  }
  assert.equal(await verifyPayment(sample, response({ status: "COMPLETE", pid: sample.transactionUuid, scd: "EPAYTEST", totalAmount: 125.5, refId: "legacy-ref" })), "legacy-ref");
  await assert.rejects(verifyPayment(sample, async () => ({ ok: false })));
  await assert.rejects(verifyPayment(sample, response({ code: 0, error_message: "Service is currently unavailable" })));
  await assert.rejects(verifyPayment(sample, response(null)));
});

test("checkout requires authentication and valid input", async () => {
  assert.equal((await request("/api/orders", {}, false)).status, 401);
  for (const body of [{}, { productId, paymentMethod: "card", requestKey: "request-123456789" }]) {
    assert.equal((await request("/api/orders", body)).status, 400);
  }
});

test("cash checkout uses stored price, buyer ownership and remains unpaid", async t => {
  t.mock.method(Order, "findOne", async () => null);
  t.mock.method(Product, "findOne", async filter => {
    assert.deepEqual(filter, { _id: productId, owner: user._id });
    return { _id: productId, title: "Book", price: 125.5 };
  });
  t.mock.method(Order, "create", async values => ({ ...values, _id: orderId, paymentStatus: "pending" }));
  const res = await request("/api/orders", { productId, paymentMethod: "cash", requestKey: "request-123456789", amount: 1, paymentStatus: "paid" });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.order.amount, 125.5);
  assert.equal(data.order.paymentStatus, "pending");
  assert.equal(data.payment, null);
});

test("repeated checkout reuses order and rejects conflicting payment method", async t => {
  t.mock.method(Order, "findOne", async () => sample);
  t.mock.method(Order, "create", () => { assert.fail("must not create another order"); });
  const body = { productId, paymentMethod: "esewa", requestKey: "request-123456789" };
  const res = await request("/api/orders", body);
  assert.equal(res.status, 201);
  assert.equal((await res.json()).order._id, orderId);
  assert.equal((await request("/api/orders", { ...body, paymentMethod: "cash" })).status, 409);
});

test("missing product and other user's order cannot be purchased or verified", async t => {
  t.mock.method(Order, "findOne", async filter => {
    assert.equal(filter.buyer, user._id);
    return null;
  });
  t.mock.method(Product, "findOne", async () => null);
  assert.equal((await request("/api/orders", { productId, paymentMethod: "cash", requestKey: "request-123456789" })).status, 404);
  assert.equal((await request(`/api/orders/${orderId}/verify`, { status: "COMPLETE" })).status, 404);
});

test("already paid order verification is idempotent", async t => {
  t.mock.method(Order, "findOne", async () => ({ ...sample, paymentStatus: "paid" }));
  t.mock.method(Order, "findOneAndUpdate", () => { assert.fail("paid order must not be updated"); });
  const res = await request(`/api/orders/${orderId}/verify`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).order.paymentStatus, "paid");
});

test("order duplicate errors never claim the username exists", async t => {
  t.mock.method(Order, "findOne", async () => null);
  t.mock.method(Product, "findOne", async () => ({ _id: productId, title: "Book", price: 125.5 }));
  t.mock.method(Order, "create", async () => {
    throw Object.assign(new Error("duplicate index"), { code: 11000, keyPattern: { requestId: 1 } });
  });
  const response = await request("/api/orders", { productId, paymentMethod: "cash", requestKey: "request-123456789" });
  assert.equal(response.status, 409);
  assert.doesNotMatch((await response.json()).message, /username/i);
});

test("order list is private, filtered and paginated", async t => {
  assert.equal((await fetch(base + "/api/orders")).status, 401);
  t.mock.method(Order, "find", filter => {
    assert.deepEqual(filter, { buyer: user._id, paymentMethod: "cash", paymentStatus: "paid" });
    return { sort: sorting => {
      assert.deepEqual(sorting, { createdAt: -1, _id: -1 });
      return { skip: offset => {
        assert.equal(offset, 20);
        return { limit: async limit => { assert.equal(limit, 21); return Array.from({ length: 21 }, () => sample); } };
      } };
    } };
  });
  const headers = { Cookie: `accessToken=${generateAccessToken(user)}` };
  const response = await fetch(base + "/api/orders?method=cash&status=paid&page=2", { headers });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.orders.length, 20);
  assert.equal(data.hasMore, true);
  assert.equal((await fetch(base + "/api/orders?page=-1", { headers })).status, 400);
  assert.equal((await fetch(base + "/api/orders?method=card", { headers })).status, 400);
});

test("history sync recovers completed payments without a browser callback and tolerates provider failures", async t => {
  const realFetch = globalThis.fetch;
  assert.equal((await request("/api/orders/sync", {}, false)).status, 401);
  t.mock.method(Order, "find", filter => {
    assert.deepEqual(filter, { buyer: user._id, paymentMethod: "esewa", paymentStatus: "pending" });
    return { sort: () => ({ limit: async limit => {
      assert.equal(limit, 20);
      return [sample, { ...sample, transactionUuid: "pending" }, { ...sample, transactionUuid: "unavailable" }];
    } }) };
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (String(url).startsWith(base)) return realFetch(url, options);
    const transaction = new URL(url).searchParams.get("transaction_uuid");
    if (transaction === "unavailable") throw new Error("Provider timeout");
    return { ok: true, json: async () => ({ status: transaction === "pending" ? "PENDING" : "COMPLETE",
      transaction_uuid: transaction, product_code: sample.productCode, total_amount: sample.amount, ref_id: "recovered-ref" }) };
  });
  let writes = 0;
  t.mock.method(Order, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.buyer, user._id);
    assert.equal(filter.paymentStatus, "pending");
    writes++;
    return { ...sample, ...update.$set };
  });
  const response = await request("/api/orders/sync");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { checked: 3, paid: 1, unavailable: 1 });
  assert.equal(writes, 1);
});

test("cash payment recording is scoped to buyer and cash method and timestamps receipt", async t => {
  t.mock.method(Order, "findOneAndUpdate", async (filter, update) => {
    assert.deepEqual(filter, { _id: orderId, buyer: user._id, paymentMethod: "cash", paymentStatus: "pending" });
    assert.equal(update.$set.paymentStatus, "paid");
    assert.ok(update.$set.paidAt instanceof Date);
    return { ...sample, paymentMethod: "cash", ...update.$set };
  });
  const response = await request(`/api/orders/${orderId}/cash-paid`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).order.paymentStatus, "paid");
});

test("cash recording is idempotent and cannot override an eSewa or another user's order", async t => {
  t.mock.method(Order, "findOneAndUpdate", async () => null);
  t.mock.method(Order, "findOne", async filter => {
    assert.equal(filter.buyer, user._id);
    assert.equal(filter.paymentMethod, "cash");
    return null;
  });
  assert.equal((await request(`/api/orders/${orderId}/cash-paid`)).status, 404);
  t.mock.method(Order, "findOne", async () => ({ ...sample, paymentMethod: "cash", paymentStatus: "paid", paidAt: "2026-01-01T00:00:00Z" }));
  const response = await request(`/api/orders/${orderId}/cash-paid`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).order.paidAt, "2026-01-01T00:00:00Z");
});

test("verification persists paid only after provider confirmation, never browser claims", async t => {
  const realFetch = globalThis.fetch;
  let providerStatus = "PENDING";
  let writes = 0;
  t.mock.method(Order, "findOne", async () => ({ ...sample }));
  t.mock.method(Order, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter.buyer, user._id);
    assert.equal(update.$set.paymentStatus, "paid");
    assert.equal(update.$set.reference, "verified-ref");
    assert.ok(update.$set.paidAt instanceof Date);
    writes++;
    return { ...sample, ...update.$set };
  });
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (String(url).startsWith(base)) return realFetch(url, options);
    return { ok: true, json: async () => ({ status: providerStatus, transaction_uuid: sample.transactionUuid,
      product_code: sample.productCode, total_amount: sample.amount, ref_id: "verified-ref" }) };
  });
  let response = await request(`/api/orders/${orderId}/verify`, { status: "COMPLETE", paymentStatus: "paid" });
  assert.equal((await response.json()).order.paymentStatus, "pending");
  assert.equal(writes, 0);
  providerStatus = "COMPLETE";
  response = await request(`/api/orders/${orderId}/verify`);
  assert.equal((await response.json()).order.paymentStatus, "paid");
  assert.equal(writes, 1);
});
