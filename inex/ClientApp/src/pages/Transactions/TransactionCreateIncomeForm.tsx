import * as React from 'react';
import { useTranslation } from "react-i18next";
import { Input } from 'antd';
import { Form, Col, Row } from 'antd';
import { DatePicker } from "antd";

import Dropdown from '../../components/Dropdown';
import ExpressionInputNumber from '../../components/ExpressionInputNumber';

const TransactionCreateIncomeForm = (props: any) => {
    const { t } = useTranslation();
    return (
        <Form layout="vertical" hideRequiredMark>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.account")}>
                        <Dropdown id='income_account' selection={[props.toAccount]} onChange={props.onSetToAccount} items={props.accounts} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.category")}>
                        <Dropdown id='income_category' selection={[props.category]} onChange={props.onSetCategory} items={props.categories} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.amount")}>
                        <ExpressionInputNumber key="income_amount" size="large" onChange={props.onSetToAmount} addonAfter={props.toAccount.currency} value={props.toAmount} precision={2} placeholder={t("common.enterAmount")} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.date")}>
                        <DatePicker mode="date" value={props.date} onChange={props.onSetDate} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label={t("transactions.comment")}>
                        <Input key="income_comment" size="large" onChange={props.onSetComment} value={props.comment} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default TransactionCreateIncomeForm;
