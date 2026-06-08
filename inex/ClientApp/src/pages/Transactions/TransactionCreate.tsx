import * as React from "react";
import { useMemo, useReducer } from "react";
import type { MenuProps } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";

import { InExButton, SegmentedControl } from "../../components/primitives";
import { AccountDetails } from "../../model/Account/AccountDetails";
import { CategoryDetails, createCategoryDetails, getCategoriesTree } from "../../model/Category/CategoryDetails";
import { TransactionSetState } from "../../model/Transaction/TransactionSetState";
import { TransactionType } from "../../model/Transaction/TransactionType";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { transactionsActions } from "../../store/transactions/transactions-slice";
import { useCreateTransactionMutation, useCreateTransferMutation } from "../../store/transactions/transactions-api";
import { useAppDispatch } from "../../store/hooks";
import { mergeCommentWithTags } from "./transaction-ledger-utils";
import TransactionCreateExpenseForm from "./TransactionCreateExpenseForm";
import TransactionCreateIncomeForm from "./TransactionCreateIncomeForm";
import TransactionCreateTransferForm from "./TransactionCreateTransferForm";

type DropdownSelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];

interface TransactionCreateProps {
    accounts: AccountResponse[];
    categories: CategoryResponse[];
    onCancel: () => void;
    onSubmit: () => void;
}

interface TransactionCreateState extends TransactionSetState {
    tagsInput: string;
}

type TransactionCreateAction =
    | { type: "SET_MODE"; value: TransactionType }
    | { type: "SET_AMOUNT_FROM"; value: number }
    | { type: "SET_AMOUNT_TO"; value: number }
    | { type: "SET_ACCOUNT_FROM"; value: AccountDetails }
    | { type: "SET_ACCOUNT_TO"; value: AccountDetails }
    | { type: "SET_CATEGORY"; value: CategoryDetails }
    | { type: "SET_DATE"; value: Dayjs }
    | { type: "SET_COMMENT"; value: string }
    | { type: "SET_TAGS"; value: string }
    | { type: "RESET" };

const createDefaultState = (): TransactionCreateState => ({
    ...new TransactionSetState(),
    tagsInput: "",
});

const reducer = (state: TransactionCreateState, action: TransactionCreateAction): TransactionCreateState => {
    switch (action.type) {
        case "SET_MODE":
            return { ...createDefaultState(), mode: action.value };
        case "SET_AMOUNT_FROM":
            return { ...state, fromAmount: action.value };
        case "SET_AMOUNT_TO":
            return { ...state, toAmount: action.value };
        case "SET_ACCOUNT_FROM":
            return { ...state, fromAccount: action.value };
        case "SET_ACCOUNT_TO":
            return { ...state, toAccount: action.value };
        case "SET_CATEGORY":
            return { ...state, category: action.value };
        case "SET_DATE":
            return { ...state, date: action.value };
        case "SET_COMMENT":
            return { ...state, comment: action.value };
        case "SET_TAGS":
            return { ...state, tagsInput: action.value };
        case "RESET":
            return createDefaultState();
    }
};

const toAccountDetails = (account: AccountResponse): AccountDetails =>
    Object.assign(new AccountDetails(), {
        id: account.id,
        key: account.key,
        name: account.name,
        description: account.description ?? "",
        currency: account.currency,
    });

const toCategoryDetails = (category: CategoryResponse): CategoryDetails =>
    createCategoryDetails({
        id: category.id,
        key: category.key,
        name: category.name,
        description: category.description ?? "",
        parentId: category.parentId ?? undefined,
        isEnabled: category.isEnabled,
        isSystem: category.isSystem,
        systemCode: category.systemCode ?? "",
        children: [],
    });

const findCategoryById = (categories: CategoryDetails[], id: number): CategoryDetails | undefined => {
    for (const category of categories) {
        if (category.id === id) return category;
        const nested = category.children ? findCategoryById(category.children, id) : undefined;
        if (nested) return nested;
    }

    return undefined;
};

