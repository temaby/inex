import * as React from "react";
import type { MenuProps } from "antd";
import { DatePicker, Form, Input } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import { SegmentedControl } from "../../components/primitives";
import type { AccountDetails } from "../../model/Account/AccountDetails";
import type { InternalTransferDirection } from "../../model/Transaction/InternalTransferDirection";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { TransactionCreateValidationErrors } from "./TransactionCreate";

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateInternalTransferFormProps {
    account: AccountDetails;
    accounts: AccountResponse[];
    amount: number;
    comment: string;
    date: Dayjs | null;
    direction: InternalTransferDirection;
    onSetAccount: (item: DropdownSelectInfo) => void;
    onSetAmount: (value: number | null) => void;
    onSetComment: React.ChangeEventHandler<HTMLInputElement>;
    onSetDate: (value: Dayjs | null) => void;
    onSetDirection: (value: InternalTransferDirection) => void;
    validationErrors: TransactionCreateValidationErrors;
}

const TransactionCreateInternalTransferForm: React.FC<TransactionCreateInternalTransferFormProps> = ({
    account,
    accounts,
    amount,
    comment,
    date,
    direction,
    onSetAccount,
    onSetAmount,
    onSetComment,
    onSetDate,
    onSetDirection,
    validationErrors,
}) => {
    const { t } = useTranslation();

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item label={t("transactions.internalTransferDirection")}>
                <SegmentedControl
                    onChange={(value) => onSetDirection(value as InternalTransferDirection)}
                    options={[
                        { key: "outgoing", label: t("transactions.internalTransferOutgoing") },
                        { key: "incoming", label: t("transactions.internalTransferIncoming") },
                    ]}
                    size="compact"
                    value={direction}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.fromAccount}
                label={t("transactions.account")}
                validateStatus={validationErrors.fromAccount ? "error" : undefined}
            >
                <Dropdown
                    id="internal_transfer_account"
                    items={accounts}
                    multiple={false}
                    onChange={onSetAccount}
                    placeholder={t("transactions.selectAccount")}
                    selection={account.id > 0 ? [account] : []}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.fromAmount}
                label={t("transactions.amount")}
                validateStatus={validationErrors.fromAmount ? "error" : undefined}
            >
                <ExpressionInputNumber
                    addonAfter={account.id > 0 ? account.currency : undefined}
                    key="internal_transfer_amount"
                    onChange={onSetAmount}
                    placeholder={t("common.enterAmount")}
                    precision={2}
                    size="large"
                    value={amount}
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
                    key="internal_transfer_comment"
                    onChange={onSetComment}
                    placeholder={t("transactions.commentPlaceholder")}
                    size="large"
                    value={comment}
                />
            </Form.Item>
        </Form>
    );
};

export default TransactionCreateInternalTransferForm;
