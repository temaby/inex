import * as React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ratesSlice from "../store/rates/rates-slice";
import transactionsSlice from "../store/transactions/transactions-slice";
import authSlice from "../store/auth/auth-slice";
import linkedAccountSlice, { linkedAccountActions } from "../store/linkedAccount/linked-account-slice";
import type { TransactionSummaryResult } from "../store/transactions/transactions-api";
import Transactions from "./Transactions";

const navigateMock = vi.hoisted(() => vi.fn());
const routerState = vi.hoisted(() => ({ search: "" }));
const summaryQueryState = vi.hoisted(() => ({ data: undefined as TransactionSummaryResult | undefined }));
const accountSummaryQueryMock = vi.hoisted(() => vi.fn());
const accountsQueryMock = vi.hoisted(() => vi.fn());
const categoriesQueryMock = vi.hoisted(() => vi.fn());
const summaryQueryMock = vi.hoisted(() => vi.fn());
const transactionListProps = vi.hoisted(() => ({ current: null as unknown }));

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
                    "transactions.accountBalancesExpand": "Expand",
                    "transactions.accountBalancesCollapse": "Collapse",
                    "transactions.accountBalancesLoading": "Loading account balances",
                    "transactions.accountBalancesPin": "Pin overview",
                    "transactions.accountBalancesSubtitle": "Active accounts in their native currencies.",
                    "transactions.accountBalancesUnpin": "Unpin overview",
                    "transactions.summaryTotal": "TOTAL",
                    "primitives.kindLabel.neutral": "Neutral",
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
    useGetAccountsQuery: (...args: unknown[]) => {
        accountsQueryMock(...args);
        const accounts = [
            {
                id: 1,
                key: "wallet",
                name: "Wallet",
                description: null,
                isEnabled: true,
                isFavourite: true,
                currencyId: 1,
                currency: "USD",
            },
            {
                id: 2,
                key: "hidden-wallet",
                name: "Hidden wallet",
                description: null,
                isEnabled: true,
                isFavourite: false,
                currencyId: 1,
                currency: "USD",
            },
            {
                id: 3,
                key: "archived-wallet",
                name: "Archived wallet",
                description: null,
                isEnabled: false,
                isFavourite: true,
                currencyId: 1,
                currency: "USD",
            },
        ];
        return { currentData: accounts, data: accounts };
    },
    useGetAccountsSummaryQuery: (...args: unknown[]) => accountSummaryQueryMock(...args),
}));

vi.mock("../store/categories/categories-api", () => ({
    useGetCategoriesQuery: (...args: unknown[]) => {
        categoriesQueryMock(...args);
        const categories = [
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
        ];
        return { currentData: categories, data: categories };
    },
}));

vi.mock("../store/transactions/transactions-api", () => ({
    useGetTransactionsSummaryQuery: (...args: unknown[]) => {
        summaryQueryMock(...args);
        return {
        currentData: summaryQueryState.data,
        data: summaryQueryState.data,
        isLoading: false,
        };
    },
}));

vi.mock("../store/rates/rates-action", () => ({
    fetchCachedRatesForRange: vi.fn(),
}));

