import { apiClient } from "./client.js";
import { AUTH_ENDPOINTS } from "../constants/endpoints.js";

export const authApi = {
  me: (options) => apiClient.request(AUTH_ENDPOINTS.ME, options),
  login: (credentials) =>
    apiClient.request(AUTH_ENDPOINTS.LOGIN, {
      method: "POST",
      body: credentials,
      refresh: false,
    }),
  register: (details) =>
    apiClient.request(AUTH_ENDPOINTS.REGISTER, {
      method: "POST",
      body: details,
      refresh: false,
    }),
  logout: () =>
    apiClient.request(AUTH_ENDPOINTS.LOGOUT, {
      method: "POST",
      refresh: false,
    }),
};
