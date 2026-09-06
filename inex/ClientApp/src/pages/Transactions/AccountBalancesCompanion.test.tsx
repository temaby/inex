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
            "transactions.accountBalancesCollapse": "Collapse",
            "transactions.accountBalancesEmpty": "No active accounts to display.",
            "transactions.accountBalancesError": "Could not load account balances.",
            "transactions.accountBalancesExpand": "Expand",
            "transactions.accountBalancesLoading": "Loading account balances",
            "transactions.accountBalancesOpenAccounts": "Open Accounts",
            "transactions.accountBalancesPin": "Pin overview",
            "transactions.accountBalancesSummary": "1 active account",
            "transactions.accountBalancesUnpin": "Unpin overview",
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
        render(
            <AccountBalancesCompanion
                activeAccountCount={accounts.length}
                accounts={accounts}
                isError={false}
                isExpanded
                isLoading={false}
                isPinned={false}
                onExpandedChange={vi.fn()}
                onPinChange={vi.fn()}
                onRetry={vi.fn()}
                onSelectAccount={vi.fn()}
                selectedAccountIds={[]}
            />,
        );

        expect(screen.getByRole("region", { name: "Account balances" })).toBeInTheDocument();
        expect(screen.getByText("Emergency reserve for long-term household commitments")).toBeVisible();
        expect(screen.getByRole("text", { name: "Neutral: 0.00 PLN" })).toBeVisible();
        expect(screen.queryByText("Total")).not.toBeInTheDocument();
    });

    it("keeps loading and empty states local to the companion", () => {
        const props = {
            activeAccountCount: 0,
            isError: false,
            isExpanded: true,
            isPinned: false,
            onExpandedChange: vi.fn(),
            onPinChange: vi.fn(),
            onRetry: vi.fn(),
            onSelectAccount: vi.fn(),
            selectedAccountIds: [],
        };
        const { rerender } = render(<AccountBalancesCompanion accounts={[]} isLoading {...props} />);

        expect(screen.getByRole("status")).toHaveTextContent("Loading account balances");

        rerender(<AccountBalancesCompanion accounts={[]} isLoading={false} {...props} />);
        expect(screen.getByRole("status")).toHaveTextContent("No active accounts to display.");
    });

    it("shows a retry action after a failed account summary request", () => {
        const onRetry = vi.fn();
        render(
            <AccountBalancesCompanion
                activeAccountCount={0}
                accounts={[]}
                isError
                isExpanded
                isLoading={false}
                isPinned={false}
                onExpandedChange={vi.fn()}
                onPinChange={vi.fn()}
                onRetry={onRetry}
                onSelectAccount={vi.fn()}
                selectedAccountIds={[]}
            />,
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Could not load account balances.");
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(onRetry).toHaveBeenCalledOnce();
    });

    it("exposes labelled expand, pin, and account filter controls", () => {
        const onExpandedChange = vi.fn();
        const onPinChange = vi.fn();
        const onSelectAccount = vi.fn();
        render(
            <AccountBalancesCompanion
                activeAccountCount={accounts.length}
                accounts={accounts}
                isError={false}
                isExpanded={false}
                isLoading={false}
                isPinned={false}
                onExpandedChange={onExpandedChange}
                onPinChange={onPinChange}
                onRetry={vi.fn()}
                onSelectAccount={onSelectAccount}
                selectedAccountIds={[]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Expand" }));
        fireEvent.click(screen.getByRole("button", { name: "Pin overview" }));
        expect(onExpandedChange).toHaveBeenCalledOnce();
        expect(onPinChange).toHaveBeenCalledOnce();

        render(
            <AccountBalancesCompanion
                activeAccountCount={accounts.length}
                accounts={accounts}
                isError={false}
                isExpanded
                isLoading={false}
                isPinned={false}
                onExpandedChange={onExpandedChange}
                onPinChange={onPinChange}
                onRetry={vi.fn()}
                onSelectAccount={onSelectAccount}
                selectedAccountIds={[1]}
            />,
        );
        const account = screen.getAllByRole("button", { name: /Emergency reserve/ })[0];
        expect(account).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(account);
        expect(onSelectAccount).toHaveBeenCalledWith(1);
    });
});
