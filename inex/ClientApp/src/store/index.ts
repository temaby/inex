import { configureStore } from "@reduxjs/toolkit";

import transactionsSlice from "./transactions/transactions-slice";
import ratesSlice from "./rates/rates-slice";
import reportSlice from "./report/report-slice";
import budgetsSlice from "./budgets/budgets-slice";
import budgetReportSlice from "./budgetReport/budgetReport-slice";
import authSlice from "./auth/auth-slice";
import { transactionsApi } from "./transactions/transactions-api";
import { accountsApi } from "./accounts/accounts-api";
import { categoriesApi } from "./categories/categories-api";
import { budgetsApi } from "./budgets/budgets-api";
import { budgetReportApi } from "./budgetReport/budgetReport-api";
import { reportApi } from "./report/report-api";

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    transactions: transactionsSlice.reducer,
    rates: ratesSlice.reducer,
    report: reportSlice.reducer,
    budgets: budgetsSlice.reducer,
    budgetReport: budgetReportSlice.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer,
    [accountsApi.reducerPath]: accountsApi.reducer,
    [categoriesApi.reducerPath]: categoriesApi.reducer,
    [budgetsApi.reducerPath]: budgetsApi.reducer,
    [budgetReportApi.reducerPath]: budgetReportApi.reducer,
    [reportApi.reducerPath]: reportApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      transactionsApi.middleware,
      accountsApi.middleware,
      categoriesApi.middleware,
      budgetsApi.middleware,
      budgetReportApi.middleware,
      reportApi.middleware,
    ),
});

/**
 * Inferred from the store shape — no need to manually define this type.
 * Used by useAppSelector to give type-safe access to state slices.
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Inferred dispatch type — knows about thunks (async actions).
 * Used by useAppDispatch so TypeScript understands that dispatch()
 * can accept thunk functions, not just plain action objects.
 */
export type AppDispatch = typeof store.dispatch;

export default store;
