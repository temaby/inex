import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TransactionList from "./TransactionList";

const apiState = vi.hoisted(() => ({
    transactions: [] as any[],
    totalItems: undefined as number | undefined,
    language: "en",
    refetch: vi.fn(),
    initiate: vi.fn(),
    dispatch: vi.fn(),
}));

const transaction = {
    id: 1,
    accountId: 1,
    categoryId: 1,
    created: "2026-06-05T12:00:00",
    amount: -80,
    comment: "Long grocery trip #household @receipt",
    tags: ["household"],
    refs: ["receipt"],
    accountCurrency: "PLN",
};

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        i18n: { language: apiState.language },
        t: (key: string, options?: { count?: number }) => ({
            "transactions.description": "Description",
            "transactions.account": "Account",
            "transactions.date": "Date",
            "transactions.amount": "Amount",
            "transactions.amountEquivalent": "Amount equivalent",
            "transactions.day.today": "Today",
            "transactions.day.yesterday": "Yesterday",
            "transactions.itemCount": `${String(options?.count)} items`,
            "transactions.uncategorized": "Uncategorized",
            "transactions.unknownAccount": "Unknown account",
            "transactions.transfer": "Transfer",
            "transactions.paginationSummary": "Pagination summary",
            "primitives.kindLabel.expense": "Expense",
        }[key] ?? key),
    }),
}));

vi.mock("../../store/hooks", () => ({
    useAppDispatch: () => apiState.dispatch,
    useAppSelector: () => null,
}));

