import { useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, Switch } from "antd";
import { useTranslation } from "react-i18next";

import { InExButton, Num } from "../../components/primitives";
import { FormDrawer } from "../../components/primitives/FormDrawer";
import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import {
    type CategoryResponse,
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useUpdateCategoryMutation,
} from "../../store/categories/categories-api";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { isSystemCategory } from "./categories.utils";

export type CategoryDrawerSession = { mode: "create" } | { mode: "edit"; category: CategoryResponse };
export type CategoryMutation = "create" | "update" | "delete";
type CategoryConfirmation = "discard" | "delete";

interface CategoryFormValues {
    name: string;
    parentId?: number;
    description: string;
    isEnabled: boolean;
}

export interface CategorySnapshot {
    kind: "expense" | "income";
    amount: number | null;
    transactionCount: number;
    budget?: BudgetDetails;
    currency: string;
    periodLabel: string;
}

interface CategoryDrawerProps {
    session: CategoryDrawerSession;
    open: boolean;
    allCategories: CategoryResponse[];
    snapshot?: CategorySnapshot;
    onClose: () => void;
    afterOpenChange: (open: boolean) => void;
    onMutationSuccess: (mutation: CategoryMutation) => void;
}

const FORM_ID = "category-editor";
const CATEGORY_KEY_MAX_LENGTH = 45;
const CATEGORY_NAME_MAX_LENGTH = 255;
const CATEGORY_DESCRIPTION_MAX_LENGTH = 512;

