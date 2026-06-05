import * as React from "react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, DatePicker, Form, Input, Popconfirm, message } from "antd";
import type { MenuProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Trash2 } from "lucide-react";

import { BudgetDetails } from "../../model/Budget/BudgetDetails";
import { BudgetEditState } from "../../model/Budget/BudgetEditState";
import { getCategoriesTree, CategoryDetails } from "../../model/Category/CategoryDetails";
import Dropdown from "../../components/Dropdown";
import ExpressionInputNumber from "../../components/ExpressionInputNumber";
import { InExButton, Num } from "../../components/primitives";
import { parseAxiosError } from "../../utils/parseAxiosError";
import { CategoryResponse, useGetCategoriesQuery } from "../../store/categories/categories-api";
import {
    budgetsApi,
    useDeleteBudgetMutation,
    useUpdateBudgetMutation,
} from "../../store/budgets/budgets-api";
import { useAppDispatch } from "../../store/hooks";
import { getPeriodPayload } from "./budget-planning-utils";
import type { BudgetEditSnapshot } from "./budget-planning-utils";

interface BudgetEditFormProps {
    record: BudgetDetails;
    currency: string;
    selectedMonth: Dayjs;
    snapshot?: BudgetEditSnapshot;
    onCollapse?: () => void;
}

type BudgetEditFormState = BudgetEditState & { hasActiveChanges: boolean };

type BudgetEditAction =
    | { type: "INIT"; value: BudgetEditState }
    | { type: "SET_FIELD"; field: keyof BudgetEditState; value: string | number | number[] };

const defaultState: BudgetEditFormState = {
    id: 0,
    key: "",
    name: "",
    description: "",
    value: 0,
    categoryIds: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    hasActiveChanges: false,
};

const reducer = (state: BudgetEditFormState, action: BudgetEditAction): BudgetEditFormState => {
    switch (action.type) {
        case "INIT":
            return { ...state, ...action.value, hasActiveChanges: false };
        case "SET_FIELD":
            return { ...state, [action.field]: action.value, hasActiveChanges: true };
        default:
            return state;
    }
};

