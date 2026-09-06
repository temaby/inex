import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountResponse } from "../../store/accounts/accounts-api";
import { transactionsDefaultFilter } from "../../store/transactions/transactions-slice";
import TransactionFilterForm from "./TransactionFilterForm";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => ({
        "categories.systemGroup": "System", "transactions.account": "Account", "transactions.allAccounts": "All accounts",
        "transactions.allCategories": "All categories", "transactions.applyFilters": "Apply filters", "transactions.category": "Category",
        "transactions.clearAll": "Clear all", "transactions.from": "From", "transactions.keyword": "Keyword",
        "transactions.keywordPlaceholder": "Search text, #tag, or @reference", "transactions.to": "To",
    }[key] ?? key) }),
}));

const accounts: AccountResponse[] = [{ id: 1, key: "wallet", name: "Wallet", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "PLN" }];

describe("TransactionFilterForm", () => {
    beforeEach(() => {
        Object.defineProperty(window, "matchMedia", {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false, media: query, onchange: null,
                addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
            })),
        });
    });

    it("keeps Amount controls out of the advanced filter drawer", () => {
        render(<TransactionFilterForm accounts={accounts} categories={[]} filter={{ ...transactionsDefaultFilter, range: [1, 2] }} onApply={vi.fn()} />);
        expect(screen.getByText("All accounts")).toBeInTheDocument();
        expect(screen.queryByText("Amount equivalent")).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Min")).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText("Max")).not.toBeInTheDocument();
    });

    it("applies parsed tag and reference values through the canonical filter", () => {
        const onApply = vi.fn();
        render(<TransactionFilterForm accounts={accounts} categories={[]} filter={{ ...transactionsDefaultFilter, range: [1, 2] }} onApply={onApply} />);
        fireEvent.change(screen.getByPlaceholderText("Search text, #tag, or @reference"), { target: { value: "#food @alex" } });
        fireEvent.click(screen.getByText("Apply filters"));
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ tags: ["food"], refs: ["alex"] }));
    });
});
