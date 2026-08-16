import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ratesSlice from "../store/rates/rates-slice";
import transactionsSlice from "../store/transactions/transactions-slice";
import type { TransactionSummaryResult } from "../store/transactions/transactions-api";
import Transactions from "./Transactions";

const navigateMock = vi.hoisted(() => vi.fn());
const routerState = vi.hoisted(() => ({ search: "" }));
const summaryQueryState = vi.hoisted(() => ({ data: undefined as TransactionSummaryResult | undefined }));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return {
        ...actual,
        useLocation: () => ({ pathname: "/transactions", search: routerState.search }),
        useNavigate: () => navigateMock,
    };
});

vi.mock("react-i18next", async () => {
    const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
    return {
        ...actual,
        useTranslation: () => ({
            i18n: { language: "en" },
            t: (key: string, params?: Record<string, unknown>) => {
                const translations: Record<string, string> = {
                    "transactions.addTransaction": "Add transaction",
                    "transactions.accountBalances": "Account balances",
                    "transactions.accountBalancesEmpty": "No active accounts to display.",
                    "transactions.accountBalancesError": "Could not load account balances.",
                    "transactions.accountBalancesLoading": "Loading account balances",
                    "transactions.accountBalancesSubtitle": "Active accounts in their native currencies.",
                    "transactions.advancedFilters": "Advanced filters",
                    "transactions.all": "All",
                    "transactions.clearAll": "Clear all",
                    "transactions.expense": "Expense",
                    "transactions.filters": "Filters",
                    "transactions.income": "Income",
                    "transactions.kpi.baseCurrencyContext": "Month summary shown in USD where rates exist",
                    "transactions.kpi.expenses": "Expenses",
                    "transactions.kpi.income": "Income",
                    "transactions.kpi.netFlow": "Net Flow",
                    "transactions.kpi.title": "Transaction KPIs",
                    "transactions.kpi.visibleRows": `${params?.count ?? 0} transactions in ${params?.period ?? ""}`,
                    "transactions.ledger": "Ledger",
                    "transactions.month.chooser": "Transaction month",
                    "transactions.month.next": "Next month",
                    "transactions.month.previous": "Previous month",
                    "transactions.period.currentMonth": "Current month",
                    "transactions.search": "Search",
                    "transactions.searchPlaceholder": "Search transactions",
                    "transactions.subtitle": "Overview",
                    "transactions.title": "Transactions",
                    "transactions.toolbarCount": `${params?.visible ?? 0} of ${params?.total ?? 0} transactions in ${params?.period ?? ""}`,
                    "transactions.transfer": "Transfer",
                    "transactions.view": "View",
                };

                return translations[key] ?? key;
            },
        }),
    };
});

vi.mock("../store/hooks", async () => {
    const reactRedux = await vi.importActual<typeof import("react-redux")>("react-redux");
    return {
        useAppDispatch: reactRedux.useDispatch,
        useAppSelector: reactRedux.useSelector,
    };
});

vi.mock("../store/accounts/accounts-api", () => ({
    useGetAccountsQuery: () => ({
        data: [
            {
                id: 1,
                key: "wallet",
                name: "Wallet",
                description: null,
                isEnabled: true,
                currencyId: 1,
                currency: "USD",
            },
        ],
    }),
    useGetAccountsSummaryQuery: () => ({
        data: [],
        isError: false,
        isFetching: false,
        isLoading: false,
        refetch: vi.fn(),
    }),
}));

vi.mock("../store/categories/categories-api", () => ({
    useGetCategoriesQuery: () => ({
        data: [
            {
                id: 1,
                key: "food",
                name: "Food",
                description: null,
                parentId: null,
                isEnabled: true,
                isSystem: false,
                systemCode: null,
            },
        ],
    }),
}));

vi.mock("../store/transactions/transactions-api", () => ({
    useGetTransactionsSummaryQuery: () => ({
        currentData: summaryQueryState.data,
        data: summaryQueryState.data,
        isLoading: false,
    }),
}));

vi.mock("../store/rates/rates-action", () => ({
    fetchCachedRatesForRange: vi.fn(),
}));

