export const APP = Object.freeze({
  name: "Stockroom",
  currency: "NPR",
  locale: "en-NP",
});
export const REQUEST_TIMEOUT_MS = 15000;
export const TOAST_DURATION_MS = 4000;
export const MODAL = Object.freeze({
  AUTH: "auth",
  PRODUCT: "product",
  DELETE: "delete",
  ACCOUNT: "account",
});
export const LIMITS = Object.freeze({
  NAME: 100,
  USERNAME: 100,
  PASSWORD_MIN: 6,
  TITLE: 200,
  DESCRIPTION: 3000,
});
export const SORT_OPTIONS = Object.freeze([
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name: A–Z" },
  { value: "low", label: "Price: low to high" },
  { value: "high", label: "Price: high to low" },
]);
