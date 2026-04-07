import * as React from 'react';
import { useReducer, useMemo } from "react";
import { Tabs, Space, Button } from 'antd';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

const { TabPane } = Tabs;

import TransactionCreateExpenseForm from './TransactionCreateExpenseForm';
import TransactionCreateIncomeForm from './TransactionCreateIncomeForm';
import TransactionCreateTransferForm from './TransactionCreateTransferForm';

import { CategoryDetails, getCategoriesTree } from '../../model/Category/CategoryDetails';

import { TransactionSetState } from '../../model/Transaction/TransactionSetState';
import { TransactionType } from '../../model/Transaction/TransactionType';
import { Moment } from 'moment';
import { createTransaction, createTransfer } from '../../store/transactions/transactions-actions';

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
    const dispatch = useAppDispatch();

    const isCreating = useAppSelector(state => state.transactions.isCreating);

    const { categories } = props;

    const categoryTree = useMemo(() => getCategoriesTree(categories, false) as CategoryDetails[], [categories]);

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

    const setDateHandler = (item: Moment) => {
      dispatchTransactionAction({ type: "SET_DATE", value: item });
    };

    const setCommentHandler = (item: any) => {
      dispatchTransactionAction({ type: "SET_COMMENT", value: item.target.value });
    };

    const saveTransactionHandler = async () => {
        if (state.mode === TransactionType.EXPENSE) {
          dispatch(createTransaction(+state.fromAccount.id, +state.category.id, 0 - state.fromAmount, state.comment, state.date));
        } else if (state.mode === TransactionType.INCOME) {
          dispatch(createTransaction(+state.toAccount.id, +state.category.id, +state.toAmount, state.comment, state.date));
        } else if (state.mode === TransactionType.TRANSFER) {
          dispatch(createTransfer(+state.fromAccount.id, +state.toAccount.id, 0 - state.fromAmount, +state.toAmount, state.comment, state.date));
        }
        
        setModeHandler(TransactionType.EXPENSE);
        props.onSubmit();
    }    

    return (
      <React.Fragment>
        <Tabs
          onChange={setModeHandler}
          activeKey={state.mode.toString()}
          type="card"
        >
          <TabPane tab="Расход" key={TransactionType.EXPENSE}>
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
          </TabPane>
          <TabPane tab="Доход" key={TransactionType.INCOME}>
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
          </TabPane>
          <TabPane tab="Перевод" key={TransactionType.TRANSFER}>
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
          </TabPane>
        </Tabs>
        <Space>
          <Button loading={isCreating} onClick={saveTransactionHandler} type="primary">
            Сохранить
          </Button>
        </Space>
      </React.Fragment>
    );
};

export default TransactionCreate;