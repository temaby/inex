import * as React from "react";
import { useEffect, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { Input, Button, Form, Popconfirm, type MenuProps } from "antd";

import { CategoryDetails, createCategoryDetails, getActiveCategoriesTree } from "../../model/Category/CategoryDetails";
import { AccountDetails } from "../../model/Account/AccountDetails";
import { TransactionEditState } from "../../model/Transaction/TransactionEditState";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import Dropdown from "../../components/Dropdown";
import { InExButton } from "../../components/primitives";
import { FormDrawer } from "../../components/primitives/FormDrawer";
import { useAppDispatch } from "../../store/hooks";
import { transactionsActions } from "../../store/transactions/transactions-slice";
import { useDeleteTransactionMutation, useUpdateTransactionMutation } from "../../store/transactions/transactions-api";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { CreationAmount, CreationDate, CreationComment } from "./TransactionCreationFields";
import TransactionDiscardDialog from "./TransactionDiscardDialog";
import "./transaction-creation.css";

interface TransactionEditFormProps {
    accounts: AccountResponse[];
    categories: CategoryResponse[];
    afterOpenChange?: (open: boolean) => void;
    formError?: string | null;
    onClose: () => void;
    onMutationSuccess: (focusTransactionId: number | null) => void;
    open: boolean;
    record: TransactionResponse;
    subtitle: string;
}

type SelectInfo = Parameters<NonNullable<MenuProps["onSelect"]>>[0];
type EditAction =
    | { type: "INIT"; value: TransactionEditState }
    | { type: "SET_AMOUNT"; value: number }
    | { type: "SET_ACCOUNT"; value: AccountDetails }
    | { type: "SET_CATEGORY"; value: CategoryDetails }
    | { type: "SET_DATE"; value: Dayjs }
    | { type: "SET_COMMENT"; value: string };

const toCategory = (category: CategoryResponse): CategoryDetails => createCategoryDetails({
    ...category,
    description: category.description ?? "",
    parentId: category.parentId ?? undefined,
    systemCode: category.systemCode ?? "",
    children: category.children?.map(toCategory) ?? [],
});

const toAccount = (account: AccountResponse): AccountDetails => Object.assign(new AccountDetails(), {
    ...account, description: account.description ?? "",
});

const initialState = ({ accounts, categories, record }: Pick<TransactionEditFormProps, "accounts" | "categories" | "record">, unknownAccount: string): TransactionEditState => {
    const currentRecord = new TransactionEditState();
    const account = accounts.find(candidate => candidate.id === record.accountId);
    currentRecord.account = account ? toAccount(account) : Object.assign(new AccountDetails(), {
        id: record.accountId, currency: record.accountCurrency, name: unknownAccount,
    });
    const category = categories.find(candidate => candidate.id === record.categoryId);
    if (category) currentRecord.category = toCategory(category);
    currentRecord.amount = record.amount;
    currentRecord.date = dayjs(record.created, "YYYY-MM-DD");
    currentRecord.comment = record.comment ?? "";
    return currentRecord;
};

const findCategoryById = (categories: CategoryDetails[], id: number): CategoryDetails | undefined => {
    for (const category of categories) {
        if (category.id === id) return category;
        const nested = category.children ? findCategoryById(category.children, id) : undefined;
        if (nested) return nested;
    }
    return undefined;
};

const reducer = (state: TransactionEditState, action: EditAction): TransactionEditState => {
    switch (action.type) {
        case "INIT": return action.value;
        case "SET_AMOUNT": return { ...state, amount: action.value };
        case "SET_ACCOUNT": return { ...state, account: action.value };
        case "SET_CATEGORY": return { ...state, category: action.value };
        case "SET_DATE": return { ...state, date: action.value };
        case "SET_COMMENT": return { ...state, comment: action.value };
    }
};

const TransactionEditFields = (props: TransactionEditFormProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [updateTransactionMutation, { isLoading: isUpdating }] = useUpdateTransactionMutation();
    const [deleteTransactionMutation, { isLoading: isDeleting }] = useDeleteTransactionMutation();
    const { categories, accounts, record } = props;
    const initial = useMemo(
        () => initialState({ accounts, categories, record }, t("transactions.unknownAccount")),
        [accounts, categories, record, t],
    );
    const [state, dispatchTransactionAction] = useReducer(reducer, initial);
    const [confirmDiscard, setConfirmDiscard] = React.useState(false);
    const incompleteAmount = React.useRef(false);
    const mutationInFlight = React.useRef(false);

    useEffect(() => {
        dispatchTransactionAction({ type: "INIT", value: initial });
    }, [initial]);

    const isCorrection = state.category.isSystem && state.category.systemCode === "correction";
    const busy = !props.open || isUpdating || isDeleting;
    const dirty = state.amount !== initial.amount
        || state.account.id !== initial.account.id
        || state.category.id !== initial.category.id
        || !state.date.isSame(initial.date, "day")
        || state.comment !== initial.comment;
    const categoryTree = useMemo(
        () => getActiveCategoriesTree(categories.map(toCategory), t("categories.systemGroup")),
        [categories, t],
    );
    const setAccountHandler = (item: SelectInfo) => {
        const account = accounts.find(candidate => candidate.id === Number(item.key));
        if (account) dispatchTransactionAction({ type: "SET_ACCOUNT", value: toAccount(account) });
    };
    const setCategoryHandler = (item: SelectInfo) => {
        const category = findCategoryById(categoryTree, Number(item.key));
        if (category) dispatchTransactionAction({ type: "SET_CATEGORY", value: category });
    };
    const setDateHandler = (value: Dayjs | null) => {
        dispatchTransactionAction({ type: "SET_DATE", value: value ?? dayjs() });
    };
    const setCommentHandler: React.ChangeEventHandler<HTMLInputElement> = event => {
        dispatchTransactionAction({ type: "SET_COMMENT", value: event.target.value });
    };

    const requestClose = () => {
        if (busy || mutationInFlight.current) return;
        if (dirty || incompleteAmount.current) {
            setConfirmDiscard(true);
        } else {
            props.onClose();
        }
    };

    const updateTransactionHandler = async () => {
        if (busy || mutationInFlight.current) return;
        mutationInFlight.current = true;
        try {
            await updateTransactionMutation({
                id: record.id,
                accountId: state.account.id,
                categoryId: state.category.id,
                amount: state.amount,
                comment: state.comment,
                created: state.date.format("YYYY-MM-DD"),
            }).unwrap();
            dispatch(transactionsActions.setError({ error: null }));
            props.onMutationSuccess(record.id);
        } catch (error) {
            dispatch(transactionsActions.setError({ error: parseAxiosError(error, t("transactions.formErrors.updateFailure"), t) }));
        } finally {
            mutationInFlight.current = false;
        }
    };
    const removeTransactionHandler = async () => {
        if (busy || mutationInFlight.current) return;
        mutationInFlight.current = true;
        try {
            await deleteTransactionMutation(record.id).unwrap();
            dispatch(transactionsActions.setError({ error: null }));
            props.onMutationSuccess(null);
        } catch {
            dispatch(transactionsActions.setError({ error: t("transactions.formErrors.saveFailure") }));
        } finally {
            mutationInFlight.current = false;
        }
    };

    return (
        <>
            <FormDrawer
                afterOpenChange={props.afterOpenChange}
                busy={busy}
                deleteAction={(
                    <Popconfirm title={t("transactions.deleteConfirm")} onConfirm={removeTransactionHandler}
                        okText={t("common.yes")} cancelText={t("common.no")} disabled={busy}>
                        <Button danger disabled={busy} loading={isDeleting} type="text">{t("transactions.delete")}</Button>
                    </Popconfirm>
                )}
                error={props.formError}
                onClose={requestClose}
                open={props.open}
                submitAction={(
                    <InExButton kind="primary" aria-busy={isUpdating} onClick={updateTransactionHandler}
                        disabled={busy || !dirty || (isCorrection && (!state.comment.trim() || state.amount === 0))}>
                        {t(isUpdating ? "transactions.saving" : "transactions.save")}
                    </InExButton>
                )}
                subtitle={props.subtitle}
                title={t("transactions.editDrawerTitle")}
            >
                <Form className="transactions-edit-form" layout="vertical">
                    <Form.Item label={t("transactions.account")} htmlFor="account" required>
                        <Dropdown id="account" items={accounts} showCurrency multiple={false} onChange={setAccountHandler}
                            placeholder={t("transactions.selectAccount")} selection={state.account.id > 0 ? [state.account] : []} />
                    </Form.Item>
                    <Form.Item label={t("transactions.amount")} htmlFor="edit_amount" required>
                        <CreationAmount editing id="edit_amount" currency={state.account.currency} value={state.amount}
                            onAmountDraftChange={(_, incomplete) => { incompleteAmount.current = incomplete; }}
                            onChange={value => dispatchTransactionAction({ type: "SET_AMOUNT", value: value ?? 0 })} />
                    </Form.Item>
                    <Form.Item label={t("transactions.category")} htmlFor="category" required>
                        {state.category.isSystem ? <Input id="category" readOnly value={isCorrection ? t("transactions.correction") : state.category.name} /> : <Dropdown
                            id="category" items={categoryTree} multiple={false} onChange={setCategoryHandler}
                            searchPlaceholder={t("transactions.searchCategories")}
                            placeholder={t("transactions.selectCategory")} selection={state.category.id > 0 ? [state.category] : []} />}
                    </Form.Item>
                    <CreationDate date={state.date} onChange={setDateHandler} />
                    <CreationComment comment={state.comment} onChange={setCommentHandler} required={isCorrection} />
                </Form>
            </FormDrawer>
            <TransactionDiscardDialog
                open={confirmDiscard}
                onKeepEditing={() => setConfirmDiscard(false)}
                onDiscard={() => {
                    setConfirmDiscard(false);
                    props.onClose();
                }}
            />
        </>
    );
};

// Reinitialize local controls, including optional comment disclosure, for a new record.
const TransactionEditForm = (props: TransactionEditFormProps) => <TransactionEditFields key={props.record.id} {...props} />;
export default TransactionEditForm;
