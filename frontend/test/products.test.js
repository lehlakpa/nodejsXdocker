import { test } from "node:test";
import assert from "node:assert/strict";
import { selectProducts, validateProduct } from "../src/utils/products.js";

test("search and sort do not mutate API data", () => {
  const products = [
    { title: "Pen", description: "Blue ink", price: 10 },
    { title: "Book", description: "Blue cover", price: 20 },
  ];
  assert.deepEqual(
    selectProducts(products, " BLUE ", "high").map((p) => p.title),
    ["Book", "Pen"],
  );
  assert.deepEqual(
    products.map((p) => p.title),
    ["Pen", "Book"],
  );
  assert.deepEqual(selectProducts(products, "missing"), []);
});

test("product validation accepts zero and rejects blank, negative and non-finite prices", () => {
  assert.deepEqual(
    validateProduct({ title: " Pen ", price: "0", description: " Blue " }),
    { title: "Pen", price: 0, description: "Blue" },
  );
  for (const price of ["", " ", "-1", "Infinity", "abc"])
    assert.throws(() => validateProduct({ title: "Pen", price }));
  assert.throws(() => validateProduct({ title: " ", price: 1 }));
});
