import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Button, Radio, Select } from "antd";
import { useCreateAccountMutation } from "../../store/accounts/accounts-api";
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
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();
    const [currencies, setCurrencies] = useState<Currency[]>([]);

    useEffect(() => {
        apiClient.get<Currency[]>("/currencies").then(({ data }) => setCurrencies(data));
    }, []);

    const toKey = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const onFinish = async (values: {
        name: string;
        description?: string;
        currencyId: number;
        isEnabled: boolean;
    }) => {
        await createAccount({
            key: toKey(values.name),
            name: values.name,
            description: values.description ?? "",
            currencyId: values.currencyId,
            isEnabled: values.isEnabled,
        }).unwrap();
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
                label={t("accounts.name")}
                rules={[{ required: true, message: "Name is required" }]}>
                <Input size="large" placeholder={t("accounts.namePlaceholder")} />
            </Form.Item>
            <Form.Item name="description" label={t("accounts.description")}>
                <Input size="large" placeholder={t("accounts.descriptionPlaceholder")} />
            </Form.Item>
            <Form.Item
                name="currencyId"
                label={t("accounts.currency")}
                rules={[{ required: true, message: "Currency is required" }]}>
                <Select
                    size="large"
                    placeholder={t("accounts.currencyPlaceholder")}
                    showSearch
                    optionFilterProp="label"
                    options={currencies.map((c) => ({
                        value: c.id,
                        label: `${c.key} — ${c.name}`,
                    }))}
                />
            </Form.Item>
            <Form.Item name="isEnabled" label={t("accounts.status")}>
                <Radio.Group buttonStyle="solid">
                    <Radio.Button value={true}>{t("accounts.active")}</Radio.Button>
                    <Radio.Button value={false}>{t("accounts.disabled")}</Radio.Button>
                </Radio.Group>
            </Form.Item>
            <Form.Item>
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isCreating}
                    block>
                    {t("accounts.createAccount")}
                </Button>
            </Form.Item>
        </Form>
    );
};

export default AccountCreateForm;
