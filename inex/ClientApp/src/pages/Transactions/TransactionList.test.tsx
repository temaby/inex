import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TransactionList from "./TransactionList";

const apiState = vi.hoisted(() => ({
    transactions: [] as any[],
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
        t: (key: string, options?: { count?: number }) => ({
            "transactions.description": "Description",
            "transactions.account": "Account",
            "transactions.date": "Date",
            "transactions.amount": "Amount",
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
            metadata: { totalItems: apiState.transactions.length },
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
                accounts={[{ id: 1, key: "cash", name: "Daily cash", description: null, isEnabled: true, currencyId: 1, currency: "PLN" }]}
                accountSummaries={[]}
                baseCurrency="USD"
                categories={[{ id: 1, key: "groceries", name: "Groceries", description: null, isEnabled: true, isSystem: false, systemCode: null }]}
                cachedExchangeRates={[{ currencyFrom: "USD", currencyTo: "PLN", date: "2026-06-05", rate: 4 }]}
                filter={{ accountIds: [], categoryIds: [], range: [], refs: [], search: "", tags: [], type: "all" }}
                onAddTransaction={vi.fn()}
                onClearFilters={vi.fn()}
                onEditDrawerOpenChange={vi.fn()}
                onInitialLoadingChange={vi.fn()}
                onVisibleCountChange={vi.fn()}
                periodLabel="June 2026"
            />
        </>,
    );

    beforeEach(() => {
        apiState.transactions = [transaction];
        apiState.refetch.mockReset();
        apiState.initiate.mockReset();
        apiState.dispatch.mockReset();
        apiState.dispatch.mockImplementation((action) => action);
        apiState.refetch.mockReturnValue({ unwrap: () => Promise.resolve({ data: apiState.transactions, metadata: { totalItems: apiState.transactions.length } }) });
        apiState.initiate.mockReturnValue({ unwrap: () => Promise.resolve({ data: apiState.transactions, metadata: { totalItems: apiState.transactions.length } }) });
    });

    it("keeps desktop metadata before the final amount and shows an available date-matched equivalent", () => {
        const onEditDrawerOpenChange = vi.fn();
        const { container } = render(
            <TransactionList
                accounts={[{ id: 1, key: "cash", name: "Daily cash", description: null, isEnabled: true, currencyId: 1, currency: "PLN" }]}
                accountSummaries={[]}
                baseCurrency="USD"
                categories={[{ id: 1, key: "groceries", name: "Groceries", description: null, isEnabled: true, isSystem: false, systemCode: null }]}
                cachedExchangeRates={[{ currencyFrom: "USD", currencyTo: "PLN", date: "2026-06-05", rate: 4 }]}
                filter={{ accountIds: [], categoryIds: [], range: [], refs: [], search: "", tags: [], type: "all" }}
                onAddTransaction={vi.fn()}
                onClearFilters={vi.fn()}
                onEditDrawerOpenChange={onEditDrawerOpenChange}
                onInitialLoadingChange={vi.fn()}
                onVisibleCountChange={vi.fn()}
                periodLabel="June 2026"
            />,
        );

        const header = container.querySelector(".transactions-ledger-head");
        expect(Array.from(header?.children ?? []).map((element) => element.textContent)).toEqual(["Description", "Account", "Date", "Amount"]);

        const row = container.querySelector(".transactions-ledger-row");
        expect(Array.from(row?.children ?? []).map((element) => element.className)).toEqual([
            "transactions-row-main",
            "transactions-row-account",
            "transactions-row-date",
            "transactions-row-amount",
        ]);
        expect(row).toHaveTextContent("-20.00 USD");
        expect(row).toHaveAttribute("tabindex", "0");

        fireEvent.keyDown(row as Element, { key: "Enter" });
        fireEvent.keyDown(row as Element, { key: " " });
        expect(onEditDrawerOpenChange).toHaveBeenCalledTimes(2);
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
});
