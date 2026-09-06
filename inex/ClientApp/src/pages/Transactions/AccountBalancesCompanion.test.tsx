import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AccountSummary } from "../../store/accounts/accounts-api";
import AccountBalancesCompanion from "./AccountBalancesCompanion";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, params?: Record<string, string>) => ({
            "primitives.kindLabel.neutral": "Neutral",
            "transactions.accountBalances": "Account balances",
            "transactions.accountBalancesCollapse": "Collapse",
            "transactions.accountBalancesConversionDetail": `A cached conversion is unavailable for: ${params?.currencies ?? ""}.`,
            "transactions.accountBalancesConversionUnavailable": "The total is unavailable because a cached conversion is missing.",
            "transactions.accountBalancesEmpty": "No active accounts to display.",
            "transactions.accountBalancesError": "Could not load account balances.",
            "transactions.accountBalancesExpand": "Expand",
            "transactions.accountBalancesLoading": "Loading account balances",
            "transactions.accountBalancesNoneSelected": "Choose at least one account to show balances.",
            "transactions.accountBalancesSummary": "1 active account",
            "transactions.error.retry": "Retry",
            "transactions.kpi.notAvailable": "N/A",
            "transactions.summaryTotal": "Total",
        }[key] ?? key),
    }),
}));

const accounts: AccountSummary[] = [
    {
        id: 1,
        key: "zero-balance",
        name: "Emergency reserve for long-term household commitments",
        description: null,
        isEnabled: true,
        currencyId: 1,
        currency: "PLN",
        value: 0,
        thisMonthNet: 0,
    },
];

const props = {
    activeAccountCount: accounts.length,
    accounts,
    baseCurrency: "USD",
    conversion: { value: 0, isComplete: true, unavailableCurrencies: [] },
    hasDisplaySelection: true,
    isError: false,
    isExpanded: true,
    isLoading: false,
    onDisplayAccountIdsChange: vi.fn(),
    onExpandedChange: vi.fn(),
    onRetry: vi.fn(),
};

describe("AccountBalancesCompanion", () => {
    it("shows selected native balances and a complete trusted total", () => {
        render(<AccountBalancesCompanion {...props} />);

        expect(screen.getByRole("region", { name: "Account balances" })).toBeInTheDocument();
        expect(screen.queryByText("Emergency reserve for long-term household commitments")).not.toBeInTheDocument();
        expect(screen.queryByRole("text", { name: "Neutral: 0.00 PLN" })).not.toBeInTheDocument();
        expect(screen.getByText("Total")).toBeVisible();
        expect(screen.getByRole("text", { name: "Neutral: 0.00 USD" })).toBeVisible();
    });

    it("keeps loading and empty states local to the companion", () => {
        const { rerender } = render(<AccountBalancesCompanion {...props} accounts={[]} isLoading />);

        expect(screen.getByRole("status")).toHaveTextContent("Loading account balances");

        rerender(<AccountBalancesCompanion {...props} accounts={[]} isLoading={false} />);
        expect(screen.getByRole("status")).toHaveTextContent("Choose at least one account to show balances.");
    });

    it("shows a retry action after a failed account summary request", () => {
        const onRetry = vi.fn();
        render(<AccountBalancesCompanion {...props} accounts={[]} isError onRetry={onRetry} />);

        expect(screen.getByRole("alert")).toHaveTextContent("Could not load account balances.");
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it("marks a total unavailable instead of displaying the partial converted amount", () => {
        render(<AccountBalancesCompanion {...props} conversion={{ value: 20, isComplete: false, unavailableCurrencies: ["EUR"] }} />);

        expect(screen.getByLabelText("The total is unavailable because a cached conversion is missing.")).toHaveTextContent("N/A");
        expect(screen.getByRole("status")).toHaveTextContent("EUR");
        expect(screen.queryByRole("text", { name: "Neutral: 20.00 USD" })).not.toBeInTheDocument();
    });
});
