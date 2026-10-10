import { test } from "node:test";
import assert from "node:assert/strict";
import { optimizedImage } from "../src/utils/images.js";
test("Cloudinary thumbnails are resized and compressed without rewriting other hosts", () => {
  assert.equal(optimizedImage("https://res.cloudinary.com/shop/image/upload/v1/product.png", 112), "https://res.cloudinary.com/shop/image/upload/c_limit,w_112/f_auto/q_auto/v1/product.png");
  assert.equal(optimizedImage("https://example.com/image/upload/image.png"), "https://example.com/image/upload/image.png");
});
