import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountResponse, TransactionDefaultAccountsResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import TransactionCreate from "./TransactionCreate";

const mutationState = vi.hoisted(() => ({
    defaults: undefined as TransactionDefaultAccountsResponse | undefined,
    defaultsFetching: false,
    defaultsFailed: false,
    loadDefaults: vi.fn(),
    createLoading: false,
    transferLoading: false,
    internalTransferLoading: false,
    linkedUsers: [] as { id: number; username: string }[],
    createLinked: vi.fn(),
    createTransaction: vi.fn(),
    createTransfer: vi.fn(),
    createInternalTransfer: vi.fn(),
    createCorrection: vi.fn(),
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
    useAppSelector: (selector: (root: { auth: { user: { id: number } }; linkedAccount: { linkState: { linkedAccounts: typeof mutationState.linkedUsers } } }) => unknown) => selector({
        auth: { user: { id: 1 } }, linkedAccount: { linkState: { linkedAccounts: mutationState.linkedUsers } },
    }),
}));

vi.mock("../../store/accounts/accounts-api", () => ({
    useLazyGetTransactionDefaultAccountsQuery: () => [mutationState.loadDefaults, {
        currentData: mutationState.defaults,
        isFetching: mutationState.defaultsFetching,
        isError: mutationState.defaultsFailed,
    }],
}));

