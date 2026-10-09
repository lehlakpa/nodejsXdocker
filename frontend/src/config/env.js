import { REQUEST_TIMEOUT_MS } from "../constants/app.js";

// VITE_* values are public build-time configuration, never secrets.
export function createConfig(values = {}) {
  const apiBaseUrl = (values.VITE_API_BASE_URL || "/api")
    .trim()
    .replace(/\/+$/, "");
  if (!/^\/(?!\/)/.test(apiBaseUrl) && !/^https?:\/\//.test(apiBaseUrl)) {
    throw new Error(
      "VITE_API_BASE_URL must be a relative path or an HTTP(S) URL.",
    );
  }
  const timeoutMs = Number(values.VITE_API_TIMEOUT_MS || REQUEST_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0)
    throw new Error("VITE_API_TIMEOUT_MS must be a positive integer.");
  return Object.freeze({ apiBaseUrl, timeoutMs });
}

export const config = createConfig(import.meta.env);
