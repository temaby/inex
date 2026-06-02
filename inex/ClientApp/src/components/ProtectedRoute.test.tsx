import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import authSlice from "../store/auth/auth-slice";

const makeStore = (
  isInitializing: boolean,
  accessToken: string | null,
) =>
  configureStore({
    reducer: { auth: authSlice.reducer },
    preloadedState: {
      auth: {
        accessToken,
        expiresAt: accessToken ? Date.now() + 3_600_000 : null,
        user: null,
        isInitializing,
        error: null,
      },
    },
  });

describe("ProtectedRoute", () => {
  it("renders child route when the user is authenticated", () => {
    const store = makeStore(false, "mock-access-token");

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to /login", () => {
    const store = makeStore(false, null);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Content</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("shows neither protected content nor login while auth is initializing", () => {
    const store = makeStore(true, null);

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route index element={<div>Protected Content</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});
