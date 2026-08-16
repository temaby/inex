import * as React from "react";
import type { MenuProps } from "antd";
import { DatePicker, Form, Input } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import type { AccountDetails } from "../../model/Account/AccountDetails";
import type { CategoryDetails } from "../../model/Category/CategoryDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { TransactionCreateValidationErrors } from "./TransactionCreate";

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateIncomeFormProps {
    accounts: AccountResponse[];
    categories: CategoryDetails[];
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
                validateStatus={validationErrors.toAccount ? "error" : undefined}
            >
                <Dropdown
                    id="income_account"
                    items={accounts}
                    multiple={false}
                    onChange={onSetToAccount}
                    placeholder={t("transactions.selectAccount")}
                    selection={getSelectedAccount(toAccount)}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.category}
                label={t("transactions.category")}
                validateStatus={validationErrors.category ? "error" : undefined}
            >
                <Dropdown
                    id="income_category"
                    items={categories}
                    multiple={false}
                    onChange={onSetCategory}
                    placeholder={t("transactions.selectCategory")}
                    selection={getSelectedCategory(category)}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.toAmount}
                label={t("transactions.amount")}
                validateStatus={validationErrors.toAmount ? "error" : undefined}
            >
                <ExpressionInputNumber
                    addonAfter={amountCurrency}
                    key="income_amount"
                    onChange={onSetToAmount}
                    placeholder={t("common.enterAmount")}
                    precision={2}
                    size="large"
                    value={toAmount}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.date}
                label={t("transactions.date")}
                validateStatus={validationErrors.date ? "error" : undefined}
            >
                <DatePicker mode="date" onChange={onSetDate} value={date} />
            </Form.Item>
            <Form.Item label={t("transactions.comment")}>
                <Input
                    key="income_comment"
                    onChange={onSetComment}
                    placeholder={t("transactions.commentPlaceholder")}
                    size="large"
                    value={comment}
                />
            </Form.Item>
        </Form>
    );
};

export default TransactionCreateIncomeForm;
