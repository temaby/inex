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

interface TransactionCreateIncomeFormProps {
    accounts: AccountResponse[];
    categories: CategoryDetails[];
    recentCategories?: CategoryDetails[];
    onSelectRecentCategory?: (category: CategoryDetails) => void;
    category: CategoryDetails;
    comment: string;
    date: Dayjs | null;
    onSetCategory: (item: DropdownSelectInfo) => void;
    onSetComment: React.ChangeEventHandler<HTMLInputElement>;
    onSetDate: (value: Dayjs | null) => void;
    onSetToAccount: (item: DropdownSelectInfo) => void;
    onSetToAmount: (value: number | null) => void;
    toAccount: AccountDetails;
    toAmount: number;
    validationErrors: TransactionCreateValidationErrors;
}

const getSelectedCurrency = (account: AccountDetails): string | undefined =>
    account.id > 0 && account.currency ? account.currency : undefined;

const getSelectedAccount = (account: AccountDetails): AccountDetails[] =>
    account.id > 0 ? [account] : [];

const getSelectedCategory = (category: CategoryDetails): CategoryDetails[] =>
    category.id > 0 ? [category] : [];

const TransactionCreateIncomeForm: React.FC<TransactionCreateIncomeFormProps> = ({
    accounts,
    categories,
    recentCategories = [],
    onSelectRecentCategory,
    category,
    comment,
    date,
    onSetCategory,
    onSetComment,
    onSetDate,
    onSetToAccount,
    onSetToAmount,
    toAccount,
    toAmount,
    validationErrors,
}) => {
    const { t } = useTranslation();
    const amountCurrency = getSelectedCurrency(toAccount);

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item
                help={validationErrors.toAccount}
                label={t("transactions.account")}
                htmlFor="income_account"
                validateStatus={validationErrors.toAccount ? "error" : undefined}
            >
                <Dropdown
                    id="income_account"
                    items={accounts}
                    showCurrency
                    multiple={false}
                    onChange={onSetToAccount}
                    placeholder={t("transactions.selectAccount")}
                    selection={getSelectedAccount(toAccount)}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.toAmount}
                label={t("transactions.amount")}
                htmlFor="income_amount"
                validateStatus={validationErrors.toAmount ? "error" : undefined}
            >
                <CreationAmount
                    currency={amountCurrency}
                    id="income_amount"
                    onChange={onSetToAmount}
                    value={toAmount}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.category}
                label={t("transactions.category")}
                htmlFor="income_category"
                validateStatus={validationErrors.category ? "error" : undefined}
            >
                {recentCategories.length > 0 && <div className="transaction-category-shortcuts" aria-label={t("transactions.recentCategories")}>
                    {recentCategories.map(recent => <Button key={recent.id} type={category.id === recent.id ? "primary" : "default"}
                        aria-pressed={category.id === recent.id} onClick={() => onSelectRecentCategory?.(recent)}>{recent.name}</Button>)}
                </div>}
                <Dropdown
                    id="income_category"
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

export default TransactionCreateIncomeForm;
