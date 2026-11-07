import * as React from "react";
import type { MenuProps } from "antd";
import { Alert, Form } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import Dropdown from "../../components/Dropdown";
import { CreationAmount, CreationDate, CreationComment } from "./TransactionCreationFields";
import { SegmentedControl } from "../../components/primitives";
import type { AccountDetails } from "../../model/Account/AccountDetails";
import type { InternalTransferDirection } from "../../model/Transaction/InternalTransferDirection";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { TransactionCreateValidationErrors } from "./TransactionCreate";

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateInternalTransferFormProps {
    correction?: boolean;
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
    correction = false,
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
            {correction && <Alert type="info" showIcon message={t("transactions.correctionExplanation")} />}
            <Form.Item label={t("transactions.internalTransferDirection")}>
                <SegmentedControl
                    onChange={(value) => onSetDirection(value as InternalTransferDirection)}
                    options={[
                        { key: "outgoing", label: t(correction ? "transactions.correctionDecrease" : "transactions.internalTransferOutgoing") },
                        { key: "incoming", label: t(correction ? "transactions.correctionIncrease" : "transactions.internalTransferIncoming") },
                    ]}
                    size="compact"
                    value={direction}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.fromAccount}
                label={t("transactions.account")}
                htmlFor="internal_transfer_account"
                validateStatus={validationErrors.fromAccount ? "error" : undefined}
            >
                <Dropdown
                    id="internal_transfer_account"
                    items={accounts}
                    showCurrency
                    multiple={false}
                    onChange={onSetAccount}
                    placeholder={t("transactions.selectAccount")}
                    selection={account.id > 0 ? [account] : []}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.fromAmount}
                label={t("transactions.amount")}
                htmlFor="internal_transfer_amount"
                validateStatus={validationErrors.fromAmount ? "error" : undefined}
            >
                <CreationAmount
                    currency={account.id > 0 ? account.currency : undefined}
                    id="internal_transfer_amount"
                    onChange={onSetAmount}
                    value={amount}
                />
            </Form.Item>
            <CreationDate date={date} onChange={onSetDate} error={validationErrors.date} />
            <CreationComment comment={comment} onChange={onSetComment} required={correction} error={validationErrors.comment} />
        </Form>
    );
};

export default TransactionCreateInternalTransferForm;
