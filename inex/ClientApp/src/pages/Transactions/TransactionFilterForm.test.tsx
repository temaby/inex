import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountResponse } from "../../store/accounts/accounts-api";
import transactionsSlice from "../../store/transactions/transactions-slice";
import type { LedgerUiFilter } from "./transaction-ledger-utils";
import TransactionFilterForm from "./TransactionFilterForm";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => ({
            "categories.systemGroup": "System",
            "transactions.account": "Account",
            "transactions.advancedFilters": "Advanced filters",
            "transactions.allAccounts": "All accounts",
            "transactions.allCategories": "All categories",
            "transactions.amountEquivalent": "Amount equivalent",
            "transactions.applyFilters": "Apply filters",
            "transactions.category": "Category",
            "transactions.clearAll": "Clear all",
            "transactions.from": "From",
            "transactions.keyword": "Keyword",
            "transactions.keywordPlaceholder": "Search text, #tag, or @reference",
            "transactions.max": "Max",
            "transactions.min": "Min",
            "transactions.to": "To",
        }[key] ?? key),
    }),
}));

const accounts: AccountResponse[] = [
    {
        id: 1,
        key: "wallet",
        name: "Wallet",
        description: null,
        isEnabled: true,
        currencyId: 1,
        currency: "PLN",
    },
    {
        id: 2,
        key: "brokerage",
        name: "Brokerage",
        description: null,
        isEnabled: true,
        currencyId: 2,
        currency: "USD",
    },
];

const ledgerFilter: LedgerUiFilter = {
    type: "all",
    search: "",
    minAmount: "",
    maxAmount: "",
};

const renderFilter = (filter: string | null) => {
    const store = configureStore({
        reducer: {
            transactions: transactionsSlice.reducer,
        },
    });

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={["/transactions"]}>
                <TransactionFilterForm
                    accounts={accounts}
                    categories={[]}
                    filter={filter}
                    ledgerFilter={ledgerFilter}
                    onLedgerFilterChange={vi.fn()}
                />
            </MemoryRouter>
        </Provider>,
    );
};

describe("TransactionFilterForm", () => {
    beforeEach(() => {
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    it("does not show a default base currency suffix before an account is selected", () => {
        renderFilter(null);

        expect(screen.getByText("All accounts")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Min")).toBeDisabled();
        expect(screen.getByPlaceholderText("Max")).toBeDisabled();
        expect(screen.queryByText("USD")).not.toBeInTheDocument();
        expect(screen.queryByText("PLN")).not.toBeInTheDocument();
    });

    it("uses the selected account currency for amount filter suffixes", async () => {
        renderFilter("accountIds:1;");

        expect(await screen.findAllByText("PLN")).toHaveLength(2);
        expect(screen.getByPlaceholderText("Min")).not.toBeDisabled();
        expect(screen.getByPlaceholderText("Max")).not.toBeDisabled();
        expect(screen.queryByText("USD")).not.toBeInTheDocument();
    });

    it("omits the suffix when selected accounts have mixed currencies", () => {
        renderFilter("accountIds:1,2;");

        expect(screen.getByPlaceholderText("Min")).toBeDisabled();
        expect(screen.getByPlaceholderText("Max")).toBeDisabled();
        expect(screen.queryByText("USD")).not.toBeInTheDocument();
        expect(screen.queryByText("PLN")).not.toBeInTheDocument();
    });
});
