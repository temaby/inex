import apiClient from "../../utils/apiClient";
import { AuthUser, clearAuth, setAuthError, setCredentials } from "./auth-slice";

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/**
 * Called once on app startup (App.tsx).
 * Sends the httpOnly refresh token cookie to the backend and, if valid,
 * receives a new access token — restoring the session without a login prompt.
 * Sets isInitializing=false when done (success or failure).
 */
export const restoreSession = () => {
  return async (dispatch: any) => {
    try {
      const { data } = await apiClient.post<TokenResponse>("/auth/refresh");

      // Fetch the current user profile with the new access token.
      // We pass it explicitly because Redux hasn't stored it yet.
      const { data: user } = await apiClient.get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });

      dispatch(setCredentials({ accessToken: data.accessToken, expiresIn: data.expiresIn, user }));
    } catch {
      // No valid session — treat as logged-out (not an error)
      dispatch(clearAuth());
    }
  };
};

export const loginUser = (credentials: LoginRequest) => {
  return async (dispatch: any) => {
    try {
      const { data } = await apiClient.post<TokenResponse>("/auth/login", credentials);
      const { data: user } = await apiClient.get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      dispatch(setCredentials({ accessToken: data.accessToken, expiresIn: data.expiresIn, user }));
    } catch (error: any) {
      dispatch(
        setAuthError(error.response?.data?.detail ?? error.message ?? "Login failed")
      );
      throw error; // let the form handle UI state
    }
  };
};

export const registerUser = (data: RegisterRequest) => {
  return async (dispatch: any) => {
    try {
      const { data: tokenData } = await apiClient.post<TokenResponse>("/auth/register", data);
      const { data: user } = await apiClient.get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${tokenData.accessToken}` },
      });
      dispatch(
        setCredentials({ accessToken: tokenData.accessToken, expiresIn: tokenData.expiresIn, user })
      );
    } catch (error: any) {
      dispatch(
        setAuthError(error.response?.data?.detail ?? error.message ?? "Registration failed")
      );
      throw error;
    }
  };
};

export const logoutUser = () => {
  return async (dispatch: any) => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      // Always clear local state, even if the API call fails
      dispatch(clearAuth());
    }
  };
};
