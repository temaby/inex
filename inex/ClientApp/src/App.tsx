import * as React from 'react';
import { useEffect, useMemo } from "react";

import { useDispatch } from "react-redux";

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

const App = () => {
    const dispatch = useDispatch();

    const date: Date = useMemo(() => new Date(), []);

    useEffect(() => {
      dispatch(fetchAccounts("ALL"));
    }, []);

    useEffect(() => {
      dispatch(fetchCategories("ALL"));
    }, []);    

    useEffect(() => {
      dispatch(fetchBudgets());
    }, []);

    useEffect(() => {    
      dispatch(fetchRatesForDate(date));
    }, [date]);

    return (
      <Routes>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
}

export default App;
