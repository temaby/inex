import * as React from 'react';
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ConfigProvider, Spin } from "antd";
import enUS from "antd/locale/en_US";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";

import { useAppDispatch, useAppSelector } from './store/hooks';
import { inexTheme } from "./styles/antd-theme";

import { restoreSession } from './store/auth/auth-actions';
import { fetchRatesForDate } from './store/rates/rates-action';

import "antd/dist/reset.css";
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { SignageProvider } from "./components/primitives";
import AuthShell from "./components/AuthShell";

const Transactions = React.lazy(() => import('./pages/Transactions'));
const Accounts = React.lazy(() => import('./pages/Accounts'));
const Categories = React.lazy(() => import('./pages/Categories'));
const Budgets = React.lazy(() => import('./pages/Budgets'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Reports = React.lazy(() => import('./pages/Reports'));
const ReportCategory = React.lazy(() => import("./pages/Reports/ReportCategory"));
const ReportBudgetSpending = React.lazy(() => import("./pages/Reports/ReportBudgetSpending"));
const ReportMonthlyHistory = React.lazy(() => import("./pages/Reports/ReportMonthlyHistory"));
const ReportSpendingHeatmap = React.lazy(() => import("./pages/Reports/ReportSpendingHeatmap"));
const ReportList = React.lazy(() => import("./pages/Reports/ReportList"));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Profile = React.lazy(() => import('./pages/Profile'));

const PageFallback = () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Spin size="large" />
    </div>
);

const App = () => {
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector(s => s.auth.accessToken);
    const { i18n } = useTranslation();
    const location = useLocation();
    const antdLocale = i18n.language === "ru" ? ruRU : enUS;

    useEffect(() => {
        dayjs.locale(i18n.language);
    }, [i18n.language]);

    const date: Date = useMemo(() => new Date(), []);

    /**
     * On every page load, attempt to restore the session from the httpOnly
     * refresh token cookie. restoreSession() dispatches setCredentials on
     * success or clearAuth on failure — either way isInitializing becomes false
     * and ProtectedRoute renders either the app or a redirect to /login.
     */
    useEffect(() => {
        dispatch(restoreSession());
    }, []);

    /**
     * Load initial data only after the session is confirmed.
     * `accessToken` changes from null → string when restoreSession() succeeds,
     * which triggers these effects. If the user logs out and back in within
     * the same tab, the data is re-fetched automatically.
     */
    useEffect(() => {
        if (!accessToken || location.pathname === "/transactions") return;
        dispatch(fetchRatesForDate(date));
    }, [accessToken, date, dispatch, location.pathname]);

    return (
        <SignageProvider>
            <ConfigProvider locale={antdLocale} theme={inexTheme}>
                <React.Suspense fallback={<PageFallback />}>
                    <Routes>
            {/* Public routes — accessible without authentication */}
            <Route element={<AuthShell />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Route>

            {/* Private routes — ProtectedRoute renders <Outlet /> or redirects to /login */}
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate replace to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reports" element={<Reports />}>
                    <Route index element={<ReportList />} />
                    <Route path="category" element={<ReportCategory />} />
                    <Route path="budget" element={<ReportBudgetSpending />} />
                    <Route path="history" element={<ReportMonthlyHistory />} />
                    <Route path="heatmap" element={<ReportSpendingHeatmap />} />
                </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
                    </Routes>
                </React.Suspense>
            </ConfigProvider>
        </SignageProvider>
    );
}

export default App;
