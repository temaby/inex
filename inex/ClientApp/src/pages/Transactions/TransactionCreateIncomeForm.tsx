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

interface TransactionCreateIncomeFormProps {
    accounts: AccountResponse[];
    categories: CategoryDetails[];
    category: CategoryDetails;
    comment: string;
    date: Dayjs;
    onSetCategory: (item: DropdownSelectInfo) => void;
    onSetComment: React.ChangeEventHandler<HTMLInputElement>;
    onSetDate: (value: Dayjs) => void;
    onSetTags: React.ChangeEventHandler<HTMLInputElement>;
    onSetToAccount: (item: DropdownSelectInfo) => void;
    onSetToAmount: (value: number | null) => void;
    tags: string;
    toAccount: AccountDetails;
    toAmount: number;
}

const TransactionCreateIncomeForm: React.FC<TransactionCreateIncomeFormProps> = ({
    accounts,
    categories,
    category,
    comment,
    date,
    onSetCategory,
    onSetComment,
    onSetDate,
    onSetTags,
    onSetToAccount,
    onSetToAmount,
    tags,
    toAccount,
    toAmount,
}) => {
    const { t } = useTranslation();

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item label={t("transactions.amount")}>
                <ExpressionInputNumber
                    addonAfter={toAccount.currency}
                    key="income_amount"
                    onChange={onSetToAmount}
                    placeholder={t("common.enterAmount")}
                    precision={2}
                    size="large"
                    value={toAmount}
                />
            </Form.Item>
            <Form.Item label={t("transactions.account")}>
                <Dropdown id="income_account" items={accounts} multiple={false} onChange={onSetToAccount} selection={[toAccount]} />
            </Form.Item>
            <Form.Item label={t("transactions.category")}>
                <Dropdown id="income_category" items={categories} multiple={false} onChange={onSetCategory} selection={[category]} />
            </Form.Item>
            <Form.Item label={t("transactions.date")}>
                <DatePicker mode="date" onChange={(value) => value && onSetDate(value)} value={date} />
            </Form.Item>
            <Form.Item label={t("transactions.comment")}>
                <Input key="income_comment" onChange={onSetComment} size="large" value={comment} />
            </Form.Item>
            <Form.Item label={t("transactions.tags")}>
                <Input
                    key="income_tags"
                    onChange={onSetTags}
                    placeholder={t("transactions.tagsPlaceholder")}
                    size="large"
                    value={tags}
                />
            </Form.Item>
        </Form>
    );
};

export default TransactionCreateIncomeForm;
