import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { Writable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import app from "../src/app.js";
import Product from "../src/models/Product_model.js";
import { generateAccessToken } from "../src/utils/token.js";
import { retainedImages, uploadImages } from "../src/utils/productImages.js";
let server, base;
const user = { _id: "507f1f77bcf86cd799439011" };
before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "upload-test-secret";
  process.env.CLOUDINARY_CLOUD_NAME = "test";
  process.env.CLOUDINARY_API_KEY = "test";
  process.env.CLOUDINARY_API_SECRET = "test";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api/products`;
});
after(() => new Promise(resolve => server.close(resolve)));
function form(count = 1, type = "image/png", size = 20) {
  const data = new FormData();
  data.append("title", "Image test"); data.append("price", "125.50"); data.append("description", "Product views");
  for (let i = 0; i < count; i++) data.append("images", new Blob([Buffer.alloc(size)], { type }), `image-${i}.png`);
  return data;
}
const request = (data, method = "POST", path = "", auth = true) => fetch(base + path, { method, body: data,
  headers: auth ? { Cookie: `accessToken=${generateAccessToken(user)}` } : {} });
function mockUploads(t) {
  let count = 0;
  t.mock.method(cloudinary.uploader, "upload_stream", (options, callback) => new Writable({ write(chunk, encoding, next) { next(); }, final(next) {
    count++;
    callback(null, { secure_url: `https://res.cloudinary.com/test/image-${count}.png`, public_id: `test/image-${count}` }); next();
  } }));
}
test("multipart product upload saves three images and parses numeric price", async t => {
  mockUploads(t);
  t.mock.method(Product, "create", async data => {
    assert.equal(data.price, 125.5); assert.equal(data.images.length, 3); assert.equal(data.owner, user._id);
    return data;
  });
  const response = await request(form(3));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).product.images.length, 3);
});
test("uploads reject unauthenticated requests, unsupported formats, oversized files and excess images", async () => {
  assert.equal((await request(form(), "POST", "", false)).status, 401);
  assert.equal((await request(form(1, "text/plain"))).status, 400);
  assert.equal((await request(form(1, "image/png", 5 * 1024 * 1024 + 1))).status, 400);
  assert.equal((await request(form(4))).status, 400);
});
test("failed database write cleans up uploaded images", async t => {
  mockUploads(t);
  const removed = [];
  t.mock.method(cloudinary.uploader, "destroy", async id => { removed.push(id); });
  t.mock.method(Product, "create", async () => { throw new Error("Database unavailable"); });
  assert.equal((await request(form(2))).status, 500);
  assert.deepEqual(removed, ["test/image-1", "test/image-2"]);
});
test("image edits are owner scoped and cannot retain another product's assets", async t => {
  t.mock.method(Product, "findOne", async filter => {
    assert.equal(filter.owner, user._id);
    return { __v: 1, images: [{ publicId: "mine", url: "https://example.com/mine.png" }] };
  });
  const data = form(0); data.append("retainedImages", JSON.stringify(["someone-elses-image"]));
  assert.equal((await request(data, "PUT", `/${user._id}`)).status, 400);
  assert.throws(() => retainedImages('["mine","mine"]', [{ publicId: "mine" }]), /Invalid/);
});
test("image replacement removes old Cloudinary image only after saving", async t => {
  mockUploads(t);
  let saved = false;
  t.mock.method(Product, "findOne", async () => ({ __v: 2, images: [{ publicId: "old", url: "https://example.com/old.png" }] }));
  t.mock.method(Product, "findOneAndUpdate", async (filter, update) => { assert.equal(filter.__v, 2); saved = true; return update.$set; });
  t.mock.method(cloudinary.uploader, "destroy", async id => { assert.equal(saved, true); assert.equal(id, "old"); });
  const data = form(); data.append("retainedImages", "[]");
  assert.equal((await request(data, "PUT", `/${user._id}`)).status, 200);
});
test("partial Cloudinary failure rolls back successfully uploaded assets", async t => {
  let count = 0;
  t.mock.method(cloudinary.uploader, "upload_stream", (options, callback) => new Writable({ write(chunk, encoding, next) { next(); }, final(next) {
    count++;
    if (count === 1) callback(null, { secure_url: "https://example.com/one.png", public_id: "one" });
    else callback(new Error("Upload unavailable"));
    next();
  } }));
  const removed = [];
  t.mock.method(cloudinary.uploader, "destroy", async id => { removed.push(id); });
  await assert.rejects(uploadImages([{ buffer: Buffer.from("one") }, { buffer: Buffer.from("two") }]), /could not be uploaded/);
  assert.deepEqual(removed, ["one"]);
});
