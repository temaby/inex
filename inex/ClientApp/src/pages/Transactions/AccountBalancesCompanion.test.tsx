import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AccountSummary } from "../../store/accounts/accounts-api";
import AccountBalancesCompanion from "./AccountBalancesCompanion";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => ({
            "primitives.kindLabel.neutral": "Neutral",
            "transactions.accountBalances": "Account balances",
            "transactions.accountBalancesEmpty": "No active accounts to display.",
            "transactions.accountBalancesError": "Could not load account balances.",
            "transactions.accountBalancesLoading": "Loading account balances",
            "transactions.error.retry": "Retry",
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

describe("AccountBalancesCompanion", () => {
    it("shows active native balances, including zero balances, without a converted total", () => {
        render(<AccountBalancesCompanion accounts={accounts} isError={false} isLoading={false} onRetry={vi.fn()} />);

        expect(screen.getByRole("region", { name: "Account balances" })).toBeInTheDocument();
        expect(screen.getByText("Emergency reserve for long-term household commitments")).toBeVisible();
        expect(screen.getByRole("text", { name: "Neutral: 0.00 PLN" })).toBeVisible();
        expect(screen.queryByText("Total")).not.toBeInTheDocument();
    });

    it("keeps loading and empty states local to the companion", () => {
        const { rerender } = render(<AccountBalancesCompanion accounts={[]} isError={false} isLoading onRetry={vi.fn()} />);

        expect(screen.getByRole("status")).toHaveTextContent("Loading account balances");

        rerender(<AccountBalancesCompanion accounts={[]} isError={false} isLoading={false} onRetry={vi.fn()} />);
        expect(screen.getByRole("status")).toHaveTextContent("No active accounts to display.");
    });

    it("shows a retry action after a failed account summary request", () => {
        const onRetry = vi.fn();
        render(<AccountBalancesCompanion accounts={[]} isError isLoading={false} onRetry={onRetry} />);

        expect(screen.getByRole("alert")).toHaveTextContent("Could not load account balances.");
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(onRetry).toHaveBeenCalledOnce();
    });
});
