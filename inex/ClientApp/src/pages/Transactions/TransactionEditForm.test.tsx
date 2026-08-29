import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TransactionEditForm from "./TransactionEditForm";

const mutationState = vi.hoisted(() => ({
    dispatch: vi.fn(),
    updateTransaction: vi.fn(),
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
    useDeleteTransactionMutation: () => [vi.fn(), { isLoading: false }],
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
        mutationState.updateTransaction.mockReturnValue({ unwrap: () => Promise.resolve({}) });
        dropdownState.calls = [];
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

    it("offers only enabled categories while retaining a disabled historical category on save", async () => {
        render(
            <TransactionEditForm
                accounts={[{ id: 1, name: "Active wallet", currency: "PLN" }]}
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
                accounts={[{ id: 1, name: "Active wallet", currency: "PLN" }]}
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
