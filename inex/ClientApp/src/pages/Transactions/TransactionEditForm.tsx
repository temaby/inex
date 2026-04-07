import * as React from "react";

import { useEffect, useMemo, useReducer } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

import moment from "moment";
import { Moment } from "moment";

import { InputNumber, Input, DatePicker, Button, Space, Divider, Popconfirm } from 'antd';
import { Form, Col, Row } from 'antd';

import { CategoryDetails, getCategoriesTree } from "../../model/Category/CategoryDetails";
import { TransactionEditState } from "../../model/Transaction/TransactionEditState";
import Dropdown from "../../components/Dropdown";
import { removeTransaction, updateTransaction } from "../../store/transactions/transactions-actions";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";


const defaultState: TransactionEditState = new TransactionEditState();

const reducer = (state: TransactionEditState, action: any) => {
  if (action.type === "INIT") {
    return { ...state, ...action.value, hasActiveChanges: false };
  } else if (action.type === "SET_AMOUNT") {
    return { ...state, amount: action.value, hasActiveChanges: true };
  } else if (action.type === "SET_ACCOUNT") {
    return { ...state, account: action.value, hasActiveChanges: state.account.id !== action.value.id };
  } else if (action.type === "SET_CATEGORY") {
    return { ...state, category: action.value, hasActiveChanges: state.category.id !== action.value.id };
  } else if (action.type === "SET_DATE") {
    return { ...state, date: action.value, hasActiveChanges: state.date !== action.value };
  } else if (action.type === "SET_COMMENT") {
    return { ...state, comment: action.value, hasActiveChanges: state.comment !== action.value };
  }
  return defaultState;
};

const TransactionEditForm = (props: any) => {
    const dispatch = useAppDispatch();

    const isDeleting = useAppSelector(state => state.transactions.isDeleting);
    const isUpdating = useAppSelector(state => state.transactions.isUpdating);

    const [state, dispatchTransactionAction] = useReducer(reducer, defaultState);

    const { categories, accounts, record } = props;

    useEffect(() => {
      const currentRecord: TransactionEditState = new TransactionEditState();

      const account = accounts.find((i: any) => i.id === record.accountId);
      if (account) {
        currentRecord.account = account;
      }

      const category = categories.find((i: any) => i.id === record.categoryId);
      if (category) {
        currentRecord.category = category;
      }

      currentRecord.amount = record.amount;
      currentRecord.date = moment(record.created, "YYYY-MM-DD");
      currentRecord.comment = record.comment;

      dispatchTransactionAction({ type: "INIT", value: currentRecord });
    }, [record, categories, accounts]);

    const categoryTree = useMemo(() => getCategoriesTree(categories, false) as CategoryDetails[], [categories]);

    const setAmountHandler = (value: number | null) => {
      dispatchTransactionAction({ type: "SET_AMOUNT", value: value ?? 0 });
    };

    const setAccountHandler = (item: any) => {
      const account = props.accounts.find((i: any) => i.id === +item.key);
      if (account) {
        dispatchTransactionAction({ type: "SET_ACCOUNT", value: account });
      }
    };

    const setCategoryHandler = (item: any) => {
      const category = categoryTree.find(
        (i: any) => i.id === +item.keyPath[item.keyPath.length - 2]
      );
      if (category && category.children) {
        const subcategories = category.children;
        const subcategory = subcategories.find((j: any) => j.id === +item.key);
        if (subcategory) {
          dispatchTransactionAction({
            type: "SET_CATEGORY",
            value: subcategory,
          });
        }
      }
    };

    const setDateHandler = (value: Moment | null, _dateString: string) => {
      dispatchTransactionAction({ type: "SET_DATE", value: value ?? moment() });
    };

    const setCommentHandler = (item: any) => {
      dispatchTransactionAction({type: "SET_COMMENT", value: item.target.value});
    };

    const updateTransactionHandler = async () => {
      dispatch(updateTransaction(+props.record.id, +state.account.id, +state.category.id, state.amount, state.comment, state.date));         
    };

    const removeTransactionHandler = async () => {
      dispatch(removeTransaction(+props.record.id));
    };

    return (
        <Form layout="vertical" hideRequiredMark>
            <Row gutter={8}>
                <Col span={12}>
                    <Form.Item label="Счёт">
                        <Dropdown id="account" selection={[state.account]} onChange={setAccountHandler} items={props.accounts} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Form.Item label="Категория">
                        <Dropdown id="category" selection={[state.category]} onChange={setCategoryHandler} items={categoryTree} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={6}>
                    <Form.Item label="Сумма" rules={[{ required: true, message: 'Введите сумму' }]}>
                        <ExpressionInputNumber
                            key="amount"
                            size="large"
                            onChange={setAmountHandler}
                            addonAfter={state.account.currency}
                            value={state.amount}
                            precision={2}
                            placeholder="Введите сумму или выражение"
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={6}>
                    <Form.Item label="Дата">
                        <DatePicker mode="date" size="large" value={state.date} onChange={setDateHandler} />
                    </Form.Item>
                </Col>                
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Комментарий">
                        <Input key="comment" size="large" onChange={setCommentHandler} value={state.comment} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24} style={{textAlign: "right"}}>
                    <Divider />
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={12}>
                    <Space>
                        <Popconfirm title="Вы уверены, что хотите удалить транзакцию?" onConfirm={removeTransactionHandler} okText="Да" cancelText="Нет">
                            <Button danger loading={isDeleting}>
                                Удалить
                            </Button>
                        </Popconfirm>
                    </Space>
                </Col>
                <Col span={12} style={{textAlign: "right"}}>
                    <Space>
                        <Button loading={isUpdating} onClick={updateTransactionHandler} disabled={!state.hasActiveChanges} type="primary">
                            Сохранить
                        </Button>
                    </Space>
                </Col>
            </Row>            
        </Form>
    );
};

export default TransactionEditForm;
