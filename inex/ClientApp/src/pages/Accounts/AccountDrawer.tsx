import * as React from "react";
import { useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Popconfirm, Select, Switch } from "antd";
import { useTranslation } from "react-i18next";

import { InExButton, InExDrawer, RECORD_EDITOR_DRAWER_WIDTH } from "../../components/primitives";
import {
    useCreateAccountMutation,
    useDeleteAccountMutation,
    useUpdateAccountMutation,
} from "../../store/accounts/accounts-api";
import { parseAxiosError } from "../../utils/parseAxiosError";
import type { AccountDisplay } from "./accounts-utils";

export interface CurrencyOption {
    id: number;
    key: string;
    name: string;
}

export type AccountDrawerSession = { mode: "create" } | { mode: "edit" | "view"; account: AccountDisplay };
export type AccountMutation = "create" | "update" | "delete";

interface AccountFormValues {
    name: string;
    description: string;
    currencyId?: number;
    isEnabled: boolean;
    isFavourite: boolean;
}

interface AccountDrawerProps {
    session: AccountDrawerSession;
    open: boolean;
    currencies: CurrencyOption[];
    currencyStatus: "loading" | "ready" | "error";
    information?: React.ReactNode;
    onClose: () => void;
    afterOpenChange: (open: boolean) => void;
    onMutationSuccess: (mutation: AccountMutation) => void;
    onRetryCurrencies: () => void;
}

