import * as React from "react";
import type { MenuProps } from "antd";
import { Form } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import Dropdown from "../../components/Dropdown";
import { CreationAmount, CreationDate, CreationComment } from "./TransactionCreationFields";
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

const getSelectedCurrency = (account: AccountDetails): string | undefined =>
    account.id > 0 && account.currency ? account.currency : undefined;

const getSelectedAccount = (account: AccountDetails): AccountDetails[] =>
    account.id > 0 ? [account] : [];

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
    const fromCurrency = getSelectedCurrency(fromAccount);
    const toCurrency = getSelectedCurrency(toAccount);

    return (
        <Form layout="vertical" hideRequiredMark>
            <Form.Item
                help={validationErrors.fromAccount}
                label={t("transactions.transferFrom")}
                htmlFor="transfer_from_account"
                validateStatus={validationErrors.fromAccount ? "error" : undefined}
            >
                <Dropdown
                    id="transfer_from_account"
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
                htmlFor="transfer_from_amount"
                validateStatus={validationErrors.fromAmount ? "error" : undefined}
            >
                <CreationAmount
                    currency={fromCurrency}
                    id="transfer_from_amount"
                    onChange={onSetFromAmount}
                    value={fromAmount}
                />
            </Form.Item>
            <Form.Item
                help={validationErrors.toAccount}
                label={t("transactions.transferTo")}
                htmlFor="transfer_to_account"
                validateStatus={validationErrors.toAccount ? "error" : undefined}
            >
                <Dropdown
                    id="transfer_to_account"
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
                htmlFor="transfer_to_amount"
                validateStatus={validationErrors.toAmount ? "error" : undefined}
            >
                <CreationAmount
                    currency={toCurrency}
                    id="transfer_to_amount"
                    onChange={onSetToAmount}
                    value={toAmount}
                />
            </Form.Item>
            <CreationDate date={date} onChange={onSetDate} error={validationErrors.date} />
            <CreationComment comment={comment} onChange={onSetComment} />
        </Form>
    );
};

export default TransactionCreateTransferForm;
