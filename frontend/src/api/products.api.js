import { apiClient } from "./client.js";
import { PRODUCT_ENDPOINTS } from "../constants/endpoints.js";

function productBody(product) {
  const body = new FormData();
  for (const key of ["title", "price", "description"]) body.append(key, product[key]);
  if (product.retainedImages) body.append("retainedImages", JSON.stringify(product.retainedImages));
  for (const file of product.images || []) body.append("images", file);
  return body;
}

export const productsApi = {
  list: (options) => apiClient.request(PRODUCT_ENDPOINTS.LIST, options),
  get: (id, options) =>
    apiClient.request(PRODUCT_ENDPOINTS.detail(id), options),
  create: (product) =>
    apiClient.request(PRODUCT_ENDPOINTS.LIST, {
      method: "POST",
      body: productBody(product),
      timeout: 210000,
    }),
  update: (id, product) =>
    apiClient.request(PRODUCT_ENDPOINTS.detail(id), {
      method: "PUT",
      body: productBody(product),
      timeout: 210000,
    }),
  remove: (id) =>
    apiClient.request(PRODUCT_ENDPOINTS.detail(id), { method: "DELETE" }),
};
