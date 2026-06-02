import * as React from 'react';
import { useReducer, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, Space, Button } from 'antd';
import { useAppDispatch } from '../../store/hooks';

import TransactionCreateExpenseForm from './TransactionCreateExpenseForm';
import TransactionCreateIncomeForm from './TransactionCreateIncomeForm';
import TransactionCreateTransferForm from './TransactionCreateTransferForm';

import { CategoryDetails, getCategoriesTree } from '../../model/Category/CategoryDetails';

import { TransactionSetState } from '../../model/Transaction/TransactionSetState';
import { TransactionType } from '../../model/Transaction/TransactionType';
import type { Dayjs } from 'dayjs';
import { transactionsActions } from '../../store/transactions/transactions-slice';
import { useCreateTransactionMutation, useCreateTransferMutation } from '../../store/transactions/transactions-api';

const defaultState: TransactionSetState = new TransactionSetState();

const reducer = (state: TransactionSetState, action: any) => {
  if (action.type === "SET_MODE") {
    return { ...defaultState, mode: action.value };
  } else if (action.type === "SET_AMOUNT_FROM") {
    return { ...state, fromAmount: action.value };
  } else if (action.type === "SET_AMOUNT_TO") {
    return { ...state, toAmount: action.value };
  } else if (action.type === "SET_ACCOUNT_FROM") {
    return { ...state, fromAccount: action.value };
  } else if (action.type === "SET_ACCOUNT_TO") {
    return { ...state, toAccount: action.value };
  } else if (action.type === "SET_CATEGORY") {
    return { ...state, category: action.value };
  } else if (action.type === "SET_DATE") {
    return { ...state, date: action.value };
  } else if (action.type === "SET_COMMENT") {
    return { ...state, comment: action.value };
  }
  return defaultState;
};

const TransactionCreate = (props: any) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const [createTransactionMutation, { isLoading: isCreating }] = useCreateTransactionMutation();
    const [createTransferMutation, { isLoading: isCreatingTransfer }] = useCreateTransferMutation();

    const { categories } = props;

    const categoryTree = useMemo(() => getCategoriesTree(categories, false, t("categories.systemGroup")) as CategoryDetails[], [categories, t]);

    const [state, dispatchTransactionAction] = useReducer(reducer, defaultState);

    const setModeHandler = (item: string) => {
      dispatchTransactionAction({ type: "SET_MODE", value: item });
    };

    const setFromAmountHandler = (item: number) => {
      dispatchTransactionAction({ type: "SET_AMOUNT_FROM", value: item });
    };

    const setToAmountHandler = (item: number) => {
      dispatchTransactionAction({ type: "SET_AMOUNT_TO", value: item });
    };

    const setFromAccountHandler = (item: any) => {
      const account = props.accounts.find((i: any) => i.id === +item.key);
      if (account) {
        dispatchTransactionAction({ type: "SET_ACCOUNT_FROM", value: account });
      }
    };

    const setToAccountHandler = (item: any) => {
      const account = props.accounts.find((i: any) => i.id === +item.key);
      if (account) {
        dispatchTransactionAction({ type: "SET_ACCOUNT_TO", value: account });
      }
    };

    const setCategoryHandler = (item: any) => {
      const category = categoryTree.find((i: any) => i.id === +item.keyPath[item.keyPath.length - 2]);
      if (category && category.children) {
        const subcategories = category.children;
        const subcategory = subcategories.find((j: any) => j.id === +item.key);
        if (subcategory) {
          dispatchTransactionAction({ type: "SET_CATEGORY", value: subcategory });
        }
      }
    };

    const setDateHandler = (item: Dayjs) => {
      dispatchTransactionAction({ type: "SET_DATE", value: item });
    };

    const setCommentHandler = (item: any) => {
      dispatchTransactionAction({ type: "SET_COMMENT", value: item.target.value });
    };

    const saveTransactionHandler = async () => {
      try {
        if (state.mode === TransactionType.EXPENSE) {
          await createTransactionMutation({
            accountId: +state.fromAccount.id,
            categoryId: +state.category.id,
            amount: 0 - state.fromAmount,
            comment: state.comment,
            created: state.date.format("YYYY-MM-DD"),
          }).unwrap();
        } else if (state.mode === TransactionType.INCOME) {
          await createTransactionMutation({
            accountId: +state.toAccount.id,
            categoryId: +state.category.id,
            amount: +state.toAmount,
            comment: state.comment,
            created: state.date.format("YYYY-MM-DD"),
          }).unwrap();
        } else if (state.mode === TransactionType.TRANSFER) {
          await createTransferMutation({
            accountFromId: +state.fromAccount.id,
            accountToId: +state.toAccount.id,
            amountFrom: +state.fromAmount,
            amountTo: +state.toAmount,
            comment: state.comment,
            created: state.date.format("YYYY-MM-DD"),
          }).unwrap();
        }
      } catch {
        dispatch(transactionsActions.setError({ error: "Could not create a transaction" }));
        return;
      }

        setModeHandler(TransactionType.EXPENSE);
        props.onSubmit();
    };

    const tabItems = [
        {
            key: TransactionType.EXPENSE,
            label: t("transactions.expense"),
            children: (
                <TransactionCreateExpenseForm
                    accounts={props.accounts}
                    fromAccount={state.fromAccount}
                    onSetFromAccount={setFromAccountHandler}
                    categories={categoryTree}
                    category={state.category}
                    onSetCategory={setCategoryHandler}
                    fromAmount={state.fromAmount}
                    onSetFromAmount={setFromAmountHandler}
                    date={state.date}
                    onSetDate={setDateHandler}
                    comment={state.comment}
                    onSetComment={setCommentHandler}
                />
            ),
        },
        {
            key: TransactionType.INCOME,
            label: t("transactions.income"),
            children: (
                <TransactionCreateIncomeForm
                    accounts={props.accounts}
                    toAccount={state.toAccount}
                    onSetToAccount={setToAccountHandler}
                    categories={categoryTree}
                    category={state.category}
                    onSetCategory={setCategoryHandler}
                    toAmount={state.toAmount}
                    onSetToAmount={setToAmountHandler}
                    date={state.date}
                    onSetDate={setDateHandler}
                    comment={state.comment}
                    onSetComment={setCommentHandler}
                />
            ),
        },
        {
            key: TransactionType.TRANSFER,
            label: t("transactions.transfer"),
            children: (
                <TransactionCreateTransferForm
                    accounts={props.accounts}
                    fromAccount={state.fromAccount}
                    onSetFromAccount={setFromAccountHandler}
                    toAccount={state.toAccount}
                    onSetToAccount={setToAccountHandler}
                    fromAmount={state.fromAmount}
                    onSetFromAmount={setFromAmountHandler}
                    toAmount={state.toAmount}
                    onSetToAmount={setToAmountHandler}
                    date={state.date}
                    onSetDate={setDateHandler}
                    comment={state.comment}
                    onSetComment={setCommentHandler}
                />
            ),
        },
    ];

    return (
      <React.Fragment>
        <Tabs
          onChange={setModeHandler}
          activeKey={state.mode.toString()}
          type="card"
          items={tabItems}
        />
        <Space>
          <Button loading={isCreating || isCreatingTransfer} onClick={saveTransactionHandler} type="primary">
            {t("transactions.save")}
          </Button>
        </Space>
      </React.Fragment>
    );
};

export default TransactionCreate;