export const CategoryDrawer = ({
    session,
    open,
    allCategories,
    snapshot,
    onClose,
    afterOpenChange,
    onMutationSuccess,
}: CategoryDrawerProps) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.resolvedLanguage ?? i18n.language;
    const [createCategory] = useCreateCategoryMutation();
    const [updateCategory] = useUpdateCategoryMutation();
    const [deleteCategory] = useDeleteCategoryMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);
    const [confirmation, setConfirmation] = useState<{ action: CategoryConfirmation; open: boolean } | null>(null);
    const [pendingMutation, setPendingMutation] = useState<CategoryMutation | null>(null);
    const mutationInFlight = useRef(false);
    const confirmedAction = useRef<CategoryConfirmation | null>(null);
    const category = session.mode === "edit" ? session.category : undefined;
    const locked = category !== undefined && isSystemCategory(category);
    const isSaving = pendingMutation === "create" || pendingMutation === "update";
    const busy = pendingMutation !== null;
    const initialValues: CategoryFormValues = {
        name: category?.name ?? "",
        description: category?.description ?? "",
        isEnabled: category?.isEnabled ?? true,
    };
    const parent = allCategories.find(({ id }) => id === category?.parentId);
    const parentOptions = allCategories
        .filter((item) => item.isEnabled && item.parentId == null && !isSystemCategory(item))
        .map(({ id, name }) => ({ value: id, label: name }));

    const requestClose = () => {
        if (mutationInFlight.current || confirmedAction.current) return;
        if (dirty) {
            setConfirmation({ action: "discard", open: true });
        } else {
            onClose();
        }
    };

    const runMutation = async (mutation: CategoryMutation, request: () => Promise<unknown>) => {
        if (locked || mutationInFlight.current) return;
        mutationInFlight.current = true;
        setPendingMutation(mutation);
        setFormError(null);
        try {
            await request();
            onMutationSuccess(mutation);
        } catch (error) {
            setFormError(parseAxiosError(error, t(`categories.formErrors.${mutation}Failed`), t));
        } finally {
            mutationInFlight.current = false;
            setPendingMutation(null);
        }
    };

    const save = (values: CategoryFormValues) => {
        const { name, isEnabled } = values;
        const fields = { name, description: values.description ?? "", isEnabled };
        if (category) {
            if (!dirty) return;
            return runMutation("update", () => updateCategory({ ...fields, id: category.id, key: category.key }).unwrap());
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const key = slug && slug.length <= CATEGORY_KEY_MAX_LENGTH ? slug : `category-${Date.now()}`;
        return runMutation("create", () => createCategory({ ...fields, key, parentId: values.parentId ?? null }).unwrap());
    };

    const closeConfirmation = () => {
        setConfirmation((current) => current && { ...current, open: false });
    };

    const finishConfirmation = () => {
        const action = confirmedAction.current;
        confirmedAction.current = null;
        setConfirmation(null);
        if (action === "discard") onClose();
        if (action === "delete" && category) {
            void runMutation("delete", () => deleteCategory(category.id).unwrap());
        }
    };

    return (
        <>
            <FormDrawer
                afterOpenChange={afterOpenChange}
                busy={busy}
                error={formError}
                deleteAction={category && !locked && (
                    <Button
                        aria-haspopup="dialog"
                        danger
                        disabled={busy}
                        htmlType="button"
                        loading={pendingMutation === "delete"}
                        onClick={() => setConfirmation({ action: "delete", open: true })}
                        type="text"
                    >
                        {t("common.delete")}
                    </Button>
                )}
                onClose={requestClose}
                open={open}
                submitAction={!locked && (
                    <InExButton
                        aria-busy={isSaving}
                        disabled={busy || Boolean(category && !dirty)}
                        form={FORM_ID}
                        kind="primary"
                        type="submit"
                    >
                        {t(isSaving ? "categories.saving" : category ? "common.save" : "common.create")}
                    </InExButton>
                )}
                subtitle={category?.name}
                title={t(category ? "categories.editDrawerTitle" : "categories.addDrawerTitle")}
            >
                <Form<CategoryFormValues>
                    disabled={locked || busy}
                    id={FORM_ID}
                    initialValues={initialValues}
                    layout="vertical"
                    name={FORM_ID}
                    onFinish={save}
                    onValuesChange={(_, values) => setDirty(
                        values.name !== initialValues.name
                        || (values.description ?? "") !== initialValues.description
                        || values.parentId !== initialValues.parentId
                        || values.isEnabled !== initialValues.isEnabled,
                    )}
                    scrollToFirstError={{ focus: true }}
                >
                    {locked && <Alert className="categories-alert" message={t("categories.drawer.systemNotice")} showIcon type="info" />}
                    <section aria-labelledby="category-basic-information" className="form-drawer-section">
                        <h2 id="category-basic-information">{t("categories.drawer.basicInformation")}</h2>
                        <Form.Item
                            name="name"
                            label={t("categories.name")}
                            rules={[
                                { required: true, whitespace: true, message: t("errors.name.required") },
                                { max: CATEGORY_NAME_MAX_LENGTH, message: t("errors.name.max_length") },
                            ]}
                        >
                            <Input placeholder={t("categories.namePlaceholder")} />
                        </Form.Item>
                        {category ? (
                            <Form.Item
                                label={t("categories.parentCategory")}
                                htmlFor="category-parent-readonly"
                                extra={<span id="category-parent-hint">{t("categories.drawer.reparentNotSupported")}</span>}
                            >
                                <Input
                                    aria-describedby="category-parent-hint"
                                    id="category-parent-readonly"
                                    readOnly
                                    value={parent?.name ?? t("categories.drawer.noParent")}
                                />
                            </Form.Item>
                        ) : (
                            <Form.Item name="parentId" label={t("categories.parentCategory")}>
                                <Select
                                    allowClear
                                    options={parentOptions}
                                    placeholder={t("categories.parentCategoryPlaceholder")}
                                />
                            </Form.Item>
                        )}
                        <Form.Item
                            name="description"
                            label={t("categories.description")}
                            rules={[{ max: CATEGORY_DESCRIPTION_MAX_LENGTH, message: t("categories.formErrors.descriptionTooLong") }]}
                        >
                            <Input placeholder={t("categories.descriptionPlaceholder")} />
                        </Form.Item>
                    </section>
                    <section aria-labelledby="category-settings" className="form-drawer-section">
                        <h2 id="category-settings">{t("categories.drawer.settings")}</h2>
                        <div className="form-drawer-setting">
                            <label htmlFor="category-active">{t("categories.drawer.activeSetting")}</label>
                            <Form.Item name="isEnabled" noStyle valuePropName="checked">
                                <Switch id="category-active" />
                            </Form.Item>
                        </div>
                    </section>
                    {category && snapshot && (
                        <details className="form-drawer-information" data-qa="category-drawer-information">
                            <summary>{t("categories.drawer.information")}</summary>
                            <p className="category-drawer-period">{snapshot.periodLabel}</p>
                            <dl className="category-drawer-snapshot">
                                <div>
                                    <dt>{t(`categories.snapshot.${snapshot.kind === "income" ? "income" : "spend"}`)}</dt>
                                    <dd>{snapshot.amount != null && snapshot.amount > 0
                                        ? <Num value={snapshot.amount} currency={snapshot.currency} fractionDigits="currency" kind={snapshot.kind} locale={locale} />
                                        : "—"}</dd>
                                </div>
                                <div>
                                    <dt>{t("categories.snapshot.transactions")}</dt>
                                    <dd>{snapshot.transactionCount ? snapshot.transactionCount.toLocaleString(locale) : "—"}</dd>
                                </div>
                                <div>
                                    <dt>{t("categories.snapshot.budget")}</dt>
                                    <dd>{snapshot.budget ? t("categories.budgeted") : t("categories.snapshot.notSet")}</dd>
                                    {snapshot.budget && (
                                        <dd className="category-drawer-snapshot__budget">
                                            {snapshot.budget.name}{" "}
                                            <Num value={snapshot.budget.value} currency={snapshot.currency} fractionDigits="currency" kind="neutral" locale={locale} size={12} />
                                        </dd>
                                    )}
                                </div>
                                <div>
                                    <dt>{t("categories.snapshot.categoryId")}</dt>
                                    <dd>#{category.id}</dd>
                                </div>
                            </dl>
                        </details>
                    )}
                </Form>
            </FormDrawer>
            {confirmation && (
                <Modal
                    afterClose={finishConfirmation}
                    cancelText={t(confirmation.action === "delete" ? "categories.cancel" : "categories.keepEditing")}
                    okButtonProps={{ danger: true }}
                    okText={t(confirmation.action === "delete" ? "categories.delete" : "categories.discardChanges")}
                    onCancel={closeConfirmation}
                    onOk={() => {
                        confirmedAction.current = confirmation.action;
                        closeConfirmation();
                    }}
                    open={confirmation.open}
                    title={t(confirmation.action === "delete" ? "categories.deleteConfirm" : "categories.discardConfirm")}
                />
            )}
        </>
    );
};
