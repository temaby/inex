import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountCreateForm from "./AccountCreateForm";
import AccountEditForm from "./AccountEditForm";

const mutationState = vi.hoisted(() => ({
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
}));
const apiClientMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("../../store/accounts/accounts-api", () => ({
    useCreateAccountMutation: () => [mutationState.createAccount, { isLoading: false }],
    useDeleteAccountMutation: () => [vi.fn(), { isLoading: false }],
    useUpdateAccountMutation: () => [mutationState.updateAccount, { isLoading: false }],
}));

vi.mock("../../utils/apiClient", () => ({ default: apiClientMock }));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => ({
            "accounts.active": "Active",
            "accounts.cancel": "Cancel",
            "accounts.createAccount": "Create account",
            "accounts.currency": "Currency",
            "accounts.currencyPlaceholder": "Select currency",
            "accounts.delete": "Delete",
            "accounts.deleteConfirm": "Delete account?",
            "accounts.description": "Description",
            "accounts.descriptionPlaceholder": "Optional description",
            "accounts.disabled": "Disabled",
            "accounts.formErrors.currencyRequired": "Currency is required",
            "accounts.formErrors.nameRequired": "Name is required",
            "accounts.name": "Name",
            "accounts.namePlaceholder": "Account name",
            "accounts.transactionsOverviewHidden": "Hidden",
            "accounts.transactionsOverviewVisibility": "Transactions overview visibility",
            "accounts.transactionsOverviewVisible": "Visible",
            "accounts.update": "Update",
        }[key] ?? key),
    }),
}));

const selectCurrency = async () => {
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Currency" }));
    await screen.findByText("USD - US Dollar");
    fireEvent.click(screen.getByText("USD - US Dollar"));
};

describe("account Transactions overview visibility", () => {
    beforeEach(() => {
        Object.defineProperty(window, "matchMedia", {
            configurable: true,
            value: vi.fn().mockReturnValue({
                addEventListener: vi.fn(),
                matches: true,
                removeEventListener: vi.fn(),
            }),
        });
        apiClientMock.get.mockResolvedValue({ data: [{ id: 1, key: "USD", name: "US Dollar" }] });
        mutationState.createAccount.mockReset();
        mutationState.createAccount.mockReturnValue({ unwrap: () => Promise.resolve() });
        mutationState.updateAccount.mockReset();
        mutationState.updateAccount.mockReturnValue({ unwrap: () => Promise.resolve() });
    });

    it("defaults new accounts to visible and submits a chosen hidden setting", async () => {
        render(<AccountCreateForm onCancel={vi.fn()} onCreated={vi.fn()} />);

        expect(screen.getByText("Transactions overview visibility")).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Visible" })).toBeChecked();
        fireEvent.click(screen.getByRole("radio", { name: "Hidden" }));
        fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Travel cash" } });
        await selectCurrency();
        fireEvent.click(screen.getByRole("button", { name: "Create account" }));

        await waitFor(() => expect(mutationState.createAccount).toHaveBeenCalledWith(expect.objectContaining({
            isVisibleInTransactions: false,
            name: "Travel cash",
        })));
    });

    it("hydrates, labels, and saves the edited visibility setting", async () => {
        render(<AccountEditForm record={{
            id: 7,
            key: "cash",
            name: "Cash",
            description: null,
            isEnabled: true,
            isVisibleInTransactions: false,
            currencyId: 1,
            currency: "USD",
        }} />);

        expect(screen.getByText("Transactions overview visibility")).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Hidden" })).toBeChecked();
        fireEvent.click(screen.getByRole("radio", { name: "Visible" }));
        fireEvent.click(screen.getByRole("button", { name: "Update" }));

        await waitFor(() => expect(mutationState.updateAccount).toHaveBeenCalledWith(expect.objectContaining({
            id: 7,
            isVisibleInTransactions: true,
        })));
    });
});
