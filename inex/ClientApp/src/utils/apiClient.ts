import axios from "axios";
import store from "../store";
import { clearAuth, setCredentials } from "../store/auth/auth-slice";

/**
 * Central axios instance for all API calls.
 * baseURL="/api" means every request path is relative to /api,
 * e.g. apiClient.get("/accounts") → GET /api/accounts.
 * The dev proxy in setupProxy.js forwards /api/* to localhost:5000.
 */
const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor ────────────────────────────────────────────────────
// Attaches the current access token to every outgoing request.
// Runs transparently — callers never manually set Authorization headers.
apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ───────────────────────────────────────────────────
// Handles token expiry: on 401, tries to get a new access token via the
// httpOnly refresh token cookie, then retries the original request once.
//
// Singleton promise pattern: if 3 concurrent requests all get 401 at the same
// time, only ONE refresh call is made. All three await the same promise and
// retry with the new token once it resolves.
let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const is401 = error.response?.status === 401;
    const notAlreadyRetried = !originalRequest._retry;
    // Avoid infinite loops: if the refresh endpoint itself returns 401, bail out
    const notAuthEndpoint = !originalRequest.url?.startsWith("/auth/");

    if (is401 && notAlreadyRetried && notAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          // Use a plain axios call (not apiClient) to avoid triggering this interceptor again
          refreshPromise = axios
            .post<{ accessToken: string; expiresIn: number }>("/api/auth/refresh")
            .then((res) => {
              store.dispatch(
                setCredentials({
                  accessToken: res.data.accessToken,
                  expiresIn: res.data.expiresIn,
                })
              );
              return res.data.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed → session is dead, redirect to login
        store.dispatch(clearAuth());
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
