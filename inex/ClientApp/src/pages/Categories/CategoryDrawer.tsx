import { useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, Switch } from "antd";
import { useTranslation } from "react-i18next";

import { InExButton, InExDrawer, Num, RECORD_EDITOR_DRAWER_WIDTH } from "../../components/primitives";
import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import {
    type CategoryResponse,
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useUpdateCategoryMutation,
} from "../../store/categories/categories-api";
import apiClient from "../../utils/apiClient";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { hasChildCategories, isSystemCategory } from "./categories.utils";

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

const getDeletionBlock = async (category: CategoryResponse, allCategories: CategoryResponse[]) => {
    if (hasChildCategories(category, allCategories)) return "categories.formErrors.deleteHasChildren";

    // The database cascades category deletion to transactions and budget links.
    // The information section only covers the current period, so check the entire history here.
    const dependencies = await Promise.all([
        apiClient.get<{ metadata: { totalItems: number } }>("/transactions", {
            params: { categoryId: category.id, mode: "ALL", page: 1, pageSize: 1 },
        }),
        apiClient.get<{ data: BudgetDetails[] }>("/budgets"),
    ]).catch(() => null);
    const transactionCount = dependencies?.[0].data?.metadata?.totalItems;
    const budgets = dependencies?.[1].data?.data;
    if (transactionCount == null || !Number.isSafeInteger(transactionCount) || transactionCount < 0 ||
        !Array.isArray(budgets) || budgets.some((budget) => !Array.isArray(budget?.categoryIds))) {
        return "categories.formErrors.deleteFailed";
    }
    if (transactionCount > 0) return "categories.formErrors.deleteHasTransactions";
    if (budgets.some((budget) => budget.categoryIds.includes(category.id))) {
        return "categories.formErrors.deleteHasBudgets";
    }
};

export const CategoryDrawer = ({
    session,
    open,
    allCategories,
    snapshot,
    onClose,
    afterOpenChange,
    onMutationSuccess,
}: CategoryDrawerProps) => {
    const { t } = useTranslation();
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
            if (mutation === "delete" && category) {
                const blockedReason = await getDeletionBlock(category, allCategories);
                if (blockedReason) {
                    setFormError(t(blockedReason));
                    return;
                }
            }
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
            <InExDrawer
                afterOpenChange={afterOpenChange}
                onClose={requestClose}
                open={open}
                subtitle={category?.name ?? t("categories.addDrawerSubtitle")}
                title={t(category ? "categories.editDrawerTitle" : "categories.addDrawerTitle")}
                width={RECORD_EDITOR_DRAWER_WIDTH}
                footer={(
                    <div className={`category-drawer-footer${category && !locked ? " category-drawer-footer--edit" : ""}`}>
                        {category && !locked && (
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
                        <div className="inex-drawer-actions category-drawer-primary-actions">
                            <InExButton disabled={busy} onClick={requestClose}>{t("common.cancel")}</InExButton>
                            {!locked && (
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
                        </div>
                    </div>
                )}
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
                    {formError && <Alert className="categories-alert" message={formError} showIcon type="error" />}
                    <section aria-labelledby="category-basic-information" className="category-drawer-section">
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
                    <section aria-labelledby="category-settings" className="category-drawer-section category-drawer-settings">
                        <h2 id="category-settings">{t("categories.drawer.settings")}</h2>
                        <div className="category-drawer-setting">
                            <label htmlFor="category-active">{t("categories.drawer.activeSetting")}</label>
                            <Form.Item name="isEnabled" noStyle valuePropName="checked">
                                <Switch id="category-active" />
                            </Form.Item>
                        </div>
                    </section>
                    {category && snapshot && (
                        <details className="category-drawer-information">
                            <summary>{t("categories.drawer.information")}</summary>
                            <p>{snapshot.periodLabel}</p>
                            <dl className="category-drawer-snapshot">
                                <div>
                                    <dt>{t(`categories.snapshot.${snapshot.kind === "income" ? "income" : "spend"}`)}</dt>
                                    <dd>{snapshot.amount != null && snapshot.amount > 0
                                        ? <Num value={snapshot.amount} currency={snapshot.currency} kind={snapshot.kind} />
                                        : "—"}</dd>
                                </div>
                                <div>
                                    <dt>{t("categories.snapshot.transactions")}</dt>
                                    <dd>{snapshot.transactionCount || "—"}</dd>
                                </div>
                                <div>
                                    <dt>{t("categories.snapshot.budget")}</dt>
                                    <dd>{snapshot.budget ? t("categories.budgeted") : t("categories.snapshot.notSet")}</dd>
                                    {snapshot.budget && (
                                        <dd className="category-drawer-snapshot__budget">
                                            {snapshot.budget.name}{" "}
                                            <Num value={snapshot.budget.value} currency={snapshot.currency} kind="neutral" size={12} />
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
            </InExDrawer>
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
