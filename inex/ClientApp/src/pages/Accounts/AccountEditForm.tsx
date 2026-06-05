import * as React from "react";
import { useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Form, Input, Button, Grid, Radio, Select, Space, Divider, Popconfirm } from "antd";

const { useBreakpoint } = Grid;
import { AccountResponse, useDeleteAccountMutation, useUpdateAccountMutation } from "../../store/accounts/accounts-api";
import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";

interface Currency {
    id: number;
    key: string;
    name: string;
}

interface AccountEditState {
    name: string;
    description: string;
    currencyId: number;
    isEnabled: boolean;
    hasActiveChanges: boolean;
}

type AccountEditAction =
    | { type: "INIT"; value: Omit<AccountEditState, "hasActiveChanges"> }
    | { type: "SET_NAME"; value: string }
    | { type: "SET_DESCRIPTION"; value: string }
    | { type: "SET_CURRENCY"; value: number }
    | { type: "SET_ENABLED"; value: boolean };

const reducer = (state: AccountEditState, action: AccountEditAction): AccountEditState => {
    switch (action.type) {
        case "INIT":
            return { ...action.value, hasActiveChanges: false };
        case "SET_NAME":
            return { ...state, name: action.value, hasActiveChanges: true };
        case "SET_DESCRIPTION":
            return { ...state, description: action.value, hasActiveChanges: true };
        case "SET_CURRENCY":
            return { ...state, currencyId: action.value, hasActiveChanges: true };
        case "SET_ENABLED":
            return { ...state, isEnabled: action.value, hasActiveChanges: state.isEnabled !== action.value };
        default:
            return state;
    }
};

interface AccountEditFormProps {
    record: AccountResponse;
}

const AccountEditForm = (props: AccountEditFormProps) => {
    const { t } = useTranslation();
    const [updateAccount, { isLoading: isUpdating }] = useUpdateAccountMutation();
    const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

    const screens = useBreakpoint();
    const isMobile = screens.md === false;

    const [state, dispatchAction] = useReducer(reducer, {
        name: "",
        description: "",
        currencyId: 0,
        isEnabled: true,
        hasActiveChanges: false,
    });

    useEffect(() => {
        apiClient.get<Currency[]>("/currencies").then(({ data }) => setCurrencies(data));
    }, []);

    useEffect(() => {
        const { record } = props;
        dispatchAction({ type: "INIT", value: {
            name: record.name,
            description: record.description ?? "",
            currencyId: record.currencyId ?? 0,
            isEnabled: record.isEnabled,
        }});
    }, [props.record]);

    const updateHandler = async () => {
        setFormError(null);
        try {
            await updateAccount({
                id: +props.record.id,
                key: props.record.key,
                name: state.name,
                description: state.description,
                currencyId: state.currencyId,
                isEnabled: state.isEnabled,
            }).unwrap();
        } catch (error) {
            setFormError(parseAxiosError(error, t("accounts.formErrors.updateFailure"), t));
        }
    };

    const deleteHandler = async () => {
        setFormError(null);
        try {
            await deleteAccount(+props.record.id).unwrap();
        } catch (error) {
            setFormError(parseAxiosError(error, t("accounts.formErrors.deleteFailure"), t));
        }
    };

    return (
        <Form layout="vertical">
            {formError && (
                <Alert
                    className="accounts-form-error"
                    message={formError}
                    showIcon
                    type="error"
                />
            )}
            <Form.Item label={t("accounts.name")}>
                <Input
                    size="large"
                    value={state.name}
                    onChange={(e) => dispatchAction({ type: "SET_NAME", value: e.target.value })}
                />
            </Form.Item>
            <Form.Item label={t("accounts.description")}>
                <Input
                    size="large"
                    value={state.description}
                    onChange={(e) => dispatchAction({ type: "SET_DESCRIPTION", value: e.target.value })}
                />
            </Form.Item>
            <Form.Item label={t("accounts.currency")}>
                <Select
                    size="large"
                    value={state.currencyId || undefined}
                    showSearch
                    optionFilterProp="label"
                    onChange={(v) => dispatchAction({ type: "SET_CURRENCY", value: v })}
                    options={currencies.map((c) => ({
                        value: c.id,
                        label: `${c.key} - ${c.name}`,
                    }))}
                />
            </Form.Item>
            <Divider />
            <Form.Item>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 12 : 0 }}>
                    <Radio.Group
                        buttonStyle="solid"
                        value={state.isEnabled}
                        onChange={(e) => dispatchAction({ type: "SET_ENABLED", value: e.target.value })}>
                        <Radio.Button value={true}>{t("accounts.active")}</Radio.Button>
                        <Radio.Button value={false}>{t("accounts.disabled")}</Radio.Button>
                    </Radio.Group>
                    <Space>
                        <Popconfirm
                            title={t("accounts.deleteConfirm")}
                            onConfirm={deleteHandler}
                            okText={t("accounts.delete")}
                            cancelText={t("accounts.cancel")}>
                            <Button danger loading={isDeleting}>{t("accounts.delete")}</Button>
                        </Popconfirm>
                        <Button
                            type="primary"
                            loading={isUpdating}
                            disabled={!state.hasActiveChanges}
                            onClick={updateHandler}>
                            {t("accounts.update")}
                        </Button>
                    </Space>
                </div>
            </Form.Item>
        </Form>
    );
};

export default AccountEditForm;
