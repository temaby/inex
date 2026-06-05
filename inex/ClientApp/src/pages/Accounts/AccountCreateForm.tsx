import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Form, Input, Button, Radio, Select } from "antd";
import { useCreateAccountMutation } from "../../store/accounts/accounts-api";
import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";

interface Currency {
    id: number;
    key: string;
    name: string;
}

interface AccountCreateFormProps {
    onCancel: () => void;
    onCreated: () => void;
}

const AccountCreateForm = ({ onCancel, onCreated }: AccountCreateFormProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

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
        setFormError(null);
        try {
            await createAccount({
                key: toKey(values.name),
                name: values.name,
                description: values.description ?? "",
                currencyId: values.currencyId,
                isEnabled: values.isEnabled,
            }).unwrap();
            form.resetFields();
            onCreated();
        } catch (error) {
            setFormError(parseAxiosError(error, t("accounts.formErrors.createFailure"), t));
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ isEnabled: true }}>
            {formError && (
                <Alert
                    className="accounts-form-error"
                    message={formError}
                    showIcon
                    type="error"
                />
            )}
            <Form.Item
                name="name"
                label={t("accounts.name")}
                rules={[{ required: true, message: t("accounts.formErrors.nameRequired") }]}>
                <Input size="large" placeholder={t("accounts.namePlaceholder")} />
            </Form.Item>
            <Form.Item name="description" label={t("accounts.description")}>
                <Input size="large" placeholder={t("accounts.descriptionPlaceholder")} />
            </Form.Item>
            <Form.Item
                name="currencyId"
                label={t("accounts.currency")}
                rules={[{ required: true, message: t("accounts.formErrors.currencyRequired") }]}>
                <Select
                    size="large"
                    placeholder={t("accounts.currencyPlaceholder")}
                    showSearch
                    optionFilterProp="label"
                    options={currencies.map((c) => ({
                        value: c.id,
                        label: `${c.key} - ${c.name}`,
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
                <div className="accounts-drawer-actions">
                    <Button
                        disabled={isCreating}
                        onClick={onCancel}
                        size="large"
                        type="default">
                        {t("accounts.cancel")}
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={isCreating}>
                        {t("accounts.createAccount")}
                    </Button>
                </div>
            </Form.Item>
        </Form>
    );
};

export default AccountCreateForm;
