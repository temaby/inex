import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance, type i18n } from "i18next";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../../public/locales/en/translation.json";
import ru from "../../../public/locales/ru/translation.json";
import type { AccountSummary } from "../../store/accounts/accounts-api";
import AccountBalancesCompanion from "./AccountBalancesCompanion";

let translations: i18n;
beforeEach(async () => {
    translations = createInstance();
    await translations.init({ lng: "en", fallbackLng: "en", resources: { en: { translation: en }, ru: { translation: ru } }, interpolation: { escapeValue: false } });
});

const accounts: AccountSummary[] = [{
    id: 1,
    key: "zero-balance",
    name: "Emergency reserve for long-term household commitments",
    description: null,
    isEnabled: true,
    isFavourite: true,
    currencyId: 1,
    currency: "PLN",
    value: 0,
    thisMonthNet: 0,
}];

const renderCompanion = (overrides: Partial<React.ComponentProps<typeof AccountBalancesCompanion>> = {}) => {
    const props: React.ComponentProps<typeof AccountBalancesCompanion> = {
        accounts,
        baseCurrency: "USD",
        conversion: { value: 0, isComplete: true, unavailableCurrencies: [] },
        isError: false,
        isExpanded: true,
        isLoading: false,
        isPinned: false,
        selectedAccountIds: [],
        onAccountToggle: vi.fn(),
        onExpandedChange: vi.fn(),
        onPinChange: vi.fn(),
        onRetry: vi.fn(),
        variant: "inline",
        visibleAccountCount: accounts.length,
        ...overrides,
    };
    const view = (nextProps: typeof props) => <I18nextProvider i18n={translations}><MemoryRouter><AccountBalancesCompanion {...nextProps} /></MemoryRouter></I18nextProvider>;
    const rendered = render(view(props));
    return { props, ...rendered, rerenderCompanion: (nextProps: Partial<typeof props>) => rendered.rerender(view({ ...props, ...nextProps })) };
};