const TransactionCreate: React.FC<TransactionCreateProps> = ({
    accounts,
    categories,
    onCancel,
    onSubmit,
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [state, dispatchTransactionAction] = useReducer(reducer, undefined, createDefaultState);
    const [createTransactionMutation, { isLoading: isCreating }] = useCreateTransactionMutation();
    const [createTransferMutation, { isLoading: isCreatingTransfer }] = useCreateTransferMutation();

    const categoryTree = useMemo(
        () => getCategoriesTree(categories.map(toCategoryDetails), false, t("categories.systemGroup")) as CategoryDetails[],
        [categories, t],
    );

    const setModeHandler = (mode: string) => {
        dispatchTransactionAction({ type: "SET_MODE", value: mode as TransactionType });
    };

    const setFromAmountHandler = (value: number | null) => {
        dispatchTransactionAction({ type: "SET_AMOUNT_FROM", value: value ?? 0 });
    };

    const setToAmountHandler = (value: number | null) => {
        dispatchTransactionAction({ type: "SET_AMOUNT_TO", value: value ?? 0 });
    };

    const setFromAccountHandler = (item: DropdownSelectInfo) => {
        const account = accounts.find((candidate) => candidate.id === Number(item.key));
        if (account) dispatchTransactionAction({ type: "SET_ACCOUNT_FROM", value: toAccountDetails(account) });
    };

    const setToAccountHandler = (item: DropdownSelectInfo) => {
        const account = accounts.find((candidate) => candidate.id === Number(item.key));
        if (account) dispatchTransactionAction({ type: "SET_ACCOUNT_TO", value: toAccountDetails(account) });
    };

    const setCategoryHandler = (item: DropdownSelectInfo) => {
        const category = findCategoryById(categoryTree, Number(item.key));
        if (category) dispatchTransactionAction({ type: "SET_CATEGORY", value: category });
    };

    const setDateHandler = (value: Dayjs) => {
        dispatchTransactionAction({ type: "SET_DATE", value });
    };

    const setCommentHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        dispatchTransactionAction({ type: "SET_COMMENT", value: event.target.value });
    };

    const setTagsHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        dispatchTransactionAction({ type: "SET_TAGS", value: event.target.value });
    };

    const resetAndClose = (close: () => void) => {
        dispatchTransactionAction({ type: "RESET" });
        dispatch(transactionsActions.setError({ error: null }));
        close();
    };

    const saveTransactionHandler = async () => {
        const comment = mergeCommentWithTags(state.comment, state.tagsInput);

        try {
            if (state.mode === TransactionType.EXPENSE) {
                await createTransactionMutation({
                    accountId: state.fromAccount.id,
                    categoryId: state.category.id,
                    amount: 0 - state.fromAmount,
                    comment,
                    created: state.date.format("YYYY-MM-DD"),
                }).unwrap();
            } else if (state.mode === TransactionType.INCOME) {
                await createTransactionMutation({
                    accountId: state.toAccount.id,
                    categoryId: state.category.id,
                    amount: state.toAmount,
                    comment,
                    created: state.date.format("YYYY-MM-DD"),
                }).unwrap();
            } else if (state.mode === TransactionType.TRANSFER) {
                await createTransferMutation({
                    accountFromId: state.fromAccount.id,
                    accountToId: state.toAccount.id,
                    amountFrom: state.fromAmount,
                    amountTo: state.toAmount,
                    comment,
                    created: state.date.format("YYYY-MM-DD"),
                }).unwrap();
            }
        } catch {
            dispatch(transactionsActions.setError({
                error: state.mode === TransactionType.TRANSFER
                    ? t("transactions.formErrors.transferFailure")
                    : t("transactions.formErrors.createFailure"),
            }));
            return;
        }

        resetAndClose(onSubmit);
    };

    const saveLabel = {
        [TransactionType.EXPENSE]: t("transactions.saveExpense"),
        [TransactionType.INCOME]: t("transactions.saveIncome"),
        [TransactionType.TRANSFER]: t("transactions.saveTransfer"),
    }[state.mode];

    return (
        <div className="transactions-create-form">
            <SegmentedControl
                onChange={setModeHandler}
                options={[
                    { key: TransactionType.EXPENSE, label: t("transactions.expense") },
                    { key: TransactionType.INCOME, label: t("transactions.income") },
                    { key: TransactionType.TRANSFER, label: t("transactions.transfer") },
                ]}
                size="compact"
                value={state.mode}
            />

            {state.mode === TransactionType.EXPENSE && (
                <TransactionCreateExpenseForm
                    accounts={accounts}
                    category={state.category}
                    categories={categoryTree}
                    comment={state.comment}
                    date={state.date}
                    fromAccount={state.fromAccount}
                    fromAmount={state.fromAmount}
                    onSetCategory={setCategoryHandler}
                    onSetComment={setCommentHandler}
                    onSetDate={setDateHandler}
                    onSetFromAccount={setFromAccountHandler}
                    onSetFromAmount={setFromAmountHandler}
                    onSetTags={setTagsHandler}
                    tags={state.tagsInput}
                />
            )}

            {state.mode === TransactionType.INCOME && (
                <TransactionCreateIncomeForm
                    accounts={accounts}
                    category={state.category}
                    categories={categoryTree}
                    comment={state.comment}
                    date={state.date}
                    onSetCategory={setCategoryHandler}
                    onSetComment={setCommentHandler}
                    onSetDate={setDateHandler}
                    onSetTags={setTagsHandler}
                    onSetToAccount={setToAccountHandler}
                    onSetToAmount={setToAmountHandler}
                    tags={state.tagsInput}
                    toAccount={state.toAccount}
                    toAmount={state.toAmount}
                />
            )}

            {state.mode === TransactionType.TRANSFER && (
                <TransactionCreateTransferForm
                    accounts={accounts}
                    comment={state.comment}
                    date={state.date}
                    fromAccount={state.fromAccount}
                    fromAmount={state.fromAmount}
                    onSetComment={setCommentHandler}
                    onSetDate={setDateHandler}
                    onSetFromAccount={setFromAccountHandler}
                    onSetFromAmount={setFromAmountHandler}
                    onSetToAccount={setToAccountHandler}
                    onSetToAmount={setToAmountHandler}
                    toAccount={state.toAccount}
                    toAmount={state.toAmount}
                />
            )}

            <div className="transactions-drawer-actions">
                <InExButton kind="default" onClick={() => resetAndClose(onCancel)}>
                    {t("transactions.cancel")}
                </InExButton>
                <InExButton kind="primary" onClick={saveTransactionHandler}>
                    {isCreating || isCreatingTransfer ? t("transactions.saving") : saveLabel}
                </InExButton>
            </div>
        </div>
    );
};

export default TransactionCreate;
