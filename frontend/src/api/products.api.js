import { apiClient } from "./client.js";
import { PRODUCT_ENDPOINTS } from "../constants/endpoints.js";

export const productsApi = {
  list: (options) => apiClient.request(PRODUCT_ENDPOINTS.LIST, options),
  get: (id, options) =>
    apiClient.request(PRODUCT_ENDPOINTS.detail(id), options),
  create: (product) =>
    apiClient.request(PRODUCT_ENDPOINTS.LIST, {
      method: "POST",
      body: product,
    }),
  update: (id, product) =>
    apiClient.request(PRODUCT_ENDPOINTS.detail(id), {
      method: "PUT",
      body: product,
    }),
  remove: (id) =>
    apiClient.request(PRODUCT_ENDPOINTS.detail(id), { method: "DELETE" }),
};