vi.mock("../../store/transactions/transactions-api", () => ({
    useCreateCorrectionMutation: () => [mutationState.createCorrection, { isLoading: false }],
    useCreateLinkedInternalTransferMutation: () => [mutationState.createLinked, { isLoading: false }],
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

vi.mock("./useRecentCategories", () => ({ useRecentCategories: () => [] }));

vi.mock("./TransactionCreateExpenseForm", () => ({
    default: function TransactionCreateExpenseFormMock({ validationErrors, fromAccount, onSetFromAccount, onSetFromAmount, onSetCategory, fromAmount }: {
        validationErrors: Record<string, string | undefined>; fromAccount: { id: number }; onSetFromAccount: (item: { key: string }) => void;
        onSetFromAmount: (value: number) => void; onSetCategory: (item: { key: string }) => void; fromAmount: number;
    }) {
        return (
            <div data-testid="expense-form">
                <output data-testid="expense-account">{fromAccount.id}</output>
                <output data-testid="expense-amount">{fromAmount}</output>
                <button type="button" onClick={() => { onSetFromAccount({ key: "1" }); onSetFromAmount(12.5); onSetCategory({ key: "10" }); }}>Fill expense</button>
                <button type="button" onClick={() => onSetFromAccount({ key: "2" })}>Choose expense account</button>
                {Object.values(validationErrors).map((error) => error ? <div key={error}>{error}</div> : null)}
            </div>
        );
    },
}));

vi.mock("./TransactionCreateIncomeForm", () => ({
    default: function TransactionCreateIncomeFormMock({ validationErrors, toAccount, onSetToAccount }: { validationErrors: Record<string, string | undefined>; toAccount: { id: number }; onSetToAccount: (item: { key: string }) => void }) {
        return (
            <div data-testid="income-form">
                <output data-testid="income-account">{toAccount.id}</output>
                <button type="button" onClick={() => onSetToAccount({ key: "2" })}>Choose income account</button>
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
        onSetComment,
    }: {
        validationErrors: Record<string, string | undefined>;
        onSetComment: React.ChangeEventHandler<HTMLInputElement>;
        onSetAccount: (item: { key: string }) => void;
        onSetAmount: (amount: number) => void;
        onSetDirection: (direction: "incoming" | "outgoing") => void;
    }) {
        return (
            <div data-testid="internal-transfer-form">
                <input aria-label="Reason" onChange={onSetComment} />
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
        isFavourite: true,
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
    it("keeps exactly one type active and restores More after leaving an additional type", async () => {
        const user = userEvent.setup(); renderCreateForm();
        expect(screen.getByRole("button", { name: "Expense" })).toHaveAttribute("aria-pressed", "true");
        await user.click(screen.getByRole("button", { name: "transactions.moreTypes" }));
        await user.click(screen.getByRole("menuitem", { name: "transactions.correction" }));
        expect(screen.getByRole("button", { name: "transactions.correction" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Expense" })).toHaveAttribute("aria-pressed", "false");
        await user.click(screen.getByRole("button", { name: "Expense" }));
        expect(screen.getByRole("button", { name: "transactions.moreTypes" })).toHaveAttribute("aria-pressed", "false");
    });

    it("opens More with the keyboard and consumes Escape while restoring trigger focus", async () => {
        const user = userEvent.setup(); renderCreateForm();
        const trigger = screen.getByRole("button", { name: "transactions.moreTypes" });
        trigger.focus(); fireEvent.keyDown(trigger, { key: "ArrowDown" });
        const option = await screen.findByRole("menuitem", { name: "transactions.correction" });
        await waitFor(() => expect(option).toHaveFocus());
        expect(trigger).toHaveAttribute("aria-expanded", "true");
        await user.keyboard("{Escape}");
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(trigger).toHaveFocus();
    });

    it("submits one signed expense, guards duplicate clicks, and retains values after failure", async () => {
        let rejectSave!: (reason: unknown) => void;
        mutationState.createTransaction.mockReturnValueOnce({ unwrap: () => new Promise((_, reject) => { rejectSave = reject; }) });
        const user = userEvent.setup(); renderCreateForm();
        await user.click(screen.getByRole("button", { name: "Fill expense" }));
        await user.dblClick(screen.getByRole("button", { name: "Save expense" }));
        expect(mutationState.createTransaction).toHaveBeenCalledTimes(1);
        expect(mutationState.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ accountId: 1, categoryId: 10, amount: -12.5 }));
        rejectSave({ response: { status: 503, data: {} } });
        await waitFor(() => expect(mutationState.dispatch).toHaveBeenCalled());
        expect(screen.getByTestId("expense-amount")).toHaveTextContent("12.5");
        mutationState.createTransaction.mockReturnValueOnce({ unwrap: () => Promise.resolve() });
        await user.click(screen.getByRole("button", { name: "Save expense" }));
        expect(mutationState.createTransaction).toHaveBeenCalledTimes(2);
    });
    it("requires a correction reason and uses its dedicated endpoint without a recipient", async () => {
        const user = userEvent.setup(); renderCreateForm();
        await user.click(screen.getByRole("button", { name: "transactions.moreTypes" }));
        await user.click(screen.getByRole("menuitem", { name: "transactions.correction" }));
        await user.click(screen.getByRole("button", { name: "Set valid internal transfer" }));
        await user.click(screen.getByRole("button", { name: "transactions.saveCorrection" }));
        expect(mutationState.createCorrection).not.toHaveBeenCalled();
        expect(screen.getByText("errors.correction.reason_required")).toBeInTheDocument();
        await user.type(screen.getByLabelText("Reason"), "Cash recount #audit");
        await user.click(screen.getByRole("button", { name: "transactions.saveCorrection" }));
        expect(mutationState.createCorrection).toHaveBeenCalledWith(expect.objectContaining({ accountId: 1, amount: 25, direction: "increase", comment: "Cash recount #audit" }));
        expect(mutationState.createLinked).not.toHaveBeenCalled();
        expect(mutationState.createTransaction).not.toHaveBeenCalled();
    });
    beforeEach(() => {
        mutationState.loadDefaults.mockReturnValue({ unwrap: () => new Promise(() => undefined), unsubscribe: vi.fn() });
        mutationState.defaults = undefined;
        mutationState.defaultsFetching = false;
        mutationState.defaultsFailed = false;
        window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
        mutationState.linkedUsers = [];
        mutationState.createLinked.mockReset();
        mutationState.createLinked.mockReturnValue({ unwrap: () => Promise.resolve() });
        mutationState.createLoading = false;
        mutationState.transferLoading = false;
        mutationState.internalTransferLoading = false;
        mutationState.createTransaction.mockReset();
        mutationState.createTransfer.mockReset();
        mutationState.createCorrection.mockReset();
        mutationState.createCorrection.mockReturnValue({ unwrap: () => Promise.resolve() });
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
        await user.click(screen.getByRole("button", { name: "transactions.moreTypes" }));
        await user.click(screen.getByRole("menuitem", { name: "Internal transfer" }));
        await user.click(screen.getByRole("button", { name: "Save internal transfer" }));

        expect(screen.getByTestId("internal-transfer-form")).toBeInTheDocument();
        expect(mutationState.createInternalTransfer).not.toHaveBeenCalled();
        expect(screen.getByText("Please select a valid account")).toBeInTheDocument();
        expect(screen.getByText("errors.amount.must_be_positive")).toBeInTheDocument();
    });

    it("submits an internal transfer with the selected direction", async () => {
        const user = userEvent.setup();

        renderCreateForm();
        await user.click(screen.getByRole("button", { name: "transactions.moreTypes" }));
        await user.click(screen.getByRole("menuitem", { name: "Internal transfer" }));
        await user.click(screen.getByRole("button", { name: "Set valid internal transfer" }));
        await user.click(screen.getByRole("button", { name: "Save internal transfer" }));

        expect(mutationState.createInternalTransfer).toHaveBeenCalledWith(expect.objectContaining({
            accountId: 1,
            amount: 25,
            direction: "incoming",
            comment: "",
        }));
    });
    it("sends a selected linked user through the separate idempotent request endpoint", async () => {
        mutationState.linkedUsers = [{ id: 2, username: "Linked QA" }];
        const user = userEvent.setup(); renderCreateForm();
        await user.click(screen.getByRole("button", { name: "transactions.moreTypes" }));
        await user.click(screen.getByRole("menuitem", { name: "Internal transfer" }));
        await user.click(screen.getByRole("button", { name: "Set valid internal transfer" }));
        await user.click(screen.getByRole("combobox", { name: "" })); await user.click(screen.getByTitle("Linked QA"));
        await user.click(screen.getByRole("button", { name: "Save internal transfer" }));
        expect(mutationState.createLinked).toHaveBeenCalledWith(expect.objectContaining({ linkedUserId: 2, accountId: 1, amount: 25, direction: "incoming", submissionKey: expect.any(String) }));
        expect(mutationState.createInternalTransfer).not.toHaveBeenCalled();
    });

});

describe("TransactionCreate account recommendations", () => {
    const recommendationAccounts = [accounts[0], { ...accounts[0], id: 2, key: "bank", name: "Bank" }, { ...accounts[0], id: 3, isEnabled: false }];
    const form = () => <TransactionCreate accounts={recommendationAccounts} categories={categories} onCancel={() => undefined} onSubmit={() => undefined} />;
    const selectMode = async (label: string) => {
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: label }));
    };

    beforeEach(() => {
        mutationState.loadDefaults.mockReturnValue({ unwrap: () => Promise.resolve(), unsubscribe: vi.fn() });
        window.matchMedia = vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
        mutationState.defaults = { expenseAccountId: 1, incomeAccountId: 2 };
        mutationState.defaultsFetching = false;
        mutationState.defaultsFailed = false;
        mutationState.linkedUsers = [];
    });

    it("selects separate accounts when opening expenses and switching to income", async () => {
        render(form());
        await waitFor(() => expect(screen.getByTestId("expense-account")).toHaveTextContent("1"));
        await selectMode("Income");
        expect(screen.getByTestId("income-account")).toHaveTextContent("2");
        await selectMode("Transfer");
        await userEvent.click(screen.getByRole("button", { name: "Save transfer" }));
        expect(screen.getByText("Please select a valid source account")).toBeInTheDocument();
        expect(screen.getByText("Please select a valid destination account")).toBeInTheDocument();
        await selectMode("Expense");
        expect(screen.getByTestId("expense-account")).toHaveTextContent("1");
    });

    it.each(["Expense", "Income"])("preserves a manual %s account when a delayed response or refresh arrives", async mode => {
        mutationState.defaults = undefined;
        mutationState.defaultsFetching = true;
        const view = render(form());
        if (mode === "Income") await selectMode("Income");
        await userEvent.click(screen.getByRole("button", { name: `Choose ${mode.toLowerCase()} account` }));
        mutationState.defaults = { expenseAccountId: 1, incomeAccountId: 1 };
        mutationState.defaultsFetching = false;
        view.rerender(form());
        expect(screen.getByTestId(`${mode.toLowerCase()}-account`)).toHaveTextContent("2");
        mutationState.defaults = { expenseAccountId: null, incomeAccountId: null };
        view.rerender(form());
        expect(screen.getByTestId(`${mode.toLowerCase()}-account`)).toHaveTextContent("2");
    });

    it("waits for fresh recommendations and applies the current mode after a delayed response", async () => {
        mutationState.defaultsFetching = true;
        const view = render(form());
        expect(screen.getByTestId("expense-account")).toHaveTextContent("-1");
        await selectMode("Income");
        expect(screen.getByTestId("income-account")).toHaveTextContent("-1");
        mutationState.defaultsFetching = false;
        view.rerender(form());
        expect(screen.getByTestId("income-account")).toHaveTextContent("2");
    });

    it.each([null, 3, 999])("leaves absent, inactive or unavailable account %s unselected", async id => {
        mutationState.defaults = { expenseAccountId: id, incomeAccountId: null };
        render(form());
        await waitFor(() => expect(screen.getByTestId("expense-account")).toHaveTextContent("-1"));
    });

    it("keeps manual selection available when the recommendation request fails", async () => {
        mutationState.defaultsFailed = true;
        render(form());
        expect(screen.getByTestId("expense-account")).toHaveTextContent("-1");
        await userEvent.click(screen.getByRole("button", { name: "Choose expense account" }));
        expect(screen.getByTestId("expense-account")).toHaveTextContent("2");
    });
});
