import { configureStore } from "@reduxjs/toolkit";

import accountsSlice from "./accounts/accounts-slice";
import categoriesSlice from "./categories/categories-slice";
import transactionsSlice from "./transactions/transactions-slice";
import ratesSlice from "./rates/rates-slice";
import reportSlice from "./report/report-slice";
import budgetsSlice from "./budgets/budgets-slice";
import budgetReportSlice from "./budgetReport/budgetReport-slice";
import authSlice from "./auth/auth-slice";

const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    accounts: accountsSlice.reducer,
    categories: categoriesSlice.reducer,
    transactions: transactionsSlice.reducer,
    rates: ratesSlice.reducer,
    report: reportSlice.reducer,
    budgets: budgetsSlice.reducer,
    budgetReport: budgetReportSlice.reducer,
  },
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