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

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateExpenseFormProps {
    accounts: AccountResponse[];
    categories: CategoryDetails[];
    category: CategoryDetails;
    comment: string;
    date: Dayjs;
    fromAccount: AccountDetails;
    fromAmount: number;
    onSetCategory: (item: DropdownSelectInfo) => void;
    onSetComment: React.ChangeEventHandler<HTMLInputElement>;
    onSetDate: (value: Dayjs) => void;
    onSetFromAccount: (item: DropdownSelectInfo) => void;
    onSetFromAmount: (value: number | null) => void;
    onSetTags: React.ChangeEventHandler<HTMLInputElement>;
    tags: string;
}

const TransactionCreateExpenseForm: React.FC<TransactionCreateExpenseFormProps> = ({
    accounts,
    categories,
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
    onSetTags,
    tags,
}) => {
    const { t } = useTranslation();

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item label={t("transactions.amount")}>
                <ExpressionInputNumber
                    addonAfter={fromAccount.currency}
                    key="expense_amount"
                    onChange={onSetFromAmount}
                    placeholder={t("common.enterAmount")}
                    precision={2}
                    size="large"
                    value={fromAmount}
                />
            </Form.Item>
            <Form.Item label={t("transactions.account")}>
                <Dropdown id="expense_account" items={accounts} multiple={false} onChange={onSetFromAccount} selection={[fromAccount]} />
            </Form.Item>
            <Form.Item label={t("transactions.category")}>
                <Dropdown id="expense_category" items={categories} multiple={false} onChange={onSetCategory} selection={[category]} />
            </Form.Item>
            <Form.Item label={t("transactions.date")}>
                <DatePicker mode="date" onChange={(value) => value && onSetDate(value)} value={date} />
            </Form.Item>
            <Form.Item label={t("transactions.comment")}>
                <Input key="expense_comment" onChange={onSetComment} size="large" value={comment} />
            </Form.Item>
            <Form.Item label={t("transactions.tags")}>
                <Input
                    key="expense_tags"
                    onChange={onSetTags}
                    placeholder={t("transactions.tagsPlaceholder")}
                    size="large"
                    value={tags}
                />
            </Form.Item>
        </Form>
    );
};

export default TransactionCreateExpenseForm;
