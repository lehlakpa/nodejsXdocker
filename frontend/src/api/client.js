import { config } from "../config/env.js";
import { AUTH_ENDPOINTS } from "../constants/endpoints.js";

export class ApiError extends Error {
  constructor(message, status = 0, code = "REQUEST_FAILED") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// A single client owns cookies, cancellation, timeouts and refresh rotation.
// Only retry after a 401; network failures must not replay product writes.
export function createApiClient({
  baseUrl = config.apiBaseUrl,
  timeoutMs = config.timeoutMs,
  fetchImpl = (...args) => fetch(...args),
} = {}) {
  let refreshPromise;
  async function request(
    path,
    { method = "GET", body, signal, refresh = true } = {},
  ) {
    signal?.throwIfAborted();
    const requestSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    let response;
    let data;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        credentials: "include",
        signal: requestSignal,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (response.status === 204) return null;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new ApiError(
          response.status === 404
            ? "This feature is unavailable on the running server. Please restart the backend with the latest code."
            : "The server returned an invalid response. Please try again.",
          response.status,
          "INVALID_RESPONSE",
        );
      }
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        requestSignal.aborted
          ? "The request timed out. Please try again."
          : "Unable to reach the server. Please try again.",
        0,
        requestSignal.aborted ? "TIMEOUT" : "NETWORK_ERROR",
      );
    }
    if (response.status === 401 && refresh) {
      refreshPromise ??= request(AUTH_ENDPOINTS.REFRESH, {
        method: "POST",
        refresh: false,
      }).finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      signal?.throwIfAborted();
      return request(path, { method, body, signal, refresh: false });
    }
    if (!response.ok)
      throw new ApiError(
        data?.message || "Something went wrong. Please try again.",
        response.status,
        data?.code,
      );
    return data;
  }
  return { request };
}

export const apiClient = createApiClient();
