import * as React from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TransactionList from "./TransactionList";

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
    useGetTransactionsQuery: () => ({
        currentData: {
            data: [{
                id: 1,
                accountId: 1,
                categoryId: 1,
                created: "2026-06-05T12:00:00",
                amount: -80,
                comment: "Long grocery trip #household @receipt",
                tags: ["household"],
                refs: ["receipt"],
                accountCurrency: "PLN",
            }],
            metadata: { totalItems: 1 },
        },
        isError: false,
        isFetching: false,
        isLoading: false,
        refetch: vi.fn(),
    }),
}));

vi.mock("./TransactionEditForm", () => ({
    default: () => null,
}));

describe("TransactionList", () => {
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
});
