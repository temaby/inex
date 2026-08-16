import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TransactionEditForm from "./TransactionEditForm";

const mutationState = vi.hoisted(() => ({
    dispatch: vi.fn(),
    updateTransaction: vi.fn(),
}));

const translate = (key: string) => ({
    "categories.systemGroup": "System",
    "common.enterAmount": "Enter amount",
    "common.no": "No",
    "common.yes": "Yes",
    "transactions.account": "Account",
    "transactions.amount": "Amount",
    "transactions.category": "Category",
    "transactions.comment": "Comment",
    "transactions.date": "Date",
    "transactions.delete": "Delete",
    "transactions.deleteConfirm": "Delete transaction?",
    "transactions.save": "Save",
    "transactions.unknownAccount": "Unknown account",
}[key] ?? key);

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: translate,
    }),
}));

vi.mock("../../store/hooks", () => ({
    useAppDispatch: () => mutationState.dispatch,
}));

vi.mock("../../store/transactions/transactions-api", () => ({
    useDeleteTransactionMutation: () => [vi.fn(), { isLoading: false }],
    useUpdateTransactionMutation: () => [mutationState.updateTransaction, { isLoading: false }],
}));

describe("TransactionEditForm", () => {
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
        mutationState.dispatch.mockReset();
        mutationState.updateTransaction.mockReset();
        mutationState.updateTransaction.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    });

    it("retains an archived transaction account while editing another field", async () => {
        render(
            <TransactionEditForm
                accounts={[{ id: 1, name: "Active wallet", currency: "PLN" }]}
                categories={[{ id: 10, key: "groceries", name: "Groceries", description: "", isEnabled: true, isSystem: false, systemCode: "", children: [] }]}
                onMutationSuccess={vi.fn()}
                record={{ id: 42, accountId: 99, accountCurrency: "EUR", amount: -20, categoryId: 10, comment: "Existing comment", created: "2026-04-30", refs: [], tags: [] }}
            />,
        );

        expect(await screen.findByText("Unknown account")).toBeInTheDocument();
        expect(screen.getByText("EUR")).toBeInTheDocument();

        fireEvent.change(screen.getByDisplayValue("Existing comment"), { target: { value: "Updated comment" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(mutationState.updateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 99,
            comment: "Updated comment",
            id: 42,
        })));
    });
});