const BudgetEditForm: React.FC<BudgetEditFormProps> = ({
    record,
    currency,
    selectedMonth,
    snapshot,
    onCollapse,
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [formError, setFormError] = useState<string | null>(null);
    const [updateBudget, { isLoading: isUpdateLoading }] = useUpdateBudgetMutation();
    const [deleteBudget, { isLoading: isDeleteLoading }] = useDeleteBudgetMutation();
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
    const categories = useMemo(
        () => allCategories.filter((category: CategoryResponse) => category.isEnabled),
        [allCategories],
    );
    const categoryTree = useMemo(
        () => getCategoriesTree(categories, false, t("categories.systemGroup")) as CategoryDetails[],
        [categories, t],
    );
    const [state, dispatchLocal] = useReducer(reducer, defaultState);
    const isUpdating = isUpdateLoading || isDeleteLoading;

    useEffect(() => {
        dispatchLocal({
            type: "INIT",
            value: {
                id: record.id,
                key: record.key,
                name: record.name,
                description: record.description,
                value: record.value,
                categoryIds: record.categoryIds || [],
                year: record.year || new Date().getFullYear(),
                month: record.month || new Date().getMonth() + 1,
            },
        });
    }, [record]);

    const fieldChangeHandler = (
        field: keyof BudgetEditState,
        value: string | number | number[] | null,
    ) => {
        if (value === null) return;
        dispatchLocal({ type: "SET_FIELD", field, value });
    };

    const handleCategoryChange: NonNullable<MenuProps["onSelect"]> = (item) => {
        const categoryId = Number(item.key);
        const categoryIds = state.categoryIds.includes(categoryId)
            ? state.categoryIds.filter((id) => id !== categoryId)
            : [...state.categoryIds, categoryId];
        fieldChangeHandler("categoryIds", categoryIds);
    };

    const handlePeriodChange = (period: Dayjs | null) => {
        if (!period) return;
        const { year, month } = getPeriodPayload(period);
        fieldChangeHandler("year", year);
        fieldChangeHandler("month", month);
    };

    const updateHandler = async () => {
        setFormError(null);
        try {
            await updateBudget({
                id: state.id,
                key: state.key,
                name: state.name,
                description: state.description,
                value: state.value,
                categoryIds: state.categoryIds,
                year: state.year,
                month: state.month,
            }).unwrap();
            if (state.year !== record.year || state.month !== record.month) {
                dispatch(budgetsApi.util.invalidateTags([
                    { type: "BudgetsList", id: `${record.year}-${record.month}` },
                ]));
            }
            message.success(t("budgets.updated"));
            onCollapse?.();
        } catch (error) {
            setFormError(parseAxiosError(error, t("budgets.formErrors.update"), t));
        }
    };

    const deleteHandler = async () => {
        setFormError(null);
        try {
            await deleteBudget({
                id: state.id,
                year: record.year,
                month: record.month,
            }).unwrap();
            message.success(t("budgets.deleted"));
            onCollapse?.();
        } catch (error) {
            setFormError(parseAxiosError(error, t("budgets.formErrors.delete"), t));
        }
    };

    return (
        <Form className="budget-edit-form" layout="vertical">
            {formError && (
                <Alert
                    className="budgets-drawer__alert"
                    message={formError}
                    type="error"
                    showIcon
                />
            )}
            <Form.Item label={t("budgets.name")}>
                <Input
                    size="large"
                    value={state.name}
                    onChange={(event) => fieldChangeHandler("name", event.target.value)}
                />
            </Form.Item>
            <Form.Item label={t("budgets.description")}>
                <Input
                    size="large"
                    value={state.description}
                    onChange={(event) => fieldChangeHandler("description", event.target.value)}
                />
            </Form.Item>
            <Form.Item label={t("budgets.categories")}>
                <Dropdown
                    id="categories"
                    selection={categories.filter((category) => state.categoryIds.includes(category.id))}
                    placeholder={t("budgets.selectCategories")}
                    onChange={handleCategoryChange}
                    items={categoryTree}
                    multiple={true}
                />
            </Form.Item>
            <div className="budget-edit-form__grid">
                <Form.Item label={t("budgets.amount")}>
                    <ExpressionInputNumber
                        size="large"
                        style={{ width: "100%" }}
                        value={state.value}
                        onChange={(value) => fieldChangeHandler("value", value)}
                        precision={2}
                        placeholder="0.00"
                        addonAfter={currency}
                    />
                </Form.Item>
                <Form.Item label={t("budgets.period")}>
                    <DatePicker
                        picker="month"
                        size="large"
                        allowClear={false}
                        className="budgets-period-picker"
                        style={{ width: "100%" }}
                        value={dayjs()
                            .year(state.year || selectedMonth.year())
                            .month((state.month || selectedMonth.month() + 1) - 1)
                            .date(1)}
                        onChange={handlePeriodChange}
                        placeholder={t("budgets.period")}
                    />
                </Form.Item>
            </div>
            {snapshot && (
                <section className="budget-edit-form__snapshot" aria-label={t("budgets.snapshot.title", {
                    month: selectedMonth.format("MMM YYYY"),
                })}>
                    <div className="budget-edit-form__snapshot-title">
                        {t("budgets.snapshot.title", { month: selectedMonth.format("MMM YYYY") })}
                    </div>
                    <div className="budget-edit-form__snapshot-grid">
                        <SnapshotMetric label={t("budgets.snapshot.budget")} value={snapshot.budgetedAmount} currency={currency} />
                        <SnapshotMetric label={t("budgets.snapshot.spent")} value={snapshot.spentAmount} currency={currency} kind="expense" />
                        <SnapshotMetric
                            label={t("budgets.snapshot.remaining")}
                            value={snapshot.remainingAmount}
                            currency={currency}
                            kind={snapshot.remainingAmount < 0 ? "warn" : "neutral"}
                        />
                        <SnapshotMetric
                            label={t("budgets.snapshot.dailyAverageLeft")}
                            value={snapshot.dailyAverageLeft}
                            currency={currency}
                        />
                    </div>
                </section>
            )}
            <div className="budget-edit-form__actions">
                <Popconfirm
                    title={t("budgets.deleteConfirm")}
                    onConfirm={deleteHandler}
                    okText={t("common.yes")}
                    cancelText={t("common.no")}
                >
                    <span className="budget-edit-form__danger">
                        <InExButton icon={<Trash2 size={16} />} kind="danger" disabled={isUpdating}>
                            {isDeleteLoading ? t("budgets.loading.deleting") : t("budgets.delete")}
                        </InExButton>
                    </span>
                </Popconfirm>
                <InExButton kind="ghost" onClick={onCollapse}>
                    {t("budgets.cancel")}
                </InExButton>
                <InExButton
                    kind="primary"
                    onClick={updateHandler}
                    disabled={!state.hasActiveChanges || isUpdating}
                >
                    {isUpdateLoading ? t("budgets.loading.saving") : t("budgets.save")}
                </InExButton>
            </div>
        </Form>
    );
};

interface SnapshotMetricProps {
    label: string;
    value: number;
    currency: string;
    kind?: "expense" | "neutral" | "warn";
}

const SnapshotMetric: React.FC<SnapshotMetricProps> = ({
    label,
    value,
    currency,
    kind = "neutral",
}) => (
    <div className="budget-edit-form__snapshot-metric">
        <span>{label}</span>
        <strong>
            <Num value={value} currency={currency} kind={kind} compact />
        </strong>
    </div>
);

export default BudgetEditForm;
