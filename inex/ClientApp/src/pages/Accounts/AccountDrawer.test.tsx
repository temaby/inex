import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import translations from "../../../public/locales/en/translation.json";
import AccountDrawer, { type AccountDrawerSession } from "./AccountDrawer";

const mutationState = vi.hoisted(() => ({
    createAccount: vi.fn(),
    deleteAccount: vi.fn(),
    updateAccount: vi.fn(),
}));

vi.mock("../../store/accounts/accounts-api", () => ({
    useCreateAccountMutation: () => [mutationState.createAccount, { isLoading: false }],
    useDeleteAccountMutation: () => [mutationState.deleteAccount, { isLoading: false }],
    useUpdateAccountMutation: () => [mutationState.updateAccount, { isLoading: false }],
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const value = key.split(".").reduce<unknown>((current, part) => (
                current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined
            ), translations);
            return typeof value === "string" ? value : key;
        },
    }),
}));

const selectCurrency = async (label: string) => {
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Currency" }));
    fireEvent.click(await screen.findByText(label));
};

const editSession: AccountDrawerSession = {
    mode: "edit",
    account: {
        id: 7,
        key: "cash",
        name: "Cash",
        description: null,
        isEnabled: true,
        isFavourite: false,
        currencyId: 1,
        currency: "USD",
        baseValue: 50,
        thisMonthNetBase: 10,
    },
};

const renderDrawer = (session: AccountDrawerSession) => {
    const onClose = vi.fn();
    const onMutationSuccess = vi.fn();
    render(<AccountDrawer
        afterOpenChange={vi.fn()}
        currencies={[
            { id: 1, key: "USD", name: "US Dollar" },
            { id: 2, key: "EUR", name: "Euro" },
        ]}
        currencyStatus="ready"
        onClose={onClose}
        onMutationSuccess={onMutationSuccess}
        onRetryCurrencies={vi.fn()}
        open
        session={session}
    />);
    return { onClose, onMutationSuccess };
};

