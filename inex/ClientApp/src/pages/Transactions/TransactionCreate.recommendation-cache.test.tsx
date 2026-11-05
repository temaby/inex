import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";

import apiClient from "../../utils/apiClient";
import { accountsApi, type AccountResponse } from "../../store/accounts/accounts-api";
import { transactionsApi } from "../../store/transactions/transactions-api";
import TransactionCreate from "./TransactionCreate";

vi.mock("../../utils/apiClient", () => ({ default: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const observedSelections = vi.hoisted(() => [] as number[]);
vi.mock("./TransactionCreateExpenseForm", () => ({
    default: ({ fromAccount, onSetFromAccount }: { fromAccount: { id: number }; onSetFromAccount: (item: { key: string }) => void }) => {
        observedSelections.push(fromAccount.id);
        return <><output data-testid="selected-account">{fromAccount.id}</output><button onClick={() => onSetFromAccount({ key: "2" })}>Manual account</button></>;
    },
}));

const accounts: AccountResponse[] = [1, 2].map(id => ({ id, key: `account-${id}`, name: `Account ${id}`, currencyId: 1, currency: "USD", isEnabled: true, isFavourite: false, description: null }));
const mockClient = vi.mocked(apiClient);
const createStore = () => configureStore({
    reducer: {
        auth: (state = { user: { id: 1 } }) => state,
        linkedAccount: (state = { linkState: null }) => state,
        [accountsApi.reducerPath]: accountsApi.reducer,
        [transactionsApi.reducerPath]: transactionsApi.reducer,
    },
    middleware: getDefault => getDefault().concat(accountsApi.middleware, transactionsApi.middleware),
});

describe("TransactionCreate retained recommendation cache", () => {
    beforeEach(() => {
        mockClient.mockReset(); observedSelections.length = 0;
        window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    });

    it.each(["success", "failure", "manual"])("waits for this opening's request with cached data: %s", async outcome => {
        const store = createStore();
        mockClient.mockResolvedValueOnce({ data: { expenseAccountId: 1, incomeAccountId: 1 } });
        const seed = store.dispatch(accountsApi.endpoints.getTransactionDefaultAccounts.initiate(1));
        await seed; seed.unsubscribe();
        let resolveFresh!: (response: { data: { expenseAccountId: number; incomeAccountId: number } }) => void;
        let rejectFresh!: (error: unknown) => void;
        mockClient.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveFresh = resolve; rejectFresh = reject; }));
        const view = render(<Provider store={store}><TransactionCreate accounts={accounts} categories={[]} onCancel={() => undefined} onSubmit={() => undefined} /></Provider>);
        await waitFor(() => expect(mockClient).toHaveBeenCalledTimes(2));
        expect(screen.getByTestId("selected-account")).toHaveTextContent("-1");
        expect(observedSelections).not.toContain(1);
        if (outcome === "manual") fireEvent.click(screen.getByRole("button", { name: "Manual account" }));
        await act(async () => {
            if (outcome === "failure") rejectFresh({ response: { status: 503, data: {} } });
            else resolveFresh({ data: { expenseAccountId: outcome === "manual" ? 1 : 2, incomeAccountId: 1 } });
        });
        if (outcome === "failure") {
            await waitFor(() => expect(accountsApi.endpoints.getTransactionDefaultAccounts.select(1)(store.getState()).isError).toBe(true));
            expect(screen.getByTestId("selected-account")).toHaveTextContent("-1");
            fireEvent.click(screen.getByRole("button", { name: "Manual account" }));
        }
        await waitFor(() => expect(screen.getByTestId("selected-account")).toHaveTextContent("2"));
        expect(observedSelections).not.toContain(1);
        view.unmount(); store.dispatch(accountsApi.util.resetApiState());
    });
});
