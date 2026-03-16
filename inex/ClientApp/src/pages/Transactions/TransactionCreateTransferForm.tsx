import * as React from 'react';
import { InputNumber, Input, DatePicker } from 'antd';
import { Form, Col, Row } from 'antd';

import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";

const TransactionCreateTransferForm = (props: any) => {

    return (
        <Form layout="vertical" hideRequiredMark>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Перевод из">
                        <Dropdown id="transfer_from_account" selection={[props.fromAccount]} onChange={props.onSetFromAccount} items={props.accounts} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Сумма" rules={[{ required: true, message: 'Введите сумму' }]}>
                        <ExpressionInputNumber key="transfer_from_amount" size="large" onChange={props.onSetFromAmount} addonAfter={props.fromAccount.currency} value={props.fromAmount} precision={2} placeholder="Введите сумму или выражение" />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Перевод в">
                        <Dropdown id='transfer_to_acccount' selection={[props.toAccount]} onChange={props.onSetToAccount} items={props.accounts} multiple={false} />
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={8}>
                <Col span={24}>
                    <Form.Item label="Сумма" rules={[{ required: true, message: 'Введите сумму' }]}>
                        <ExpressionInputNumber key="transfer_to_amount" size="large" onChange={props.onSetToAmount} addonAfter={props.toAccount.currency} value={props.toAmount} precision={2} placeholder="Введите сумму или выражение" />
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
                        <Input key="transfer_comment" size="large" onChange={props.onSetComment} value={props.comment} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default TransactionCreateTransferForm;