import * as React from "react";
import type { MenuProps } from "antd";
import { Button, Form } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import Dropdown from "../../components/Dropdown";
import { CreationAmount, CreationDate, CreationComment } from "./TransactionCreationFields";
import type { AccountDetails } from "../../model/Account/AccountDetails";
import type { CategoryDetails } from "../../model/Category/CategoryDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { TransactionCreateValidationErrors } from "./TransactionCreate";

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateExpenseFormProps {
    accounts: AccountResponse[];
    categories: CategoryDetails[];
    recentCategories?: CategoryDetails[];
    onSelectRecentCategory?: (category: CategoryDetails) => void;
    category: CategoryDetails;
    comment: string;
    date: Dayjs | null;
    fromAccount: AccountDetails;
    fromAmount: number;
    onSetCategory: (item: DropdownSelectInfo) => void;
    onSetComment: React.ChangeEventHandler<HTMLInputElement>;
    onSetDate: (value: Dayjs | null) => void;
    onSetFromAccount: (item: DropdownSelectInfo) => void;
    onSetFromAmount: (value: number | null) => void;
    validationErrors: TransactionCreateValidationErrors;
}

const getSelectedCurrency = (account: AccountDetails): string | undefined =>
    account.id > 0 && account.currency ? account.currency : undefined;

const getSelectedAccount = (account: AccountDetails): AccountDetails[] =>
    account.id > 0 ? [account] : [];

const getSelectedCategory = (category: CategoryDetails): CategoryDetails[] =>
    category.id > 0 ? [category] : [];

const TransactionCreateExpenseForm: React.FC<TransactionCreateExpenseFormProps> = ({
    accounts,
    categories,
    recentCategories = [],
    onSelectRecentCategory,
    category,
    comment,
    date,
    fromAccount,
    fromAmount,
    onSetCategory,
    onSetComment,
    onSetDate,
    onSetFromAccount,
    onSetFromAmount,
    validationErrors,
}) => {
    const { t } = useTranslation();
    const amountCurrency = getSelectedCurrency(fromAccount);

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item
                help={validationErrors.fromAccount}
                label={t("transactions.account")}
                htmlFor="expense_account"
                validateStatus={validationErrors.fromAccount ? "error" : undefined}
            >
                <Dropdown
                    id="expense_account"
                    items={accounts}
                    showCurrency
                    multiple={false}
                    onChange={onSetFromAccount}
                    placeholder={t("transactions.selectAccount")}
                    selection={getSelectedAccount(fromAccount)}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.fromAmount}
                label={t("transactions.amount")}
                htmlFor="expense_amount"
                validateStatus={validationErrors.fromAmount ? "error" : undefined}
            >
                <CreationAmount
                    currency={amountCurrency}
                    id="expense_amount"
                    onChange={onSetFromAmount}
                    value={fromAmount}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.category}
                label={t("transactions.category")}
                htmlFor="expense_category"
                validateStatus={validationErrors.category ? "error" : undefined}
            >
                {recentCategories.length > 0 && <div className="transaction-category-shortcuts" aria-label={t("transactions.recentCategories")}>
                    {recentCategories.map(recent => <Button key={recent.id} type={category.id === recent.id ? "primary" : "default"}
                        aria-pressed={category.id === recent.id} onClick={() => onSelectRecentCategory?.(recent)}>{recent.name}</Button>)}
                </div>}
                <Dropdown
                    id="expense_category"
                    items={categories}
                    searchPlaceholder={t("transactions.searchCategories")}
                    multiple={false}
                    onChange={onSetCategory}
                    placeholder={t("transactions.selectCategory")}
                    selection={getSelectedCategory(category)}
                />
            </Form.Item>
            <CreationDate date={date} onChange={onSetDate} error={validationErrors.date} />
            <CreationComment comment={comment} onChange={onSetComment} />
        </Form>
    );
};

export default TransactionCreateExpenseForm;
