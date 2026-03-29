import { Spin } from "antd";
import * as React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

/**
 * React Router v6 route guard.
 *
 * v6 pattern: wrap private routes with <Route element={<ProtectedRoute />}>.
 * When the user IS authenticated, <Outlet /> renders the matched child route.
 * When NOT authenticated, <Navigate> redirects to /login.
 *
 * The `replace` prop replaces the history entry so the user can't hit Back
 * to return to a protected page after being redirected to login.
 *
 * isInitializing covers the startup window while restoreSession() is in-flight.
 * Without this, there would be a flash-of-login-page on every page reload
 * even for users with a valid session.
 */
const ProtectedRoute = () => {
  const isInitializing = useAppSelector((s) => s.auth.isInitializing);
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  if (isInitializing) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