vi.mock("../layouts/BasicPage", () => ({
    default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("./Transactions/TransactionCreate", () => ({
    default: () => <div data-testid="transaction-create" />,
}));

vi.mock("./Transactions/TransactionFilterForm", () => ({
    default: () => <div data-testid="transaction-filter-form" />,
}));

vi.mock("./Transactions/TransactionList", () => ({
    default: () => <div data-testid="transaction-list" />,
}));

vi.mock("../components/primitives/InExDrawer", () => ({
    InExDrawer: ({ children, onClose, open, title }: {
        children: React.ReactNode;
        onClose: () => void;
        open: boolean;
        title: string;
    }) => open ? (
        <section aria-label={title} role="dialog">
            <button aria-label="Close" onClick={onClose} type="button">Close</button>
            {children}
        </section>
    ) : null,
}));

const renderTransactions = () => {
    const store = configureStore({
        reducer: {
            rates: ratesSlice.reducer,
            transactions: transactionsSlice.reducer,
        },
    });

    return {
        store,
        ...render(
            <Provider store={store}>
                <Transactions />
            </Provider>,
        ),
    };
};

describe("Transactions month controls", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-28T12:00:00"));
        navigateMock.mockReset();
        routerState.search = "";
        summaryQueryState.data = undefined;
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

    afterEach(() => {
        vi.useRealTimers();
    });

    it("debounces rapid previous-month clicks and commits only the final month", async () => {
        renderTransactions();

        expect(screen.getAllByLabelText("Transaction month").length).toBeGreaterThan(0);
        expect(navigateMock).toHaveBeenCalledTimes(1);
        navigateMock.mockClear();

        const previousMonth = screen.getByRole("button", { name: "Previous month" });

        fireEvent.click(previousMonth);
        fireEvent.click(previousMonth);
        fireEvent.click(previousMonth);

        await act(async () => {
            vi.advanceTimersByTime(249);
        });

        expect(navigateMock).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(1);
        });

        expect(navigateMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith(
            "/transactions?filter=start%3A2026-04-01%3Bend%3A2026-04-30%3B",
            { replace: false },
        );
    });

    it("opens account balances only from its explicit control and keeps the choice for the page session", () => {
        renderTransactions();

        const accountBalances = screen.getByRole("button", { name: "Account balances" });
        expect(accountBalances).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("region", { name: "Account balances" })).not.toBeInTheDocument();

        fireEvent.click(accountBalances);
        expect(accountBalances).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("region", { name: "Account balances" })).toBeVisible();

        fireEvent.click(accountBalances);
        expect(accountBalances).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("region", { name: "Account balances" })).not.toBeInTheDocument();
    });

    it("keeps the filter drawer closed when the route has no serialized filter", () => {
        renderTransactions();

        expect(screen.getByTestId("transaction-list")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByTestId("transaction-filter-form")).not.toBeInTheDocument();
    });

    it("restores a serialized filter without opening the drawer, which the Filters control can open and close", () => {
        routerState.search = "?filter=accountIds%3A1%3Btype%3Aexpense%3B";
        const { store } = renderTransactions();

        expect(store.getState().transactions.filter).toMatchObject({
            accountIds: [1],
            type: "expense",
        });

        const filters = screen.getByRole("button", { name: "Filters" });
        expect(filters).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByTestId("transaction-filter-form")).not.toBeInTheDocument();

        fireEvent.click(filters);
        expect(filters).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByTestId("transaction-filter-form")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(filters).toHaveAttribute("aria-expanded", "false");
    });

    it("uses untyped server VIEW counts and removes only type when All is selected", () => {
        summaryQueryState.data = {
            totalCount: 1,
            typeCounts: { all: 1, income: 1, expense: 0, transfer: 0 },
            viewTypeCounts: { all: 4, income: 1, expense: 1, transfer: 2 },
            currencySummaries: [],
            baseCurrency: "USD",
            currentScope: {
                totalCount: 1,
                typeCounts: { all: 1, income: 1, expense: 0, transfer: 0 },
                period: null,
                cashFlowBuckets: [],
            },
            previousScope: null,
        };
        routerState.search = "?filter=type%3Aincome%3Bsearch%3Aview-scope%3B";

        renderTransactions();
        expect(screen.getByRole("button", { name: "All 4" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Income 1" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Expense 1" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Transfer 2" })).toBeVisible();

        navigateMock.mockClear();
        fireEvent.click(screen.getByRole("button", { name: "All 4" }));

        expect(navigateMock).toHaveBeenCalledWith(
            "/transactions?filter=search%3Aview-scope%3B",
            { replace: true },
        );
    });
});
