import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TransactionEditForm from "./TransactionEditForm";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";

const mutationState = vi.hoisted(() => ({
    dispatch: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
}));

const dropdownState = vi.hoisted(() => ({
    calls: [] as Array<{
        id: string;
        items: Array<{ id: number; name: string; children?: Array<{ id: number; name: string }> }>;
        multiple?: boolean;
        onChange?: (item: { key: string; keyPath: string[] }) => void;
        placeholder?: string;
        selection?: Array<{ id: number; name: string }>;
    }>,
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
    "transactions.addComment": "Add comment",
    "transactions.hideComment": "Hide comment",
    "transactions.editDate": "Edit date",
    "transactions.correction": "Correction",
    "transactions.correctionReason": "Reason",
    "transactions.date": "Date",
    "transactions.delete": "Delete",
    "transactions.deleteConfirm": "Delete transaction?",
    "transactions.save": "Save",
    "transactions.selectAccount": "Select account",
    "transactions.selectCategory": "Select category",
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
    useDeleteTransactionMutation: () => [mutationState.deleteTransaction, { isLoading: false }],
    useUpdateTransactionMutation: () => [mutationState.updateTransaction, { isLoading: false }],
}));

vi.mock("../../components/Dropdown", () => ({
    default: (props: {
        id: string;
        items: Array<{ id: number; name: string; children?: Array<{ id: number; name: string }> }>;
        multiple?: boolean;
        onChange?: (item: { key: string; keyPath: string[] }) => void;
        placeholder?: string;
        selection?: Array<{ id: number; name: string }>;
    }) => {
        dropdownState.calls.push(props);
        return <button type="button">{props.selection?.map((item) => item.name).join(", ") || props.placeholder}</button>;
    },
}));

vi.mock("./TransactionCommentInput", async () => ({ default: (await import("antd")).Input }));

const account: AccountResponse = { id: 1, key: "wallet", name: "Active wallet", description: "", isEnabled: true, isFavourite: false, currencyId: 1, currency: "PLN" };
const category = { id: 10, key: "groceries", name: "Groceries", description: "", isEnabled: true, isSystem: false, systemCode: "", children: [] };
const record: TransactionResponse = { id: 42, accountId: 1, accountCurrency: "PLN", amount: -20, categoryId: 10, comment: "Existing comment", created: "2020-04-30", refs: [], tags: [] };

