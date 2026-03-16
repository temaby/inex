import * as React from 'react';
import { InputNumber, Input, DatePicker } from 'antd';
import { Form, Col, Row} from 'antd';

import Dropdown from '../../components/Dropdown';
import ExpressionInputNumber from '../../components/ExpressionInputNumber';

const TransactionCreateExpenseForm = (props: any) => {
    return (
        <Form layout="vertical" hideRequiredMark>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Счёт">
                        <Dropdown id="expense_account" selection={[props.fromAccount]} onChange={props.onSetFromAccount} items={props.accounts} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Категория">
                        <Dropdown id="expense_category" selection={[props.category]} onChange={props.onSetCategory} items={props.categories} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Сумма" rules={[{ required: true, message: 'Введите сумму' }]}>
                        <ExpressionInputNumber key="expense_amount" size="large" onChange={props.onSetFromAmount} addonAfter={props.fromAccount.currency} value={props.fromAmount} precision={2} placeholder="Введите сумму или выражение" />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Дата">
                        <DatePicker mode="date" value={props.date} onChange={props.onSetDate} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Комментарий">
                        <Input key="expense_comment" size="large" onChange={props.onSetComment} value={props.comment} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default TransactionCreateExpenseForm;