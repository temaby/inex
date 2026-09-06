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
    isFavourite: boolean;
    initialName: string;
    initialDescription: string;
    initialCurrencyId: number;
    initialIsEnabled: boolean;
    initialIsFavourite: boolean;
    hasActiveChanges: boolean;
}

type AccountEditValues = Omit<AccountEditState, "hasActiveChanges">;

type AccountEditAction =
    | { type: "INIT"; value: Omit<AccountEditValues, "initialName" | "initialDescription" | "initialCurrencyId" | "initialIsEnabled" | "initialIsFavourite"> }
    | { type: "SET_NAME"; value: string }
    | { type: "SET_DESCRIPTION"; value: string }
    | { type: "SET_CURRENCY"; value: number }
    | { type: "SET_ENABLED"; value: boolean }
    | { type: "SET_VISIBLE_IN_TRANSACTIONS"; value: boolean };

const hasChanges = (state: AccountEditValues) => (
    state.name !== state.initialName
    || state.description !== state.initialDescription
    || state.currencyId !== state.initialCurrencyId
    || state.isEnabled !== state.initialIsEnabled
    || state.isFavourite !== state.initialIsFavourite
);

const reducer = (state: AccountEditState, action: AccountEditAction): AccountEditState => {
    switch (action.type) {
        case "INIT":
            return {
                ...action.value,
                initialName: action.value.name,
                initialDescription: action.value.description,
                initialCurrencyId: action.value.currencyId,
                initialIsEnabled: action.value.isEnabled,
                initialIsFavourite: action.value.isFavourite,
                hasActiveChanges: false,
            };
        case "SET_NAME": {
            const next = { ...state, name: action.value };
            return { ...next, hasActiveChanges: hasChanges(next) };
        }
        case "SET_DESCRIPTION": {
            const next = { ...state, description: action.value };
            return { ...next, hasActiveChanges: hasChanges(next) };
        }
        case "SET_CURRENCY": {
            const next = { ...state, currencyId: action.value };
            return { ...next, hasActiveChanges: hasChanges(next) };
        }
        case "SET_ENABLED": {
            const next = { ...state, isEnabled: action.value };
            return { ...next, hasActiveChanges: hasChanges(next) };
        }
        case "SET_VISIBLE_IN_TRANSACTIONS": {
            const next = { ...state, isFavourite: action.value };
            return { ...next, hasActiveChanges: hasChanges(next) };
        }
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
        isFavourite: true,
        initialName: "",
        initialDescription: "",
        initialCurrencyId: 0,
        initialIsEnabled: true,
        initialIsFavourite: true,
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
            isFavourite: record.isFavourite ?? true,
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
                isFavourite: state.isFavourite,
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
                    <Form.Item label={t("accounts.favouriteSetting")} style={{ marginBottom: 0 }}>
                        <Radio.Group
                            buttonStyle="solid"
                            value={state.isFavourite}
                            onChange={(e) => dispatchAction({ type: "SET_VISIBLE_IN_TRANSACTIONS", value: e.target.value })}>
                            <Radio.Button value={true}>{t("accounts.favourite")}</Radio.Button>
                            <Radio.Button value={false}>{t("accounts.notFavourite")}</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
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
