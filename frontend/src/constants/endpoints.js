export const AUTH_ENDPOINTS = Object.freeze({
  ME: "/auth/me",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
});
export const PRODUCT_ENDPOINTS = Object.freeze({
  LIST: "/products",
  detail: (id) => `/products/${encodeURIComponent(id)}`,
});