vi.mock("../../components/primitives", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../components/primitives")>();
    return {
        ...actual,
        InExDrawer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

vi.mock("../../store/transactions/transactions-api", () => ({
    transactionsApi: {
        endpoints: {
            getTransactions: {
                initiate: apiState.initiate,
            },
        },
    },
    useGetTransactionsQuery: () => ({
        currentData: {
            data: apiState.transactions,
            metadata: { totalItems: apiState.totalItems ?? apiState.transactions.length },
        },
        isError: false,
        isFetching: false,
        isLoading: false,
        refetch: apiState.refetch,
    }),
}));

vi.mock("./TransactionEditForm", () => ({
    default: ({ onMutationSuccess }: { onMutationSuccess: (focusTransactionId: number | null) => void }) => (
        <>
            <button onClick={() => onMutationSuccess(1)} type="button">Save fixture</button>
            <button onClick={() => onMutationSuccess(null)} type="button">Delete fixture</button>
        </>
    ),
}));

describe("TransactionList", () => {
    const renderList = () => render(
        <>
            <h2 id="transactions-ledger-heading" tabIndex={-1}>Ledger</h2>
            <TransactionList
                accounts={[{ id: 1, key: "cash", name: "Daily cash", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "PLN" }]}
                baseCurrency="USD"
                categories={[{ id: 1, key: "groceries", name: "Groceries", description: null, isEnabled: true, isSystem: false, systemCode: null }]}
                cachedExchangeRates={[{ currencyFrom: "USD", currencyTo: "PLN", date: "2026-06-05", rate: 4 }]}
                dataOwnerId={1}
                filter={{ accountIds: [], categoryIds: [], range: [], refs: [], search: "", tags: [], type: "all" }}
                onAddTransaction={vi.fn()}
                onClearFilters={vi.fn()}
                onInitialLoadingChange={vi.fn()}
                onCountChange={vi.fn()}
                periodLabel="June 2026"
                refreshToken={0}
            />
        </>,
    );

    beforeEach(() => {
        apiState.transactions = [transaction];
        apiState.totalItems = undefined;
        apiState.language = "en";
        apiState.refetch.mockReset();
        apiState.initiate.mockReset();
        apiState.dispatch.mockReset();
        apiState.dispatch.mockImplementation((action) => action);
        apiState.refetch.mockReturnValue({ unwrap: () => Promise.resolve({ data: apiState.transactions, metadata: { totalItems: apiState.transactions.length } }) });
        apiState.initiate.mockReturnValue({ unwrap: () => Promise.resolve({ data: apiState.transactions, metadata: { totalItems: apiState.transactions.length } }) });
    });

    it("groups dates above compact rows, preserves metadata, and distinguishes the visible and total counts", () => {
        const onCountChange = vi.fn();
        apiState.totalItems = 37;
        const { container } = render(
            <TransactionList
                accounts={[{ id: 1, key: "cash", name: "Daily cash", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "PLN" }]}
                baseCurrency="USD"
                categories={[{ id: 1, key: "groceries", name: "Groceries", description: null, isEnabled: true, isSystem: false, systemCode: null }]}
                cachedExchangeRates={[{ currencyFrom: "USD", currencyTo: "PLN", date: "2026-06-05", rate: 4 }]}
                dataOwnerId={1}
                filter={{ accountIds: [], categoryIds: [], range: [], refs: [], search: "", tags: [], type: "all" }}
                onAddTransaction={vi.fn()}
                onClearFilters={vi.fn()}
                onInitialLoadingChange={vi.fn()}
                onCountChange={onCountChange}
                periodLabel="June 2026"
                refreshToken={0}
            />,
        );

        const header = container.querySelector(".transactions-ledger-head");
        expect(Array.from(header?.children ?? []).map((element) => element.textContent)).toEqual(["Description", "Account", "Amount"]);
        expect(container.querySelector(".transactions-day-header time")).toHaveAttribute("datetime", "2026-06-05");

        const row = container.querySelector(".transactions-ledger-row");
        expect(row).not.toHaveTextContent("2026-06-05");
        expect(row?.querySelector(".transactions-category-path")).toHaveTextContent("Groceries");
        expect(row?.querySelectorAll(".transactions-row-token")).toHaveLength(2);
        expect(screen.getByRole("text", { name: "Expense: -80.00 PLN" })).toBeVisible();
        expect(screen.getByRole("text", { name: "Amount equivalent: -20.00 USD" })).toBeVisible();
        expect(onCountChange).toHaveBeenLastCalledWith({ visible: 1, total: 37 });
        expect(row).toHaveAttribute("tabindex", "0");

        fireEvent.keyDown(row as Element, { key: "Enter" });
        fireEvent.keyDown(row as Element, { key: " " });
    });

    it("formats original and converted money using the active locale and each currency's precision", () => {
        apiState.language = "ru";
        apiState.transactions = [
            { ...transaction, accountId: 2, accountCurrency: "JPY", amount: -1234, categoryId: 0, tags: [], refs: [] },
            { ...transaction, id: 2, amount: -14925.92, tags: [], refs: [] },
        ];

        renderList();

        expect(screen.getByRole("text", { name: "Expense: -1 234 JPY" })).toBeVisible();
        expect(screen.getByRole("text", { name: "Amount equivalent: -3 731,48 USD" })).toBeVisible();
    });

    it("returns focus to the updated row after the refreshed ledger renders", async () => {
        renderList();
        const row = document.querySelector<HTMLElement>(".transactions-ledger-row");
        expect(row).not.toBeNull();

        fireEvent.click(row as HTMLElement);
        fireEvent.click(screen.getByRole("button", { name: "Save fixture" }));

        await waitFor(() => expect(document.activeElement).toBe(row));
        expect(row).toHaveClass("transactions-ledger-row--restored-focus");
    });

    it("refreshes the active progressive ledger from page one after a successful create signal", async () => {
        const activeFilter = { accountIds: [1], categoryIds: [], range: [], refs: [], search: "groceries", tags: [], type: "expense" as const };
        const refreshedTransaction = { ...transaction, id: 2, comment: "New groceries" };
        const RefreshHarness = () => {
            const [refreshToken, setRefreshToken] = React.useState(0);
            return <>
                <button onClick={() => {
                    apiState.transactions = [refreshedTransaction];
                    setRefreshToken((token) => token + 1);
                }} type="button">Created transaction</button>
                <TransactionList
                    accounts={[{ id: 1, key: "cash", name: "Daily cash", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "PLN" }]}
                    baseCurrency="USD"
                    categories={[{ id: 1, key: "groceries", name: "Groceries", description: null, isEnabled: true, isSystem: false, systemCode: null }]}
                    cachedExchangeRates={[]}
                    dataOwnerId={1}
                    filter={activeFilter}
                    onAddTransaction={vi.fn()}
                    onClearFilters={vi.fn()}
                    onInitialLoadingChange={vi.fn()}
                    onCountChange={vi.fn()}
                    periodLabel="June 2026"
                    refreshToken={refreshToken}
                />
            </>;
        };

        render(<RefreshHarness />);
        expect(screen.getByText("Long grocery trip")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Created transaction" }));

        await waitFor(() => expect(apiState.initiate).toHaveBeenCalledWith(
            { pageSize: 20, page: 1, filter: activeFilter },
            { forceRefetch: true, subscribe: false },
        ));
        await waitFor(() => expect(screen.getByText("New groceries")).toBeInTheDocument());
        expect(screen.queryByText("Long grocery trip")).not.toBeInTheDocument();
    });

    it("moves focus to the ledger heading when an updated row is filtered out", async () => {
        apiState.initiate.mockImplementation(() => {
            apiState.transactions = [];
            return { unwrap: () => Promise.resolve({ data: [], metadata: { totalItems: 0 } }) };
        });
        renderList();

        fireEvent.click(document.querySelector<HTMLElement>(".transactions-ledger-row") as HTMLElement);
        fireEvent.click(screen.getByRole("button", { name: "Save fixture" }));

        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Ledger" })));
    });

    it("uses the ledger-heading fallback after confirmed deletion", async () => {
        renderList();

        fireEvent.click(document.querySelector<HTMLElement>(".transactions-ledger-row") as HTMLElement);
        fireEvent.click(screen.getByRole("button", { name: "Delete fixture" }));

        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Ledger" })));
    });

    it("renders linked rows without pointer or keyboard edit affordances", () => {
        const { container } = render(
            <TransactionList
                accounts={[{ id: 1, key: "cash", name: "Daily cash", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "PLN" }]}
                baseCurrency="USD"
                categories={[{ id: 1, key: "groceries", name: "Groceries", description: null, isEnabled: true, isSystem: false, systemCode: null }]}
                cachedExchangeRates={[]}
                dataOwnerId={2}
                filter={{ accountIds: [], categoryIds: [], range: [], refs: [], search: "", tags: [], type: "all" }}
                linkedUserId={2}
                onAddTransaction={vi.fn()}
                onClearFilters={vi.fn()}
                onInitialLoadingChange={vi.fn()}
                onCountChange={vi.fn()}
                periodLabel="June 2026"
                readOnly
                refreshToken={0}
            />,
        );

        const row = container.querySelector(".transactions-ledger-row");
        expect(row).toHaveClass("transactions-ledger-row--read-only");
        expect(row).not.toHaveAttribute("role");
        expect(row).not.toHaveAttribute("tabindex");
        fireEvent.click(row as Element);
        fireEvent.keyDown(row as Element, { key: "Enter" });
        expect(screen.queryByRole("button", { name: "Save fixture" })).not.toBeInTheDocument();
    });
});
