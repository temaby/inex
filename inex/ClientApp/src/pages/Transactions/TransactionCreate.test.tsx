import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import TransactionCreate from "./TransactionCreate";

const mutationState = vi.hoisted(() => ({
    createLoading: false,
    transferLoading: false,
    createTransaction: vi.fn(),
    createTransfer: vi.fn(),
    dispatch: vi.fn(),
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => ({
            "categories.systemGroup": "System",
            "transactions.cancel": "Cancel",
            "transactions.expense": "Expense",
            "transactions.income": "Income",
            "transactions.saveExpense": "Save expense",
            "transactions.saveIncome": "Save income",
            "transactions.saveTransfer": "Save transfer",
            "transactions.saving": "Saving...",
            "transactions.transfer": "Transfer",
        }[key] ?? key),
    }),
}));

vi.mock("../../store/hooks", () => ({
    useAppDispatch: () => mutationState.dispatch,
}));

vi.mock("../../store/transactions/transactions-api", () => ({
    useCreateTransactionMutation: () => [
        mutationState.createTransaction,
        { isLoading: mutationState.createLoading },
    ],
    useCreateTransferMutation: () => [
        mutationState.createTransfer,
        { isLoading: mutationState.transferLoading },
    ],
}));

vi.mock("./TransactionCreateExpenseForm", () => ({
    default: function TransactionCreateExpenseFormMock() {
        return <div data-testid="expense-form" />;
    },
}));

vi.mock("./TransactionCreateIncomeForm", () => ({
    default: function TransactionCreateIncomeFormMock() {
        return <div data-testid="income-form" />;
    },
}));

vi.mock("./TransactionCreateTransferForm", () => ({
    default: function TransactionCreateTransferFormMock() {
        return <div data-testid="transfer-form" />;
    },
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
];

const categories: CategoryResponse[] = [
    {
        id: 10,
        key: "groceries",
        name: "Groceries",
        description: null,
        parentId: null,
        isEnabled: true,
        isSystem: false,
        systemCode: null,
    },
];

const renderCreateForm = () =>
    render(
        <TransactionCreate
            accounts={accounts}
            categories={categories}
            onCancel={() => undefined}
            onSubmit={() => undefined}
        />,
    );

describe("TransactionCreate", () => {
    beforeEach(() => {
        mutationState.createLoading = false;
        mutationState.transferLoading = false;
        mutationState.createTransaction.mockReset();
        mutationState.createTransfer.mockReset();
        mutationState.dispatch.mockReset();
    });

    it("keeps the save action enabled when no create mutation is running", () => {
        renderCreateForm();

        expect(screen.getByRole("button", { name: "Save expense" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    });

    it("disables save while the transaction create mutation is running", () => {
        mutationState.createLoading = true;

        renderCreateForm();

        expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    });

    it("disables save while the transfer create mutation is running", () => {
        mutationState.transferLoading = true;

        renderCreateForm();

        expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    });
});
