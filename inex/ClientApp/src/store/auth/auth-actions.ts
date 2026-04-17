import i18n from "../../i18n";
import apiClient from "../../utils/apiClient";
import { AuthUser, clearAuth, setAuthError, setCredentials } from "./auth-slice";
import type { AppDispatch } from "../index";

function applyLanguage(user: AuthUser) {
    const lang = user.languageCode || localStorage.getItem("i18n_lang") || "en";
    if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
    }
    localStorage.setItem("i18n_lang", lang);
}

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
  currencyId: number;
  inviteToken: string;
  languageCode?: string | null;
}

/**
 * Called once on app startup (App.tsx).
 * Sends the httpOnly refresh token cookie to the backend and, if valid,
 * receives a new access token — restoring the session without a login prompt.
 * Sets isInitializing=false when done (success or failure).
 */
export const restoreSession = () => {
  return async (dispatch: AppDispatch) => {
    try {
      const { data } = await apiClient.post<TokenResponse>("/auth/refresh");

      // Fetch the current user profile with the new access token.
      // We pass it explicitly because Redux hasn't stored it yet.
      const { data: user } = await apiClient.get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });

      applyLanguage(user);
      dispatch(setCredentials({ accessToken: data.accessToken, expiresIn: data.expiresIn, user }));
    } catch {
      // No valid session — treat as logged-out (not an error)
      dispatch(clearAuth());
    }
  };
};

export const loginUser = (credentials: LoginRequest) => {
  return async (dispatch: AppDispatch) => {
    try {
      const { data } = await apiClient.post<TokenResponse>("/auth/login", credentials);
      const { data: user } = await apiClient.get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      applyLanguage(user);
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
  return async (dispatch: AppDispatch) => {
    try {
      const { data: tokenData } = await apiClient.post<TokenResponse>("/auth/register", data);
      const { data: user } = await apiClient.get<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${tokenData.accessToken}` },
      });
      applyLanguage(user);
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

export const updateProfile = (data: { username: string; currencyId: number; languageCode?: string | null }) => {
  return async (dispatch: AppDispatch) => {
    const { data: tokenData } = await apiClient.put<TokenResponse>("/auth/me", data);
    const { data: user } = await apiClient.get<AuthUser>("/auth/me", {
      headers: { Authorization: `Bearer ${tokenData.accessToken}` },
    });
    applyLanguage(user);
    dispatch(setCredentials({ accessToken: tokenData.accessToken, expiresIn: tokenData.expiresIn, user }));
  };
};

export const changePassword = (data: { currentPassword: string; newPassword: string }) => {
  return async () => {
    await apiClient.post("/auth/change-password", data);
  };
};

export const logoutUser = () => {
  return async (dispatch: AppDispatch) => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      // Always clear local state, even if the API call fails
      dispatch(clearAuth());
    }
  };
};