const getLatestDropdownProps = (id: string) => {
    const calls = dropdownState.calls.filter((props) => props.id === id);
    return calls[calls.length - 1];
};

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
        mutationState.deleteTransaction.mockReset();
        mutationState.deleteTransaction.mockReturnValue({ unwrap: () => Promise.resolve({}) });
        mutationState.updateTransaction.mockReturnValue({ unwrap: () => Promise.resolve({}) });
        dropdownState.calls = [];
    });

    it("keeps the signed amount and historical date when saving a comment, and follows the new field order", async () => {
        const onSuccess = vi.fn();
        const { container } = render(<TransactionEditForm accounts={[account]} categories={[category]} record={record} onMutationSuccess={onSuccess} />);
        expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("-20");
        expect(screen.getByRole("button", { name: "April 30, 2020" })).toBeInTheDocument();
        expect(Array.from(container.querySelectorAll(".ant-form-item-label label")).map(label => label.textContent)).toEqual(["Account", "Amount", "Category"]);
        fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), { target: { value: "Updated #food @family" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        await waitFor(() => expect(mutationState.updateTransaction).toHaveBeenCalledWith({
            id: 42, accountId: 1, categoryId: 10, amount: -20, comment: "Updated #food @family", created: "2020-04-30",
        }));
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(42));
    });

    it("starts an empty comment collapsed and resets its disclosure when switching records", () => {
        const view = render(<TransactionEditForm accounts={[account]} categories={[category]} record={{ ...record, comment: null }} onMutationSuccess={vi.fn()} />);
        expect(screen.queryByRole("textbox", { name: "Comment" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Add comment" }));
        fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), { target: { value: "Draft" } });
        fireEvent.click(screen.getByRole("button", { name: "Hide comment" }));
        view.rerender(<TransactionEditForm accounts={[account]} categories={[category]} record={{ ...record, id: 43, comment: "Next record" }} onMutationSuccess={vi.fn()} />);
        expect(screen.getByRole("textbox", { name: "Comment" })).toHaveValue("Next record");
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("preserves the numeric amount when changing account currency", async () => {
        const accounts = [account, { ...account, id: 2, name: "USD wallet", currency: "USD" }];
        render(<TransactionEditForm accounts={accounts} categories={[category]} record={record} onMutationSuccess={vi.fn()} />);
        act(() => getLatestDropdownProps("account").onChange?.({ key: "2", keyPath: ["2"] }));
        expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("-20");
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        await waitFor(() => expect(mutationState.updateTransaction).toHaveBeenCalledWith(expect.objectContaining({ accountId: 2, amount: -20 })));
    });

    it("keeps correction reasons visible and system categories read-only", () => {
        render(<TransactionEditForm accounts={[account]} categories={[{ ...category, isSystem: true, systemCode: "correction" }]} record={{ ...record, comment: "" }} onMutationSuccess={vi.fn()} />);
        expect(screen.getByRole("textbox", { name: "Reason" })).toHaveAttribute("maxlength", "255");
        expect(screen.getByRole("textbox", { name: "Category" })).toHaveAttribute("readonly");
        expect(screen.queryByRole("button", { name: "Add comment" })).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "-25" } });
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
        fireEvent.change(screen.getByRole("textbox", { name: "Reason" }), { target: { value: "Balance repair" } });
        expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
        fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "0" } });
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("retains the draft after update failure and allows retry", async () => {
        const onSuccess = vi.fn();
        mutationState.updateTransaction.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error("Offline")) });
        render(<TransactionEditForm accounts={[account]} categories={[category]} record={record} onMutationSuccess={onSuccess} />);
        fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), { target: { value: "Retry #tag" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        await waitFor(() => expect(mutationState.dispatch).toHaveBeenCalled());
        expect(onSuccess).not.toHaveBeenCalled();
        expect(screen.getByRole("textbox", { name: "Comment" })).toHaveValue("Retry #tag");
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(42));
    });

    it("requires confirmation before deleting and returns to the ledger after success", async () => {
        const onSuccess = vi.fn();
        render(<TransactionEditForm accounts={[account]} categories={[category]} record={record} onMutationSuccess={onSuccess} />);
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));
        expect(mutationState.deleteTransaction).not.toHaveBeenCalled();
        fireEvent.click(await screen.findByRole("button", { name: "Yes" }));
        await waitFor(() => expect(mutationState.deleteTransaction).toHaveBeenCalledWith(42));
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(null));
    });

    it("retains an archived transaction account while editing another field", async () => {
        render(
            <TransactionEditForm
                accounts={[account]}
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

    it("offers only enabled categories while retaining a disabled historical category on save", async () => {
        render(
            <TransactionEditForm
                accounts={[account]}
                categories={[
                    { id: 1, key: "food", name: "Food", description: "", isEnabled: true, isSystem: false, systemCode: "", children: [] },
                    { id: 10, key: "groceries", name: "Groceries", description: "", parentId: 1, isEnabled: true, isSystem: false, systemCode: "", children: [] },
                    { id: 11, key: "archived", name: "Archived groceries", description: "", parentId: 1, isEnabled: false, isSystem: false, systemCode: "", children: [] },
                    { id: 20, key: "archived-parent", name: "Archived parent", description: "", isEnabled: false, isSystem: false, systemCode: "", children: [] },
                    { id: 21, key: "active-child", name: "Active child", description: "", parentId: 20, isEnabled: true, isSystem: false, systemCode: "", children: [] },
                ]}
                onMutationSuccess={vi.fn()}
                record={{ id: 42, accountId: 1, accountCurrency: "PLN", amount: -20, categoryId: 11, comment: "Existing comment", created: "2026-04-30", refs: [], tags: [] }}
            />,
        );

        await screen.findByRole("button", { name: "Archived groceries" });

        const categoryDropdown = getLatestDropdownProps("category");
        expect(categoryDropdown.items).toEqual([
            expect.objectContaining({
                id: 1,
                children: [expect.objectContaining({ id: 10, name: "Groceries" })],
            }),
            expect.objectContaining({ id: 21, name: "Active child" }),
            expect.objectContaining({ id: 0, name: "System" }),
        ]);
        expect(categoryDropdown.selection).toEqual([expect.objectContaining({ id: 11, name: "Archived groceries" })]);
        expect(categoryDropdown.placeholder).toBe("Select category");
        expect(categoryDropdown.multiple).toBe(false);

        fireEvent.change(screen.getByDisplayValue("Existing comment"), { target: { value: "Updated comment" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(mutationState.updateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            categoryId: 11,
            comment: "Updated comment",
            id: 42,
        })));
    });

    it("saves a newly selected enabled category", async () => {
        render(
            <TransactionEditForm
                accounts={[account]}
                categories={[
                    { id: 1, key: "food", name: "Food", description: "", isEnabled: true, isSystem: false, systemCode: "", children: [] },
                    { id: 10, key: "groceries", name: "Groceries", description: "", parentId: 1, isEnabled: true, isSystem: false, systemCode: "", children: [] },
                    { id: 11, key: "archived", name: "Archived groceries", description: "", parentId: 1, isEnabled: false, isSystem: false, systemCode: "", children: [] },
                    { id: 20, key: "archived-parent", name: "Archived parent", description: "", isEnabled: false, isSystem: false, systemCode: "", children: [] },
                    { id: 21, key: "active-child", name: "Active child", description: "", parentId: 20, isEnabled: true, isSystem: false, systemCode: "", children: [] },
                ]}
                onMutationSuccess={vi.fn()}
                record={{ id: 42, accountId: 1, accountCurrency: "PLN", amount: -20, categoryId: 11, comment: "Existing comment", created: "2026-04-30", refs: [], tags: [] }}
            />,
        );

        await screen.findByRole("button", { name: "Archived groceries" });
        act(() => {
            getLatestDropdownProps("category").onChange?.({ key: "10", keyPath: ["category", "1", "10"] });
        });
        await screen.findByRole("button", { name: "Groceries" });

        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(mutationState.updateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            categoryId: 10,
            id: 42,
        })));

        act(() => {
            getLatestDropdownProps("category").onChange?.({ key: "21", keyPath: ["category", "21"] });
        });
        await screen.findByRole("button", { name: "Active child" });

        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(mutationState.updateTransaction).toHaveBeenLastCalledWith(expect.objectContaining({
            categoryId: 21,
            id: 42,
        })));
    });
});
