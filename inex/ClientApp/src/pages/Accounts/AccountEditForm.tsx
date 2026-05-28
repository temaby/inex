import * as React from "react";
import { useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { Form, Input, Button, Grid, Radio, Select, Space, Divider, Popconfirm } from "antd";

const { useBreakpoint } = Grid;
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateAccount, deleteAccount } from "../../store/accounts/accounts-actions";
import apiClient from "../../utils/apiClient";

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

const reducer = (state: AccountEditState, action: any): AccountEditState => {
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

const AccountEditForm = (props: any) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const isUpdating = useAppSelector(state => state.accounts.isUpdating);
    const [currencies, setCurrencies] = useState<Currency[]>([]);

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

    const updateHandler = () => {
        dispatch(updateAccount(+props.record.id, props.record.key, state.name, state.description, state.currencyId, state.isEnabled));
    };

    const deleteHandler = () => {
        dispatch(deleteAccount(+props.record.id));
    };

    return (
        <Form layout="vertical">
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
                        label: `${c.key} — ${c.name}`,
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
                            <Button danger>{t("accounts.delete")}</Button>
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
