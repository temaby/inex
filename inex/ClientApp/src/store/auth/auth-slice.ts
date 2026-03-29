import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

interface AuthState {
  accessToken: string | null;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt: number | null;
  user: AuthUser | null;
  /**
   * True during the startup refreshToken() call.
   * ProtectedRoute shows a spinner until this is false,
   * preventing a flash-of-login-page on page reload.
   */
  isInitializing: boolean;
  error: string | null;
}

const initialState: AuthState = {
  accessToken: null,
  expiresAt: null,
  user: null,
  isInitializing: true,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Called after a successful login, register, or token refresh.
     * Stores the access token in memory (NOT localStorage) to prevent XSS theft.
     * The refresh token lives in an httpOnly cookie managed by the browser.
     */
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; expiresIn: number; user?: AuthUser }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.expiresAt = Date.now() + action.payload.expiresIn * 1000;
      if (action.payload.user) {
        state.user = action.payload.user;
      }
      state.isInitializing = false;
      state.error = null;
    },

    /** Clears all auth state — called on logout or when refresh fails */
    clearAuth(state) {
      state.accessToken = null;
      state.expiresAt = null;
      state.user = null;
      state.isInitializing = false;
      state.error = null;
    },

    setAuthError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isInitializing = false;
    },
  },
});

export const { setCredentials, clearAuth, setAuthError } = authSlice.actions;
export default authSlice;
