import { configureStore } from "@reduxjs/toolkit";

import accountsSlice from "./accounts/accounts-slice";
import categoriesSlice from "./categories/categories-slice";
import transactionsSlice from "./transactions/transactions-slice";
import ratesSlice from "./rates/rates-slice";
import reportSlice from "./report/report-slice";
import budgetsSlice from "./budgets/budgets-slice";
import budgetReportSlice from "./budgetReport/budgetReport-slice";

const store = configureStore({
  reducer: {
    accounts: accountsSlice.reducer,
    categories: categoriesSlice.reducer,
    transactions: transactionsSlice.reducer,
    rates: ratesSlice.reducer,
    report: reportSlice.reducer,
    budgets: budgetsSlice.reducer,
    budgetReport: budgetReportSlice.reducer,
  },
});

export default store;