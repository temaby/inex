import * as React from "react";
import type { MenuProps } from "antd";
import { DatePicker, Form, Input } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import type { AccountDetails } from "../../model/Account/AccountDetails";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { TransactionCreateValidationErrors } from "./TransactionCreate";

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateTransferFormProps {
    accounts: AccountResponse[];
    comment: string;
    date: Dayjs | null;
    fromAccount: AccountDetails;
    fromAmount: number;
    onSetComment: React.ChangeEventHandler<HTMLInputElement>;
    onSetDate: (value: Dayjs | null) => void;
    onSetFromAccount: (item: DropdownSelectInfo) => void;
    onSetFromAmount: (value: number | null) => void;
    onSetToAccount: (item: DropdownSelectInfo) => void;
    onSetToAmount: (value: number | null) => void;
    toAccount: AccountDetails;
    toAmount: number;
    validationErrors: TransactionCreateValidationErrors;
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
    validationErrors,
}) => {
    const { t } = useTranslation();

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item
                help={validationErrors.fromAccount}
                label={t("transactions.transferFrom")}
                validateStatus={validationErrors.fromAccount ? "error" : undefined}
            >
                <Dropdown id="transfer_from_account" items={accounts} multiple={false} onChange={onSetFromAccount} selection={[fromAccount]} />
            </Form.Item>
            <Form.Item
                help={validationErrors.fromAmount}
                label={t("transactions.amount")}
                validateStatus={validationErrors.fromAmount ? "error" : undefined}
            >
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
            <Form.Item
                help={validationErrors.toAccount}
                label={t("transactions.transferTo")}
                validateStatus={validationErrors.toAccount ? "error" : undefined}
            >
                <Dropdown id="transfer_to_account" items={accounts} multiple={false} onChange={onSetToAccount} selection={[toAccount]} />
            </Form.Item>
            <Form.Item
                help={validationErrors.toAmount}
                label={t("transactions.amount")}
                validateStatus={validationErrors.toAmount ? "error" : undefined}
            >
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
            <Form.Item
                help={validationErrors.date}
                label={t("transactions.date")}
                validateStatus={validationErrors.date ? "error" : undefined}
            >
                <DatePicker mode="date" onChange={onSetDate} value={date} />
            </Form.Item>
            <Form.Item label={t("transactions.comment")}>
                <Input key="transfer_comment" onChange={onSetComment} size="large" value={comment} />
            </Form.Item>
        </Form>
    );
};

export default TransactionCreateTransferForm;
