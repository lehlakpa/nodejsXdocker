import { APP, LIMITS } from "../constants/app.js";

const numberFormatter = new Intl.NumberFormat(APP.locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const formatMoney = (value) =>
  `${APP.currency} ${numberFormatter.format(value)}`;

export function selectProducts(products, query = "", sort = "newest") {
  const search = query.trim().toLowerCase();
  const comparators = {
    name: (a, b) => a.title.localeCompare(b.title),
    low: (a, b) => a.price - b.price,
    high: (a, b) => b.price - a.price,
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  };
  return products
    .filter((p) =>
      `${p.title} ${p.description || ""}`.toLowerCase().includes(search),
    )
    .sort(comparators[sort] || comparators.newest);
}

export function validateProduct(values) {
  const title = String(values.title || "").trim();
  const price = Number(values.price);
  const description = String(values.description || "").trim();
  if (!title || title.length > LIMITS.TITLE)
    throw new Error(`Enter a product name up to ${LIMITS.TITLE} characters.`);
  if (
    String(values.price ?? "").trim() === "" ||
    !Number.isFinite(price) ||
    price < 0
  )
    throw new Error("Enter a price of NPR 0 or more, such as 250.00.");
  if (description.length > LIMITS.DESCRIPTION)
    throw new Error(
      `Shorten the description to ${LIMITS.DESCRIPTION} characters or fewer.`,
    );
  return { title, price, description };
}
