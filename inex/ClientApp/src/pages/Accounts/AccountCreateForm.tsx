import * as React from "react";
import { useEffect, useState } from "react";
import { Form, Input, Button, Radio, Select } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { createAccount } from "../../store/accounts/accounts-actions";
import apiClient from "../../utils/apiClient";

interface Currency {
    id: number;
    key: string;
    name: string;
}

interface AccountCreateFormProps {
    onCreated: () => void;
}

const AccountCreateForm = ({ onCreated }: AccountCreateFormProps) => {
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    const isCreating = useSelector((state: any) => state.accounts.isCreating);
    const [currencies, setCurrencies] = useState<Currency[]>([]);

    useEffect(() => {
        apiClient.get<Currency[]>("/currencies").then(({ data }) => setCurrencies(data));
    }, []);

    const toKey = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const onFinish = async (values: any) => {
        await dispatch(createAccount(toKey(values.name), values.name, values.description ?? "", values.currencyId, values.isEnabled));
        form.resetFields();
        onCreated();
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ isEnabled: true }}>
            <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: "Name is required" }]}>
                <Input size="large" placeholder="Account name" />
            </Form.Item>
            <Form.Item name="description" label="Description">
                <Input size="large" placeholder="Optional description" />
            </Form.Item>
            <Form.Item
                name="currencyId"
                label="Currency"
                rules={[{ required: true, message: "Currency is required" }]}>
                <Select
                    size="large"
                    placeholder="Select currency"
                    showSearch
                    optionFilterProp="label"
                    options={currencies.map((c) => ({
                        value: c.id,
                        label: `${c.key} — ${c.name}`,
                    }))}
                />
            </Form.Item>
            <Form.Item name="isEnabled" label="Status">
                <Radio.Group buttonStyle="solid">
                    <Radio.Button value={true}>Active</Radio.Button>
                    <Radio.Button value={false}>Disabled</Radio.Button>
                </Radio.Group>
            </Form.Item>
            <Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isCreating}
                    block>
                    Create Account
                </Button>
            </Form.Item>
        </Form>
    );
};

export default AccountCreateForm;
