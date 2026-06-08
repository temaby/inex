import * as React from "react";
import type { MenuProps } from "antd";
import { DatePicker, Form, Input } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import type { AccountDetails } from "../../model/Account/AccountDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateTransferFormProps {
    accounts: AccountResponse[];
    comment: string;
    date: Dayjs;
    fromAccount: AccountDetails;
    fromAmount: number;
    onSetComment: React.ChangeEventHandler<HTMLInputElement>;
    onSetDate: (value: Dayjs) => void;
    onSetFromAccount: (item: DropdownSelectInfo) => void;
    onSetFromAmount: (value: number | null) => void;
    onSetToAccount: (item: DropdownSelectInfo) => void;
    onSetToAmount: (value: number | null) => void;
    toAccount: AccountDetails;
    toAmount: number;
}

const TransactionCreateTransferForm: React.FC<TransactionCreateTransferFormProps> = ({
    accounts,
    comment,
    date,
    fromAccount,
    fromAmount,
    onSetComment,
    onSetDate,
    onSetFromAccount,
    onSetFromAmount,
    onSetToAccount,
    onSetToAmount,
    toAccount,
    toAmount,
}) => {
    const { t } = useTranslation();

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item label={t("transactions.transferFrom")}>
                <Dropdown id="transfer_from_account" items={accounts} multiple={false} onChange={onSetFromAccount} selection={[fromAccount]} />
            </Form.Item>
            <Form.Item label={t("transactions.amount")}>
                <ExpressionInputNumber
                    addonAfter={fromAccount.currency}
                    key="transfer_from_amount"
                    onChange={onSetFromAmount}
                    placeholder={t("common.enterAmount")}
                    precision={2}
                    size="large"
                    value={fromAmount}
                />
            </Form.Item>
            <Form.Item label={t("transactions.transferTo")}>
                <Dropdown id="transfer_to_account" items={accounts} multiple={false} onChange={onSetToAccount} selection={[toAccount]} />
            </Form.Item>
            <Form.Item label={t("transactions.amount")}>
                <ExpressionInputNumber
                    addonAfter={toAccount.currency}
                    key="transfer_to_amount"
                    onChange={onSetToAmount}
                    placeholder={t("common.enterAmount")}
                    precision={2}
                    size="large"
                    value={toAmount}
                />
            </Form.Item>
            <Form.Item label={t("transactions.date")}>
                <DatePicker mode="date" onChange={(value) => value && onSetDate(value)} value={date} />
            </Form.Item>
            <Form.Item label={t("transactions.comment")}>
                <Input key="transfer_comment" onChange={onSetComment} size="large" value={comment} />
            </Form.Item>
        </Form>
    );
};

export default TransactionCreateTransferForm;