const AccountDrawer = ({
    session,
    open,
    currencies,
    currencyStatus,
    information,
    onClose,
    afterOpenChange,
    onMutationSuccess,
    onRetryCurrencies,
}: AccountDrawerProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<AccountFormValues>();
    const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();
    const [updateAccount, { isLoading: isUpdating }] = useUpdateAccountMutation();
    const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const mutationInFlight = useRef(false);
    const account = session.mode === "create" ? null : session.account;
    const isEditing = session.mode === "edit";
    const isSaving = isCreating || isUpdating;
    const busy = isSaving || isDeleting;
    const initialValues: AccountFormValues = {
        name: account?.name ?? "",
        description: account?.description ?? "",
        currencyId: account?.currencyId || undefined,
        isEnabled: account?.isEnabled ?? true,
        isFavourite: account?.isFavourite ?? true,
    };

    const currencyOptions = currencies.map(({ id, key, name }) => ({
        value: id,
        label: name ? `${key} - ${name}` : key,
    }));
    if (account?.currencyId && !currencies.some(({ id }) => id === account.currencyId)) {
        currencyOptions.unshift({ value: account.currencyId, label: account.currency });
    }

    const requestClose = () => {
        if (mutationInFlight.current) return;
        if (dirty) {
            setConfirmDiscard(true);
        } else {
            onClose();
        }
    };

    const runMutation = async (mutation: AccountMutation, request: () => Promise<unknown>) => {
        if (mutationInFlight.current) return;
        mutationInFlight.current = true;
        setFormError(null);
        try {
            await request();
            onMutationSuccess(mutation);
        } catch (error) {
            setFormError(parseAxiosError(error, t(`accounts.formErrors.${mutation}Failure`), t));
        } finally {
            mutationInFlight.current = false;
        }
    };

    const save = (values: AccountFormValues) => {
        if (!values.currencyId || (isEditing && !dirty)) return;
        const payload = { ...values, currencyId: values.currencyId };
        if (session.mode === "edit") {
            return runMutation("update", () => updateAccount({
                ...payload,
                id: session.account.id,
                key: session.account.key,
            }).unwrap());
        }
        if (session.mode === "create") {
            const key = values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            return runMutation("create", () => createAccount({ ...payload, key }).unwrap());
        }
    };

    const title = {
        create: t("accounts.addDrawerTitle"),
        edit: t("accounts.editDrawerTitle"),
        view: t("accounts.snapshot.title"),
    }[session.mode];

    return (
        <>
            <InExDrawer
                afterOpenChange={afterOpenChange}
                onClose={requestClose}
                open={open}
                subtitle={account?.name}
                title={title}
                width={RECORD_EDITOR_DRAWER_WIDTH}
            >
                {session.mode === "view" ? information : (
                    <Form
                        disabled={busy}
                        form={form}
                        id="account-editor"
                        initialValues={initialValues}
                        layout="vertical"
                        name="account-editor"
                        onFinish={save}
                        onSubmitCapture={(event) => {
                            if (!mutationInFlight.current) return;
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onValuesChange={(_, values: AccountFormValues) => setDirty(
                            values.name !== initialValues.name
                            || values.description !== initialValues.description
                            || values.currencyId !== initialValues.currencyId
                            || values.isEnabled !== initialValues.isEnabled
                            || values.isFavourite !== initialValues.isFavourite,
                        )}
                        scrollToFirstError={{ focus: true }}
                    >
                        {formError && <Alert className="accounts-form-error" message={formError} showIcon type="error" />}
                        <section aria-labelledby="account-basic-information" className="accounts-drawer-section">
                            <h2 id="account-basic-information">{t("accounts.basicInformation")}</h2>
                            <Form.Item
                                name="name"
                                label={t("accounts.name")}
                                rules={[
                                    { required: true, whitespace: true, message: t("accounts.formErrors.nameRequired") },
                                    { max: 256, message: t("errors.name.max_length") },
                                ]}
                            >
                                <Input placeholder={t("accounts.namePlaceholder")} />
                            </Form.Item>
                            <Form.Item name="description" label={t("accounts.description")}>
                                <Input placeholder={t("accounts.descriptionPlaceholder")} />
                            </Form.Item>
                            <Form.Item
                                name="currencyId"
                                label={t("accounts.currency")}
                                extra={currencyStatus === "error" && (
                                    <div className="accounts-inline-retry" role="status">
                                        {t("accounts.formErrors.currenciesFailure")}
                                        <button disabled={busy} onClick={onRetryCurrencies} type="button">
                                            {t("accounts.error.retry")}
                                        </button>
                                    </div>
                                )}
                                rules={[
                                    { required: true, type: "number", min: 1, message: t("accounts.formErrors.currencyRequired") },
                                ]}
                            >
                                <Select
                                    loading={currencyStatus === "loading"}
                                    optionFilterProp="label"
                                    options={currencyOptions}
                                    placeholder={t("accounts.currencyPlaceholder")}
                                    showSearch
                                />
                            </Form.Item>
                        </section>
                        <section aria-labelledby="account-settings" className="accounts-drawer-section accounts-drawer-section--settings">
                            <h2 id="account-settings">{t("accounts.settings")}</h2>
                            <div className="accounts-drawer-setting">
                                <label htmlFor="account-active">{t("accounts.activeSetting")}</label>
                                <Form.Item name="isEnabled" noStyle valuePropName="checked">
                                    <Switch id="account-active" />
                                </Form.Item>
                            </div>
                            <div className="accounts-drawer-setting">
                                <label htmlFor="account-in-overviews">{t("accounts.favouriteSetting")}</label>
                                <Form.Item name="isFavourite" noStyle valuePropName="checked">
                                    <Switch id="account-in-overviews" />
                                </Form.Item>
                            </div>
                        </section>
                        {isEditing && account && (
                            <>
                                <details className="accounts-drawer-information" data-qa="account-drawer-information">
                                    <summary>{t("accounts.snapshot.title")}</summary>
                                    {information}
                                </details>
                                <div className="accounts-drawer-secondary-actions">
                                    <Popconfirm
                                        cancelText={t("accounts.cancel")}
                                        disabled={busy}
                                        okButtonProps={{ danger: true }}
                                        okText={t("accounts.delete")}
                                        onConfirm={() => runMutation("delete", () => deleteAccount(account.id).unwrap())}
                                        title={t("accounts.deleteConfirm")}
                                    >
                                        <Button danger htmlType="button" loading={isDeleting} type="text">
                                            {t("accounts.delete")}
                                        </Button>
                                    </Popconfirm>
                                </div>
                            </>
                        )}
                        <div className="inex-drawer-actions inex-drawer-actions--sticky">
                            <InExButton disabled={busy} onClick={requestClose}>
                                {t("accounts.cancel")}
                            </InExButton>
                            <InExButton aria-busy={isSaving} disabled={busy || (isEditing && !dirty)} kind="primary" type="submit">
                                {t(isSaving ? "accounts.saving" : isEditing ? "accounts.save" : "accounts.createAccount")}
                            </InExButton>
                        </div>
                    </Form>
                )}
            </InExDrawer>
            <Modal
                cancelText={t("accounts.keepEditing")}
                okButtonProps={{ danger: true }}
                okText={t("accounts.discardChanges")}
                onCancel={() => setConfirmDiscard(false)}
                onOk={() => {
                    setConfirmDiscard(false);
                    onClose();
                }}
                open={confirmDiscard}
                title={t("accounts.discardConfirm")}
            />
        </>
    );
};

export default AccountDrawer;
