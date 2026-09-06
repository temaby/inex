import * as React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountDetails } from "../../model/Account/AccountDetails";
import type { CategoryDetails } from "../../model/Category/CategoryDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import TransactionCreateExpenseForm from "./TransactionCreateExpenseForm";
import TransactionCreateIncomeForm from "./TransactionCreateIncomeForm";
import TransactionCreateTransferForm from "./TransactionCreateTransferForm";
import TransactionCreateInternalTransferForm from "./TransactionCreateInternalTransferForm";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => ({
            "common.enterAmount": "Enter amount",
            "transactions.account": "Account",
            "transactions.amount": "Amount",
            "transactions.category": "Category",
            "transactions.comment": "Comment",
            "transactions.commentPlaceholder": "Comment with optional #tag or @reference",
            "transactions.date": "Date",
            "transactions.selectAccount": "Select account",
            "transactions.selectCategory": "Select category",
            "transactions.transferFrom": "Transfer from",
            "transactions.transferTo": "Transfer to",
            "transactions.internalTransferDirection": "Direction",
            "transactions.internalTransferOutgoing": "Sent",
            "transactions.internalTransferIncoming": "Received",
        }[key] ?? key),
    }),
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

const categories: CategoryDetails[] = [
    {
        id: 10,
        key: "groceries",
        name: "Groceries",
        description: "",
        isEnabled: true,
        isSystem: false,
        systemCode: "",
        children: [],
    },
];

const unselectedAccount: AccountDetails = {
    id: -1,
    key: "default",
    name: "Choose account",
    description: "",
    currency: "USD",
};

const unselectedCategory: CategoryDetails = {
    id: -1,
    key: "default",
    name: "",
    description: "",
    isEnabled: true,
    isSystem: false,
    systemCode: "",
    children: [],
};

const noop = vi.fn();

describe("Transaction create mode forms", () => {
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
    });

    it("renders expense account before category and amount without a default currency or separate tags field", () => {
        const { container } = render(
            <TransactionCreateExpenseForm
                accounts={accounts}
                categories={categories}
                category={unselectedCategory}
                comment=""
                date={null}
                fromAccount={unselectedAccount}
                fromAmount={0}
                onSetCategory={noop}
                onSetComment={noop}
                onSetDate={noop}
                onSetFromAccount={noop}
                onSetFromAmount={noop}
                validationErrors={{}}
            />,
        );

        const text = container.textContent ?? "";
        expect(text.indexOf("Account")).toBeLessThan(text.indexOf("Category"));
        expect(text.indexOf("Category")).toBeLessThan(text.indexOf("Amount"));
        expect(screen.getByText("Select account")).toBeInTheDocument();
        expect(screen.queryByText("Tags")).not.toBeInTheDocument();
        expect(screen.queryByText("USD")).not.toBeInTheDocument();
    });

    it("renders income account before category and amount without a default currency or separate tags field", () => {
        const { container } = render(
            <TransactionCreateIncomeForm
                accounts={accounts}
                categories={categories}
                category={unselectedCategory}
                comment=""
                date={null}
                onSetCategory={noop}
                onSetComment={noop}
                onSetDate={noop}
                onSetToAccount={noop}
                onSetToAmount={noop}
                toAccount={unselectedAccount}
                toAmount={0}
                validationErrors={{}}
            />,
        );

        const text = container.textContent ?? "";
        expect(text.indexOf("Account")).toBeLessThan(text.indexOf("Category"));
        expect(text.indexOf("Category")).toBeLessThan(text.indexOf("Amount"));
        expect(screen.getByText("Select account")).toBeInTheDocument();
        expect(screen.queryByText("Tags")).not.toBeInTheDocument();
        expect(screen.queryByText("USD")).not.toBeInTheDocument();
    });

    it("does not show the selected account's native balance", () => {
        render(
            <TransactionCreateExpenseForm
                accounts={accounts}
                categories={categories}
                category={unselectedCategory}
                comment=""
                date={null}
                fromAccount={{ ...unselectedAccount, ...accounts[0], description: accounts[0].description ?? "" }}
                fromAmount={0}
                onSetCategory={noop}
                onSetComment={noop}
                onSetDate={noop}
                onSetFromAccount={noop}
                onSetFromAmount={noop}
                validationErrors={{}}
            />,
        );

        expect(screen.queryByTestId("selected-account-native-balance")).not.toBeInTheDocument();
    });

    it("renders each transfer account before its related amount without default currency suffixes", () => {
        const { container } = render(
            <TransactionCreateTransferForm
                accounts={accounts}
                comment=""
                date={null}
                fromAccount={unselectedAccount}
                fromAmount={0}
                onSetComment={noop}
                onSetDate={noop}
                onSetFromAccount={noop}
                onSetFromAmount={noop}
                onSetToAccount={noop}
                onSetToAmount={noop}
                toAccount={unselectedAccount}
                toAmount={0}
                validationErrors={{}}
            />,
        );

        const text = container.textContent ?? "";
        expect(text.indexOf("Transfer from")).toBeLessThan(text.indexOf("Amount"));
        expect(text.indexOf("Transfer to")).toBeLessThan(text.lastIndexOf("Amount"));
        expect(screen.getAllByText("Select account")).toHaveLength(2);
        expect(screen.queryByText("USD")).not.toBeInTheDocument();
    });

    it("renders the internal-transfer direction, account, and amount without a default currency suffix", () => {
        const { container } = render(
            <TransactionCreateInternalTransferForm
                account={unselectedAccount}
                accounts={accounts}
                amount={0}
                comment=""
                date={null}
                direction="outgoing"
                onSetAccount={noop}
                onSetAmount={noop}
                onSetComment={noop}
                onSetDate={noop}
                onSetDirection={noop}
                validationErrors={{}}
            />,
        );

        const text = container.textContent ?? "";
        expect(text.indexOf("Direction")).toBeLessThan(text.indexOf("Account"));
        expect(text.indexOf("Account")).toBeLessThan(text.indexOf("Amount"));
        expect(screen.getByText("Sent")).toBeInTheDocument();
        expect(screen.getByText("Received")).toBeInTheDocument();
        expect(screen.queryByText("USD")).not.toBeInTheDocument();
    });
});