vi.mock("../layouts/BasicPage", () => ({
    default: ({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) => <main>{extra}{children}</main>,
}));

vi.mock("./Transactions/TransactionCreate", () => ({
    default: ({ accounts }: { accounts: { name: string }[] }) => <div data-testid="transaction-create">{accounts.map(account => account.name).join(", ")}</div>,
}));

vi.mock("./Transactions/TransactionFilterForm", () => ({
    default: () => <div data-testid="transaction-filter-form" />,
}));

vi.mock("./Transactions/TransactionList", () => ({
    default: (props: { accounts: { name: string }[] }) => {
        transactionListProps.current = props;
        return <div data-testid="transaction-list">{props.accounts.map(account => account.name).join(", ")}</div>;
    },
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

const renderTransactions = (linkedMode = false) => {
    const store = configureStore({
        reducer: {
            auth: authSlice.reducer,
            linkedAccount: linkedAccountSlice.reducer,
            rates: ratesSlice.reducer,
            transactions: transactionsSlice.reducer,
        },
    });
    store.dispatch(authSlice.actions.setCredentials({
        accessToken: "token",
        expiresIn: 3600,
        user: { id: 1, username: "owner", email: "owner@example.com", currencyId: 1, languageCode: "en" },
    }));
    store.dispatch(linkedAccountActions.beginLoading(1));
    store.dispatch(linkedAccountActions.setLinkState({
        userId: 1,
        linkState: {
            state: "master",
            masterAccount: null,
            linkedAccounts: [{ id: 2, username: "linked", email: null, baseCurrency: "PLN" }],
        },
    }));
    if (linkedMode) store.dispatch(linkedAccountActions.selectLinkedUser(2));

    return {
        store,
        ...render(
            <MemoryRouter>
                <Provider store={store}>
                    <Transactions />
                </Provider>
            </MemoryRouter>,
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
        accountsQueryMock.mockReset();
        categoriesQueryMock.mockReset();
        summaryQueryMock.mockReset();
        transactionListProps.current = null;
        accountSummaryQueryMock.mockReset();
        accountSummaryQueryMock.mockReturnValue({
            currentData: [],
            data: [],
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch: vi.fn(),
        });
        window.localStorage.clear();
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

    it("opens the unpinned account balances overview in its page-level drawer", () => {
        renderTransactions();

        const accountBalances = screen.getByRole("button", { name: "Account balances" });
        expect(accountBalances).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("dialog", { name: "Account balances" })).not.toBeInTheDocument();
        expect(screen.queryByRole("region", { name: "Account balances" })).not.toBeInTheDocument();

        fireEvent.click(accountBalances);
        expect(accountBalances).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("dialog", { name: "Account balances" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Account balances" })).toHaveClass("transactions-account-balances--drawer");
        expect(screen.queryByRole("region", { name: "Account balances" })).not.toHaveClass("transactions-account-balances--inline");

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(accountBalances).toHaveAttribute("aria-expanded", "false");
    });

    it("requests and totals only enabled accounts visible in Transactions", () => {
        summaryQueryState.data = {
            totalCount: 0,
            typeCounts: { all: 0, income: 0, expense: 0, transfer: 0, internalTransfer: 0 },
            viewTypeCounts: { all: 0, income: 0, expense: 0, transfer: 0, internalTransfer: 0 },
            currencySummaries: [],
            baseCurrency: "USD",
            currentScope: { totalCount: 0, typeCounts: { all: 0, income: 0, expense: 0, transfer: 0, internalTransfer: 0 }, period: null, cashFlowBuckets: [] },
            previousScope: null,
        };
        accountSummaryQueryMock.mockReturnValue({
            currentData: [
                { id: 1, key: "wallet", name: "Wallet", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "USD", value: 100, thisMonthNet: 0 },
                { id: 2, key: "hidden-wallet", name: "Hidden wallet", description: null, isEnabled: true, isFavourite: false, currencyId: 1, currency: "USD", value: 200, thisMonthNet: 0 },
                { id: 3, key: "archived-wallet", name: "Archived wallet", description: null, isEnabled: false, isFavourite: true, currencyId: 1, currency: "USD", value: 300, thisMonthNet: 0 },
            ],
            isError: false,
            isFetching: false,
            isLoading: false,
            refetch: vi.fn(),
        });
        renderTransactions();

        fireEvent.click(screen.getByRole("button", { name: "Account balances" }));

        expect(accountSummaryQueryMock).toHaveBeenLastCalledWith(
            { ids: [1], linkedUserId: null },
            expect.objectContaining({ skip: false }),
        );
        expect(screen.getByText("Wallet")).toBeInTheDocument();
        expect(screen.queryByText("Hidden wallet")).not.toBeInTheDocument();
        expect(screen.queryByText("Archived wallet")).not.toBeInTheDocument();
        expect(screen.getAllByRole("text", { name: "Neutral: +100.00 USD" })).toHaveLength(2);
    });

    it("shows a single sticky rail when the drawer overview is pinned on desktop", () => {
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: query === "(min-width: 1180px)",
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        });
        renderTransactions();

        fireEvent.click(screen.getByRole("button", { name: "Account balances" }));
        fireEvent.click(screen.getByRole("button", { name: "Pin overview" }));

        expect(screen.queryByRole("dialog", { name: "Account balances" })).not.toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Account balances" })).toHaveClass("transactions-account-balances--rail");
        expect(document.querySelector(".transactions-account-balances--inline")).not.toBeInTheDocument();
    });

    it("keeps a pinned mobile overview expanded inline with a collapse control", () => {
        window.localStorage.setItem("inex.transactions.account-balances-pinned", "true");
        renderTransactions();

        const overview = screen.getByRole("region", { name: "Account balances" });
        expect(overview).toHaveClass("transactions-account-balances--inline");
        expect(screen.getByRole("button", { name: "Collapse" })).toHaveAttribute("aria-expanded", "true");
        expect(screen.queryByRole("dialog", { name: "Account balances" })).not.toBeInTheDocument();
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
            typeCounts: { all: 1, income: 1, expense: 0, transfer: 0, internalTransfer: 0 },
            viewTypeCounts: { all: 4, income: 1, expense: 1, transfer: 2, internalTransfer: 0 },
            currencySummaries: [],
            baseCurrency: "USD",
            currentScope: {
                totalCount: 1,
                typeCounts: { all: 1, income: 1, expense: 0, transfer: 0, internalTransfer: 0 },
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

    it("passes only active accounts to the edit and create transaction flows", () => {
        renderTransactions();

        expect(screen.getByTestId("transaction-list")).toHaveTextContent("Wallet");
        expect(screen.getByTestId("transaction-list")).not.toHaveTextContent("Archived wallet");

        fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));
        expect(screen.getByTestId("transaction-create")).toHaveTextContent("Wallet");
        expect(screen.getByTestId("transaction-create")).not.toHaveTextContent("Archived wallet");
    });

    it("scopes all financial reads and removes mutation entry points in linked mode", () => {
        renderTransactions(true);

        expect(accountsQueryMock).toHaveBeenCalledWith({ mode: "ALL", linkedUserId: 2 });
        expect(categoriesQueryMock).toHaveBeenCalledWith({ mode: "ALL", linkedUserId: 2 });
        expect(summaryQueryMock).toHaveBeenCalledWith(expect.objectContaining({ linkedUserId: 2 }));
        expect(accountSummaryQueryMock).toHaveBeenCalledWith(
            { ids: [1], linkedUserId: 2 },
            expect.any(Object),
        );
        expect(transactionListProps.current).toMatchObject({
            dataOwnerId: 2,
            linkedUserId: 2,
            readOnly: true,
        });
        expect(screen.getByText("linkedAccount.readOnly")).toBeVisible();
        expect(screen.queryByRole("button", { name: "Add transaction" })).not.toBeInTheDocument();
    });

    it("clears owner-specific filters while preserving compatible filters on a scope switch", () => {
        routerState.search = "?filter=accountIds%3A1%3BcategoryIds%3A1%3Btype%3Aincome%3Bsearch%3Akeep%3Btags%3Ashared%3Brefs%3Areceipt%3B";
        const { store } = renderTransactions();
        navigateMock.mockClear();

        act(() => {
            store.dispatch(linkedAccountActions.selectLinkedUser(2));
        });

        expect(navigateMock).toHaveBeenCalledWith(
            expect.not.stringContaining("accountIds"),
            { replace: true },
        );
        const [target] = navigateMock.mock.calls[navigateMock.mock.calls.length - 1] ?? [];
        expect(target).not.toContain("categoryIds");
        expect(target).toContain("type%3Aincome");
        expect(target).toContain("search%3Akeep");
        expect(target).toContain("tags%3Ashared");
        expect(target).toContain("refs%3Areceipt");
        expect(transactionListProps.current).toMatchObject({ dataOwnerId: 2, readOnly: true });
    });
});
