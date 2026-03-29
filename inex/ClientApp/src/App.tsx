import * as React from 'react';
import { useEffect, useMemo } from "react";

import { useAppDispatch, useAppSelector } from './store/hooks';

import { restoreSession } from './store/auth/auth-actions';
import { fetchAccounts } from './store/accounts/accounts-actions';
import { fetchCategories } from './store/categories/categories-actions';
import { fetchBudgets } from './store/budgets/budgets-actions';
import { fetchRatesForDate } from './store/rates/rates-action';

import "antd/dist/antd.css";
import Transactions from './pages/Transactions';
import { Navigate, Route, Routes } from 'react-router-dom';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Reports from './pages/Reports';
import ReportCategory from "./pages/Reports/ReportCategory";
import ReportBudgetSpending from "./pages/Reports/ReportBudgetSpending";
import ReportMonthlyHistory from "./pages/Reports/ReportMonthlyHistory";
import ReportList from "./pages/Reports/ReportList";
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector(s => s.auth.accessToken);

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
        if (!accessToken) return;
        dispatch(fetchAccounts("ALL"));
    }, [accessToken]);

    useEffect(() => {
        if (!accessToken) return;
        dispatch(fetchCategories("ALL"));
    }, [accessToken]);

    useEffect(() => {
        if (!accessToken) return;
        dispatch(fetchBudgets());
    }, [accessToken]);

    useEffect(() => {
        if (!accessToken) return;
        dispatch(fetchRatesForDate(date));
    }, [accessToken]);

    return (
        <Routes>
            {/* Public routes — accessible without authentication (pages added in PR-5) */}
            <Route path="/login" element={<div>Login page — coming in PR-5</div>} />
            <Route path="/register" element={<div>Register page — coming in PR-5</div>} />

            {/* Private routes — ProtectedRoute renders <Outlet /> or redirects to /login */}
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate replace to="/transactions" />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/reports" element={<Reports />}>
                    <Route index element={<ReportList />} />
                    <Route path="category" element={<ReportCategory />} />
                    <Route path="budget" element={<ReportBudgetSpending />} />
                    <Route path="history" element={<ReportMonthlyHistory />} />
                </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

export default App;