describe("AccountBalancesCompanion", () => {
    it("shows native zero, positive and negative balances without positive signs or expense semantics", () => {
        renderCompanion({ accounts: [...accounts,
            { ...accounts[0], id: 2, name: "Current", currency: "USD", value: 100 },
            { ...accounts[0], id: 3, name: "Credit", currency: "EUR", value: -42.5 },
        ], visibleAccountCount: 3 });
        expect(screen.getByRole("region", { name: "Favorite accounts" })).toBeInTheDocument();
        expect(screen.getByText("3 accounts")).toBeVisible();
        expect(screen.getByRole("text", { name: "Amount: 0.00 PLN" })).toBeVisible();
        expect(screen.getByRole("text", { name: "Amount: 100.00 USD" })).toBeVisible();
        expect(screen.getByRole("text", { name: "Amount: -42.50 EUR" })).toBeVisible();
        expect(screen.getByText("Total in favorites")).toBeVisible();
        expect(screen.getByRole("text", { name: "Amount: 0.00 USD" })).toBeVisible();
        expect(screen.getByRole("list").nextElementSibling).toHaveTextContent("Total in favorites");
        expect(screen.getByText("0.00 PLN").closest(".transactions-account-balances__amount--zero")).toBeInTheDocument();
    });

    it("keeps account selection controlled and uses the same callback for pointer and keyboard", async () => {
        const user = userEvent.setup();
        const { props, rerenderCompanion } = renderCompanion();
        const row = screen.getByRole("button", { name: /Emergency reserve/ });
        expect(row).toHaveAttribute("aria-pressed", "false");
        await user.click(row);
        expect(props.onAccountToggle).toHaveBeenLastCalledWith(1);
        expect(row).toHaveAttribute("aria-pressed", "false");
        rerenderCompanion({ selectedAccountIds: [1, 99] });
        expect(row).toHaveAttribute("aria-pressed", "true");
        row.focus();
        await user.keyboard("{Enter} ");
        expect(props.onAccountToggle).toHaveBeenCalledTimes(3);
        rerenderCompanion({ selectedAccountIds: [99] });
        expect(row).toHaveAttribute("aria-pressed", "false");
        expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    it("provides keyboard-accessible pin actions in the compact menu and preserves collapse", async () => {
        const user = userEvent.setup();
        const onFocusChange = vi.fn();
        const { props } = renderCompanion({ isPinned: true, onFocusChange });
        const collapse = screen.getByRole("button", { name: "Collapse" });
        expect(collapse).toHaveAttribute("aria-expanded", "true");
        fireEvent.click(collapse);
        expect(props.onExpandedChange).toHaveBeenCalledOnce();
        const trigger = screen.getByRole("button", { name: "Favorite accounts actions" });
        expect(trigger).toHaveAttribute("id", "transactions-account-balances-pin-control");
        trigger.focus();
        await user.keyboard("{ArrowDown}");
        const unpin = await screen.findByRole("menuitem", { name: "Unpin panel" });
        expect(trigger).toHaveAttribute("aria-expanded", "true");
        act(() => unpin.focus());
        fireEvent.keyDown(unpin, { key: "Enter", keyCode: 13, which: 13 });
        expect(props.onPinChange).toHaveBeenCalledOnce();
        expect(onFocusChange).toHaveBeenLastCalledWith(true);
    });

    it("offers pinning from an unpinned drawer and shows its count", async () => {
        const user = userEvent.setup();
        const { props } = renderCompanion({ variant: "drawer" });
        expect(screen.getByText("1 account")).toBeVisible();
        expect(screen.queryByRole("button", { name: "Collapse" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Favorite accounts actions" }));
        await user.click(await screen.findByRole("menuitem", { name: "Pin panel" }));
        expect(props.onPinChange).toHaveBeenCalledOnce();
    });

    it("dismisses the menu with Escape without bubbling to the surrounding drawer", async () => {
        const user = userEvent.setup();
        renderCompanion({ variant: "drawer" });
        const trigger = screen.getByRole("button", { name: "Favorite accounts actions" });
        await user.click(trigger);
        const pin = await screen.findByRole("menuitem", { name: "Pin panel" });
        const ancestorKeyDown = vi.fn();
        document.addEventListener("keydown", ancestorKeyDown);
        try {
            fireEvent.keyDown(pin, { key: "Escape", keyCode: 27 });
            expect(trigger).toHaveAttribute("aria-expanded", "false");
            expect(trigger).toHaveFocus();
            expect(ancestorKeyDown).not.toHaveBeenCalled();
        } finally {
            document.removeEventListener("keydown", ancestorKeyDown);
        }
    });

    it("retains loading and error recovery without rendering stale balances", async () => {
        const { props, rerenderCompanion } = renderCompanion({ isLoading: true });
        expect(screen.getByRole("status")).toHaveTextContent("Loading account balances");
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
        rerenderCompanion({ isError: true, isLoading: false });
        expect(screen.getByRole("alert")).toHaveTextContent("Could not load account balances.");
        expect(screen.queryByText(accounts[0].name)).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(props.onRetry).toHaveBeenCalledOnce();
    });

    it("shows conversion loading and unavailable totals without partial values, with independent retry", async () => {
        const onConversionRetry = vi.fn();
        const { rerenderCompanion } = renderCompanion({ conversion: { value: 123, isComplete: false, unavailableCurrencies: ["PLN"] }, isConversionLoading: true, onConversionRetry });
        expect(screen.getByRole("status")).toHaveTextContent("Converting balances");
        expect(screen.queryByText("123.00 USD")).not.toBeInTheDocument();
        rerenderCompanion({ conversion: { value: 123, isComplete: false, unavailableCurrencies: ["PLN"] }, isConversionLoading: false, onConversionRetry });
        expect(screen.getByText("N/A")).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("A cached conversion is unavailable for: PLN.");
        await userEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(onConversionRetry).toHaveBeenCalledOnce();
    });

    it.each(["inline", "rail", "drawer"] as const)("provides Accounts navigation for empty favorites in the %s presentation", (variant) => {
        renderCompanion({ accounts: [], visibleAccountCount: 0, variant });
        expect(screen.getByRole("status")).toHaveTextContent("Add accounts to favorites to see their balances here.");
        expect(screen.getByRole("link", { name: "All accounts" })).toHaveAttribute("href", "/accounts");
        expect(screen.queryByText("Total in favorites")).not.toBeInTheDocument();
    });

    it("renders every provided favorite with long names and complete large native amounts", () => {
        renderCompanion({ accounts: Array.from({ length: 12 }, (_, index) => ({ ...accounts[0], id: index + 1, name: `Проценты с Visa UZS ${index}`, currency: "UZS", value: 190860318.79 })), visibleAccountCount: 12 });
        const list = screen.getByRole("list");
        expect(within(list).getAllByRole("button")).toHaveLength(12);
        expect(within(list).getAllByRole("text", { name: "Amount: 190,860,318.79 UZS" })).toHaveLength(12);
    });

    it.each([[1, "1 счёт"], [3, "3 счёта"], [5, "5 счетов"]])("localizes Russian favorite count %s", async (count, label) => {
        await translations.changeLanguage("ru");
        renderCompanion({ visibleAccountCount: Number(count) });
        expect(screen.getByRole("region", { name: "Избранные счета" })).toBeVisible();
        expect(screen.getByText(label)).toBeVisible();
        expect(screen.getByText("Всего на избранных")).toBeVisible();
        expect(screen.getByRole("link", { name: "Все счета" })).toHaveAttribute("href", "/accounts");
    });
});
