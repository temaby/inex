import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { AccountSummary } from "../../store/accounts/accounts-api";
import AccountBalancesCompanion from "./AccountBalancesCompanion";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, values?: { count?: number; currencies?: string }) => ({
            "primitives.kindLabel.neutral": "Neutral",
            "transactions.accountBalances": "Account balances",
            "transactions.accountBalancesSummary": `${values?.count ?? 0} accounts`,
            "transactions.accountBalancesEmpty": "No active accounts to display.",
            "transactions.accountBalancesError": "Could not load account balances.",
            "transactions.accountBalancesLoading": "Loading account balances",
            "transactions.accountBalancesCollapse": "Collapse",
            "transactions.accountBalancesExpand": "Expand",
            "transactions.accountBalancesPin": "Pin overview",
            "transactions.accountBalancesUnpin": "Unpin overview",
            "transactions.accountBalancesOpenAccounts": "Open Accounts",
            "transactions.accountBalancesConversionUnavailable": "Conversion unavailable",
            "transactions.accountBalancesConversionDetail": `Missing rate for ${values?.currencies ?? ""}`,
            "transactions.summaryTotal": "TOTAL",
            "transactions.kpi.notAvailable": "N/A",
            "transactions.error.retry": "Retry",
        }[key] ?? key),
    }),
}));

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
        onExpandedChange: vi.fn(),
        onPinChange: vi.fn(),
        onRetry: vi.fn(),
        variant: "inline",
        visibleAccountCount: accounts.length,
        ...overrides,
    };

    return { props, ...render(<MemoryRouter><AccountBalancesCompanion {...props} /></MemoryRouter>) };
};

describe("AccountBalancesCompanion", () => {
    it("shows visible native balances and a complete overview total", () => {
        renderCompanion();

        expect(screen.getByRole("region", { name: "Account balances" })).toBeInTheDocument();
        expect(screen.getByText("Emergency reserve for long-term household commitments")).toBeVisible();
        expect(screen.getByRole("text", { name: "Neutral: 0.00 PLN" })).toBeVisible();
        expect(screen.getByText("TOTAL")).toBeVisible();
        expect(screen.getByRole("text", { name: "Neutral: 0.00 USD" })).toBeVisible();
    });

    it("exposes keyboard-operable collapse and pin controls with their current states", () => {
        const onExpandedChange = vi.fn();
        const onPinChange = vi.fn();
        renderCompanion({ onExpandedChange, onPinChange, isPinned: true });

        const collapse = screen.getByRole("button", { name: "Collapse" });
        const unpin = screen.getByRole("button", { name: "Unpin overview" });
        expect(collapse).toHaveAttribute("aria-expanded", "true");
        expect(unpin).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(collapse);
        fireEvent.click(unpin);
        expect(onExpandedChange).toHaveBeenCalledOnce();
        expect(onPinChange).toHaveBeenCalledOnce();
    });

    it("keeps loading, unavailable conversion, and error states local to the overview", () => {
        const { rerender } = renderCompanion({ accounts: [], isLoading: true, visibleAccountCount: 0 });
        expect(screen.getByRole("status")).toHaveTextContent("Loading account balances");

        rerender(<MemoryRouter><AccountBalancesCompanion
            accounts={accounts}
            baseCurrency="USD"
            conversion={{ value: 0, isComplete: false, unavailableCurrencies: ["PLN"] }}
            isError={false}
            isExpanded
            isLoading={false}
            isPinned={false}
            onExpandedChange={vi.fn()}
            onPinChange={vi.fn()}
            onRetry={vi.fn()}
            variant="inline"
            visibleAccountCount={1}
        /></MemoryRouter>);
        expect(screen.getByText("N/A")).toBeVisible();
        expect(screen.getByRole("status")).toHaveTextContent("Missing rate for PLN");

        rerender(<MemoryRouter><AccountBalancesCompanion
            accounts={[]}
            baseCurrency="USD"
            conversion={{ value: 0, isComplete: true, unavailableCurrencies: [] }}
            isError
            isExpanded
            isLoading={false}
            isPinned={false}
            onExpandedChange={vi.fn()}
            onPinChange={vi.fn()}
            onRetry={vi.fn()}
            variant="inline"
            visibleAccountCount={0}
        /></MemoryRouter>);
        expect(screen.getByRole("alert")).toHaveTextContent("Could not load account balances.");
    });

    it("renders the Accounts link only in the desktop rail", () => {
        renderCompanion({ variant: "rail" });
        expect(screen.getByRole("link", { name: "Open Accounts" })).toHaveAttribute("href", "/accounts");
        expect(screen.queryByRole("button", { name: "Collapse" })).not.toBeInTheDocument();
    });
});