describe("Account drawer", () => {
    beforeEach(() => {
        vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
        for (const mutation of Object.values(mutationState)) {
            mutation.mockReset();
            mutation.mockReturnValue({ unwrap: () => Promise.resolve() });
        }
    });

    it("defaults new accounts to favourite and submits a chosen non-favourite setting", async () => {
        const { onMutationSuccess } = renderDrawer({ mode: "create" });

        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
        expect(screen.getByRole("switch", { name: "Active account" })).toBeChecked();
        const overview = screen.getByRole("switch", { name: "Show in overviews" });
        expect(overview).toBeChecked();
        fireEvent.click(overview);
        fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Travel cash" } });
        await selectCurrency("USD - US Dollar");
        fireEvent.click(screen.getByRole("button", { name: "Create" }));

        await waitFor(() => expect(mutationState.createAccount).toHaveBeenCalledWith({
            currencyId: 1,
            description: "",
            key: "travel-cash",
            isEnabled: true,
            isFavourite: false,
            name: "Travel cash",
        }));
        expect(onMutationSuccess).toHaveBeenCalledWith("create");
    });

    it("hydrates, labels, and saves the edited account settings", async () => {
        const { onMutationSuccess } = renderDrawer(editSession);
        const active = screen.getByRole("switch", { name: "Active account" });
        const overview = screen.getByRole("switch", { name: "Show in overviews" });
        const save = screen.getByRole("button", { name: "Save" });
        expect(active).toBeChecked();
        expect(overview).not.toBeChecked();
        expect(save).toBeDisabled();
        fireEvent.click(active);
        fireEvent.click(overview);
        fireEvent.click(save);

        await waitFor(() => expect(mutationState.updateAccount).toHaveBeenCalledWith(expect.objectContaining({
            id: 7,
            key: "cash",
            currencyId: 1,
            isEnabled: false,
            isFavourite: true,
        })));
        expect(onMutationSuccess).toHaveBeenCalledWith("update");
    });

    it("validates the required fields before creating an account", async () => {
        renderDrawer({ mode: "create" });
        fireEvent.click(screen.getByRole("button", { name: "Create" }));
        expect(await screen.findByText("Name is required")).toBeVisible();
        expect(await screen.findByText("Currency is required")).toBeVisible();
        expect(mutationState.createAccount).not.toHaveBeenCalled();
    });

    it("confirms before discarding a draft and closes directly after changes are reverted", async () => {
        const { onClose } = renderDrawer(editSession);
        const user = userEvent.setup();
        const name = screen.getByRole("textbox", { name: "Name" });
        await user.type(name, " wallet");
        fireEvent.keyDown(name, { key: "Escape", keyCode: 27 });
        const discard = (await screen.findByText("Discard unsaved account changes?")).closest<HTMLElement>("[role=dialog]");
        if (!discard) throw new Error("Missing discard dialog");
        await user.click(within(discard).getByRole("button", { name: "Keep editing" }));
        expect(name).toHaveValue("Cash wallet");
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.change(name, { target: { value: "Cash" } });
        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("blocks duplicate requests and retains a currency change rejected by the API", async () => {
        const { onMutationSuccess } = renderDrawer(editSession);
        let rejectUpdate: (reason: unknown) => void = () => undefined;
        mutationState.updateAccount.mockReturnValueOnce({ unwrap: () => new Promise((_, reject) => { rejectUpdate = reject; }) });
        await selectCurrency("EUR - Euro");
        const save = screen.getByRole("button", { name: "Save" });
        fireEvent.click(save);
        await waitFor(() => expect(mutationState.updateAccount).toHaveBeenCalledOnce());
        fireEvent.click(save);
        await act(async () => rejectUpdate({ data: { rule: "internal-transfer-pending" } }));
        expect(mutationState.updateAccount).toHaveBeenCalledOnce();
        expect(screen.getByRole("alert")).toHaveTextContent(translations.errors["internal-transfer-pending"]);
        expect(within(screen.getByRole("dialog")).getByTitle("EUR - Euro")).toBeVisible();
        expect(onMutationSuccess).not.toHaveBeenCalled();
    });

    it.each([
        { outcome: "successful deletion", blocked: false },
        { outcome: "a pending internal transfer", blocked: true },
    ])("handles $outcome only after delete confirmation", async ({ blocked }) => {
        if (blocked) {
            mutationState.deleteAccount.mockReturnValueOnce({
                unwrap: () => Promise.reject({ data: { rule: "internal-transfer-pending" } }),
            });
        }
        const { onMutationSuccess } = renderDrawer(editSession);
        const user = userEvent.setup();
        const trigger = screen.getByRole("button", { name: "Delete" });
        const footer = trigger.closest(".ant-drawer-footer");
        expect(footer).toContainElement(screen.getByRole("button", { name: "Cancel" }));
        expect(footer).toContainElement(screen.getByRole("button", { name: "Save" }));

        await user.click(trigger);
        await screen.findByText(translations.accounts.deleteConfirm);
        await user.click(screen.getAllByRole("button", { name: "Cancel" })[1]);
        await waitFor(() => expect(screen.queryByText(translations.accounts.deleteConfirm)).not.toBeVisible());
        expect(mutationState.deleteAccount).not.toHaveBeenCalled();

        await user.click(trigger);
        await user.click((await screen.findAllByRole("button", { name: "Delete" }))[1]);
        await waitFor(() => expect(mutationState.deleteAccount).toHaveBeenCalledWith(7));
        if (blocked) {
            expect(await screen.findByRole("alert")).toHaveTextContent(translations.errors["internal-transfer-pending"]);
            expect(onMutationSuccess).not.toHaveBeenCalled();
        } else {
            expect(onMutationSuccess).toHaveBeenCalledWith("delete");
        }
    });
});
