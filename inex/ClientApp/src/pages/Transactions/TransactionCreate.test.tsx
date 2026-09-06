import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import TransactionCreate from "./TransactionCreate";

const mutationState = vi.hoisted(() => ({
    createLoading: false,
    transferLoading: false,
    internalTransferLoading: false,
    createTransaction: vi.fn(),
    createTransfer: vi.fn(),
    createInternalTransfer: vi.fn(),
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
            "transactions.saveInternalTransfer": "Save internal transfer",
            "transactions.saving": "Saving...",
            "transactions.transfer": "Transfer",
            "transactions.internalTransfer": "Internal transfer",
            "errors.account_from_id.invalid": "Please select a valid source account",
            "errors.account_id.invalid": "Please select a valid account",
            "errors.account_to_id.invalid": "Please select a valid destination account",
            "errors.amount_from.must_be_positive": "Source amount must be greater than zero",
            "errors.amount.not_zero": "Amount cannot be zero",
            "errors.amount_to.must_be_positive": "Destination amount must be greater than zero",
            "errors.category_id.invalid": "Please select a valid category",
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
    useCreateInternalTransferMutation: () => [
        mutationState.createInternalTransfer,
        { isLoading: mutationState.internalTransferLoading },
    ],
}));

vi.mock("./TransactionCreateExpenseForm", () => ({
    default: function TransactionCreateExpenseFormMock({ validationErrors }: { validationErrors: Record<string, string | undefined> }) {
        return (
            <div data-testid="expense-form">
                {Object.values(validationErrors).map((error) => error ? <div key={error}>{error}</div> : null)}
            </div>
        );
    },
}));

vi.mock("./TransactionCreateIncomeForm", () => ({
    default: function TransactionCreateIncomeFormMock({ validationErrors }: { validationErrors: Record<string, string | undefined> }) {
        return (
            <div data-testid="income-form">
                {Object.values(validationErrors).map((error) => error ? <div key={error}>{error}</div> : null)}
            </div>
        );
    },
}));

vi.mock("./TransactionCreateTransferForm", () => ({
    default: function TransactionCreateTransferFormMock({ validationErrors }: { validationErrors: Record<string, string | undefined> }) {
        return (
            <div data-testid="transfer-form">
                {Object.values(validationErrors).map((error) => error ? <div key={error}>{error}</div> : null)}
            </div>
        );
    },
}));

vi.mock("./TransactionCreateInternalTransferForm", () => ({
    default: function TransactionCreateInternalTransferFormMock({
        validationErrors,
        onSetAccount,
        onSetAmount,
        onSetDirection,
    }: {
        validationErrors: Record<string, string | undefined>;
        onSetAccount: (item: { key: string }) => void;
        onSetAmount: (amount: number) => void;
        onSetDirection: (direction: "incoming" | "outgoing") => void;
    }) {
        return (
            <div data-testid="internal-transfer-form">
                <button
                    type="button"
                    onClick={() => {
                        onSetAccount({ key: "1" });
                        onSetAmount(25);
                        onSetDirection("incoming");
                    }}
                >
                    Set valid internal transfer
                </button>
                {Object.values(validationErrors).map((error) => error ? <div key={error}>{error}</div> : null)}
            </div>
        );
    },
}));

const accounts: AccountResponse[] = [
    {
        id: 1,
        key: "wallet",
        name: "Wallet",
        description: null,
        isEnabled: true,
        isVisibleInTransactions: true,
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
        mutationState.internalTransferLoading = false;
        mutationState.createTransaction.mockReset();
        mutationState.createTransfer.mockReset();
        mutationState.createInternalTransfer.mockReset();
        mutationState.createInternalTransfer.mockReturnValue({ unwrap: () => Promise.resolve() });
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

    it("blocks empty expense submits with field validation errors", async () => {
        const user = userEvent.setup();

        renderCreateForm();
        await user.click(screen.getByRole("button", { name: "Save expense" }));

        expect(mutationState.createTransaction).not.toHaveBeenCalled();
        expect(screen.getByText("Please select a valid account")).toBeInTheDocument();
        expect(screen.getByText("Please select a valid category")).toBeInTheDocument();
        expect(screen.getByText("Amount cannot be zero")).toBeInTheDocument();
    });

    it("blocks empty transfer submits with source, destination, and amount validation errors", async () => {
        const user = userEvent.setup();

        renderCreateForm();
        await user.click(screen.getByRole("button", { name: "Transfer" }));
        await user.click(screen.getByRole("button", { name: "Save transfer" }));

        expect(mutationState.createTransfer).not.toHaveBeenCalled();
        expect(screen.getByText("Please select a valid source account")).toBeInTheDocument();
        expect(screen.getByText("Please select a valid destination account")).toBeInTheDocument();
        expect(screen.getByText("Source amount must be greater than zero")).toBeInTheDocument();
        expect(screen.getByText("Destination amount must be greater than zero")).toBeInTheDocument();
    });

    it("shows the internal-transfer form and blocks an empty submission", async () => {
        const user = userEvent.setup();

        renderCreateForm();
        await user.click(screen.getByRole("button", { name: "Internal transfer" }));
        await user.click(screen.getByRole("button", { name: "Save internal transfer" }));

        expect(screen.getByTestId("internal-transfer-form")).toBeInTheDocument();
        expect(mutationState.createInternalTransfer).not.toHaveBeenCalled();
        expect(screen.getByText("Please select a valid account")).toBeInTheDocument();
        expect(screen.getByText("errors.amount.must_be_positive")).toBeInTheDocument();
    });

    it("submits an internal transfer with the selected direction", async () => {
        const user = userEvent.setup();

        renderCreateForm();
        await user.click(screen.getByRole("button", { name: "Internal transfer" }));
        await user.click(screen.getByRole("button", { name: "Set valid internal transfer" }));
        await user.click(screen.getByRole("button", { name: "Save internal transfer" }));

        expect(mutationState.createInternalTransfer).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 1,
            amount: 25,
            direction: "incoming",
            comment: "",
        }));
    });
});
