import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import type { AxiosRequestConfig } from "axios";
import { describe, beforeEach, expect, it, vi } from "vitest";

import apiClient from "../../../utils/apiClient";
import { transactionsApi } from "../../transactions/transactions-api";
import { budgetReportApi } from "../../budgetReport/budgetReport-api";
import { reportApi } from "../../report/report-api";
import { accountsApi } from "../accounts-api";

vi.mock("../../../utils/apiClient", () => ({ default: vi.fn() }));
const mockClient = vi.mocked(apiClient);
const recommendation = { expenseAccountId: 1, incomeAccountId: 2 };
const account = { key: "cash", name: "Cash", description: "", currencyId: 1, isEnabled: true, isFavourite: false };
const transaction = { accountId: 1, categoryId: 1, amount: -10, comment: "", created: "2026-11-05" };
const createStore = () => configureStore({
  reducer: {
    [accountsApi.reducerPath]: accountsApi.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer,
    [budgetReportApi.reducerPath]: budgetReportApi.reducer,
    [reportApi.reducerPath]: reportApi.reducer,
  },
  middleware: getDefault => getDefault().concat(accountsApi.middleware, transactionsApi.middleware, budgetReportApi.middleware, reportApi.middleware),
});

describe("transaction account recommendation cache", () => {
  beforeEach(() => {
    mockClient.mockReset();
    mockClient.mockImplementation(async config => ({ data: (config as AxiosRequestConfig).url === "/transactions/default-accounts" ? recommendation : null }));
  });

  it("uses the authenticated client without sending a user override and isolates user caches", async () => {
    const store = createStore();
    const first = await store.dispatch(accountsApi.endpoints.getTransactionDefaultAccounts.initiate(1));
    expect(first.data).toEqual(recommendation);
    expect(accountsApi.endpoints.getTransactionDefaultAccounts.select(2)(store.getState()).data).toBeUndefined();
    await store.dispatch(accountsApi.endpoints.getTransactionDefaultAccounts.initiate(2));
    expect(mockClient).toHaveBeenCalledTimes(2);
    expect(mockClient).toHaveBeenLastCalledWith({ url: "/transactions/default-accounts", method: "get", data: undefined, params: undefined, signal: expect.any(AbortSignal) });
    store.dispatch(accountsApi.util.resetApiState());
  });

  it.each(["create account", "update account", "delete account", "create transaction", "update transaction", "delete transaction"])("refreshes an observed recommendation after %s", async operation => {
    const store = createStore();
    await store.dispatch(accountsApi.endpoints.getTransactionDefaultAccounts.initiate(1));
    switch (operation) {
      case "create account": await store.dispatch(accountsApi.endpoints.createAccount.initiate(account)); break;
      case "update account": await store.dispatch(accountsApi.endpoints.updateAccount.initiate({ ...account, id: 1 })); break;
      case "delete account": await store.dispatch(accountsApi.endpoints.deleteAccount.initiate(1)); break;
      case "create transaction": await store.dispatch(transactionsApi.endpoints.createTransaction.initiate(transaction)); break;
      case "update transaction": await store.dispatch(transactionsApi.endpoints.updateTransaction.initiate({ ...transaction, id: 1 })); break;
      case "delete transaction": await store.dispatch(transactionsApi.endpoints.deleteTransaction.initiate(1)); break;
    }
    await waitFor(() => expect(mockClient.mock.calls.filter(([config]) => (config as AxiosRequestConfig).url === "/transactions/default-accounts")).toHaveLength(2));
    store.dispatch(accountsApi.util.resetApiState());
  });
});
