import * as React from "react";

import { useEffect, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "../../store/hooks";

import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { InputNumber, Input, Button, Space, Divider, Popconfirm } from 'antd';
import { Form, Col, Row } from 'antd';
import { DatePicker } from "antd";

import { CategoryDetails, getCategoriesTree } from "../../model/Category/CategoryDetails";
import { AccountDetails } from "../../model/Account/AccountDetails";
import { TransactionEditState } from "../../model/Transaction/TransactionEditState";
import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import { transactionsActions } from "../../store/transactions/transactions-slice";
import { useDeleteTransactionMutation, useUpdateTransactionMutation } from "../../store/transactions/transactions-api";
import { parseAxiosError } from "../../utils/parseAxiosError";


const defaultState: TransactionEditState = new TransactionEditState();

interface TransactionEditFormProps {
    accounts: any[];
    categories: any[];
    onMutationSuccess: (focusTransactionId: number | null) => void;
    record: any;
}

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

const TransactionEditForm = (props: TransactionEditFormProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const [updateTransactionMutation, { isLoading: isUpdating }] = useUpdateTransactionMutation();
    const [deleteTransactionMutation, { isLoading: isDeleting }] = useDeleteTransactionMutation();

    const [state, dispatchTransactionAction] = useReducer(reducer, defaultState);

    const { categories, accounts, record } = props;

    useEffect(() => {
      const currentRecord: TransactionEditState = new TransactionEditState();

      const account = accounts.find((i: any) => i.id === record.accountId);
      currentRecord.account = account ?? Object.assign(new AccountDetails(), {
        id: record.accountId,
        currency: record.accountCurrency,
        name: t("transactions.unknownAccount"),
      });

      const category = categories.find((i: any) => i.id === record.categoryId);
      if (category) {
        currentRecord.category = category;
      }

      currentRecord.amount = record.amount;
      currentRecord.date = dayjs(record.created, "YYYY-MM-DD");
      currentRecord.comment = record.comment;

      dispatchTransactionAction({ type: "INIT", value: currentRecord });
    }, [record, categories, accounts, t]);

    const categoryTree = useMemo(() => getCategoriesTree(categories, false, t("categories.systemGroup")) as CategoryDetails[], [categories, t]);

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

    const setDateHandler = (value: Dayjs | null, _dateString: string | string[]) => {
      dispatchTransactionAction({ type: "SET_DATE", value: value ?? dayjs() });
    };

    const setCommentHandler = (item: any) => {
      dispatchTransactionAction({type: "SET_COMMENT", value: item.target.value});
    };

    const updateTransactionHandler = async () => {
      try {
        await updateTransactionMutation({
          id: +props.record.id,
          accountId: +state.account.id,
          categoryId: +state.category.id,
          amount: state.amount,
          comment: state.comment,
          created: state.date.format("YYYY-MM-DD"),
        }).unwrap();
        dispatch(transactionsActions.setError({ error: null }));
        props.onMutationSuccess(+props.record.id);
      } catch (error) {
        dispatch(transactionsActions.setError({ error: parseAxiosError(error, t("transactions.formErrors.updateFailure"), t) }));
      }
    };

    const removeTransactionHandler = async () => {
      try {
        await deleteTransactionMutation(+props.record.id).unwrap();
        dispatch(transactionsActions.setError({ error: null }));
        props.onMutationSuccess(null);
      } catch {
        dispatch(transactionsActions.setError({ error: t("transactions.formErrors.saveFailure") }));
      }
    };

    return (
        <Form layout="vertical" hideRequiredMark>
            <Row gutter={8}>
                <Col xs={24} sm={12}>
                    <Form.Item
                        label={t("transactions.account")}
                    >
                        <Dropdown id="account" selection={[state.account]} onChange={setAccountHandler} items={props.accounts} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col xs={24} sm={12}>
                    <Form.Item label={t("transactions.category")}>
                        <Dropdown id="category" selection={[state.category]} onChange={setCategoryHandler} items={categoryTree} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col xs={24} sm={12}>
                    <Form.Item label={t("transactions.amount")}>
                        <ExpressionInputNumber
                            key="amount"
                            size="large"
                            onChange={setAmountHandler}
                            addonAfter={state.account.currency}
                            value={state.amount}
                            precision={2}
                            placeholder={t("common.enterAmount")}
                        />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col xs={24} sm={12}>
                    <Form.Item label={t("transactions.date")}>
                        <DatePicker mode="date" size="large" value={state.date} onChange={setDateHandler} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.comment")}>
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
                        <Popconfirm
                            title={t("transactions.deleteConfirm")}
                            onConfirm={removeTransactionHandler}
                            okText={t("common.yes")}
                            cancelText={t("common.no")}
                        >
                            <Button danger loading={isDeleting}>
                                {t("transactions.delete")}
                            </Button>
                        </Popconfirm>
                    </Space>
                </Col>
                <Col span={12} style={{textAlign: "right"}}>
                    <Space>
                        <Button loading={isUpdating} onClick={updateTransactionHandler} disabled={!state.hasActiveChanges} type="primary">
                            {t("transactions.save")}
                        </Button>
                    </Space>
                </Col>
            </Row>
        </Form>
    );
};

export default TransactionEditForm;
