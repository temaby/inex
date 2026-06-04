import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, DatePicker, Form, Input, InputNumber, message } from "antd";
import type { MenuProps } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { Copy, FilterX, FolderOpen, Plus, RefreshCw, Search, Target, WalletCards } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import BasicPage from "../layouts/BasicPage";
import { BudgetDetails } from "../model/Budget/BudgetDetails";
import { BudgetEditState } from "../model/Budget/BudgetEditState";
import { CategoryDetails, getCategoriesTree } from "../model/Category/CategoryDetails";
import { BudgetComparisonDTO } from "../model/Report/BudgetReport";
import Dropdown from "../components/Dropdown";
import ExpressionInputNumber from "../components/ExpressionInputNumber";
import { EmptyState, FilterEmpty, InExButton, InExDrawer, BudgetProgress, Num, SegmentedControl } from "../components/primitives";
import { parseAxiosError } from "../utils/parseAxiosError";
import { CategoryResponse, useGetCategoriesQuery } from "../store/categories/categories-api";
import { useGetAccountsQuery } from "../store/accounts/accounts-api";
import {
    useCopyBudgetsMutation,
    useCreateBudgetMutation,
    useGetBudgetsQuery,
} from "../store/budgets/budgets-api";
import { useGetBudgetReportQuery } from "../store/budgetReport/budgetReport-api";
import BudgetEditForm from "./Budgets/BudgetEditForm";
import "./Budgets/budgets.css";

interface CategoryDropdownProps {
    value?: number[];
    onChange?: (value: number[]) => void;
    categories: CategoryResponse[];
    tree: CategoryDetails[];
}

const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
    value = [],
    onChange,
    categories,
    tree,
}) => {
    const { t } = useTranslation();
    const selection = categories.filter((category) => value.includes(category.id));

    const handleChange: NonNullable<MenuProps["onSelect"]> = (item) => {
        const id = Number(item.key);
        const newValue = value.includes(id)
            ? value.filter((selectedId) => selectedId !== id)
            : [...value, id];
        onChange?.(newValue);
    };

    return (
        <Dropdown
            id="category-dropdown"
            selection={selection}
            placeholder={t("budgets.selectCategories")}
            onChange={handleChange}
            items={tree}
            multiple={true}
        />
    );
};

const formatMonthLabel = (month: Dayjs) => month.format("MMM YYYY");

const getMonthOptions = (selectedMonth: Dayjs) =>
    [-2, -1, 0, 1, 2].map((offset) => {
        const value = selectedMonth.add(offset, "month");
        return {
            key: value.format("YYYY-MM"),
            label: formatMonthLabel(value),
        };
    });

const getBudgetReportForBudget = (
    budget: BudgetDetails,
    reportItems: BudgetComparisonDTO[],
) => {
    if (budget.categoryIds.length === 0) return undefined;
    const matchingItems = reportItems.filter((reportItem) =>
        reportItem.categoryIds.some((categoryId) => budget.categoryIds.includes(categoryId)),
    );
    if (matchingItems.length === 0) return undefined;

    const spentAmount = matchingItems.reduce((sum, item) => sum + item.spentAmount, 0);
    const remainingAmount = budget.value - spentAmount;

    return {
        ...matchingItems[0],
        budgetedAmount: budget.value,
        spentAmount,
        remainingAmount,
        percentageUsed: budget.value > 0 ? (spentAmount / budget.value) * 100 : 0,
    };
};

const getReportMetric = (
    reportItem: BudgetComparisonDTO | undefined,
    field: keyof Pick<BudgetComparisonDTO, "spentAmount" | "remainingAmount" | "percentageUsed">,
) => reportItem?.[field];

const isOverBudget = (reportItem: BudgetComparisonDTO | undefined) =>
    (reportItem?.percentageUsed ?? 0) >= 100 || (reportItem?.remainingAmount ?? 0) < 0;

const Budgets = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm<BudgetEditState>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [expandedBudgetId, setExpandedBudgetId] = useState<number | null>(null);
    const [searchText, setSearchText] = useState("");
    const [drawerError, setDrawerError] = useState<string | null>(null);
    const [copyError, setCopyError] = useState<string | null>(null);

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const year = searchParams.get("year");
        const month = searchParams.get("month");
        if (year && month) {
            return dayjs()
                .year(Number(year))
                .month(Number(month) - 1)
                .date(1)
                .startOf("day");
        }
        return dayjs();
    });

    useEffect(() => {
        const year = selectedMonth.year().toString();
        const month = (selectedMonth.month() + 1).toString();
        if (searchParams.get("year") !== year || searchParams.get("month") !== month) {
            setSearchParams({ year, month });
        }
    }, [selectedMonth, setSearchParams, searchParams]);

    const selectedYear = selectedMonth.year();
    const selectedMonthNumber = selectedMonth.month() + 1;

    const {
        data: budgets = [],
        isLoading: isBudgetInitialLoading,
        isFetching: isBudgetFetching,
        error: budgetError,
        refetch: refetchBudgets,
    } = useGetBudgetsQuery({ year: selectedYear, month: selectedMonthNumber });

    const { data: accounts = [] } = useGetAccountsQuery("ALL");
    const currency = accounts.length > 0 ? accounts[0].currency : "USD";

    const {
        data: budgetReport,
        isLoading: isReportInitialLoading,
        isFetching: isReportFetching,
        error: reportError,
        refetch: refetchBudgetReport,
    } = useGetBudgetReportQuery({
        year: selectedYear,
        month: selectedMonthNumber,
        currency,
    });

    const [createBudget, { isLoading: isCreateLoading }] = useCreateBudgetMutation();
    const [copyBudgets, { isLoading: isCopyLoading }] = useCopyBudgetsMutation();
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
    const categories = useMemo(
        () => allCategories.filter((category: CategoryResponse) => category.isEnabled),
        [allCategories],
    );
    const categoryTree = useMemo(
        () => getCategoriesTree(categories, false, t("categories.systemGroup")) as CategoryDetails[],
        [categories, t],
    );
    const categoryMap = useMemo(
        () => new Map(allCategories.map((category: CategoryResponse) => [category.id, category])),
        [allCategories],
    );

    const reportItems = budgetReport?.data ?? [];
    const monthOptions = getMonthOptions(selectedMonth);
    const selectedMonthKey = selectedMonth.format("YYYY-MM");
    const normalizedSearch = searchText.trim().toLocaleLowerCase();
    const filteredBudgets = useMemo(() => {
        if (!normalizedSearch) return budgets;
        return budgets.filter((budget) => {
            const categoryNames = budget.categoryIds
                .map((categoryId) => categoryMap.get(categoryId)?.name ?? "")
                .join(" ");
            return `${budget.name} ${budget.description} ${categoryNames}`
                .toLocaleLowerCase()
                .includes(normalizedSearch);
        });
    }, [budgets, categoryMap, normalizedSearch]);

    const hasBudgets = budgets.length > 0;
    const isFilteredEmpty = hasBudgets && filteredBudgets.length === 0;
    const totalBudgeted = budgets.reduce((sum, budget) => sum + budget.value, 0);
    const totalSpent = reportItems.reduce((sum, item) => sum + item.spentAmount, 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const percentUsed = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
    const overBudgetCount = budgets.filter((budget) => isOverBudget(getBudgetReportForBudget(budget, reportItems))).length;
    const isRefreshing = (isBudgetFetching || isReportFetching) && hasBudgets;
    const hasInitialBudgetError = Boolean(budgetError) && !hasBudgets;
    const hasPartialBudgetError = Boolean(budgetError) && hasBudgets;
    const previousMonth = selectedMonth.subtract(1, "month");

    const closeDrawer = () => {
        setDrawerOpen(false);
        setDrawerError(null);
        form.resetFields();
    };

    const openDrawer = () => {
        setDrawerError(null);
        form.setFieldsValue({
            key: "",
            name: "",
            description: "",
            value: 0,
            categoryIds: [],
            year: selectedYear,
            month: selectedMonthNumber,
        });
        setDrawerOpen(true);
    };

    const handleCreate = async (values: BudgetEditState) => {
        setDrawerError(null);
        try {
            await createBudget({
                key: values.key,
                name: values.name,
                description: values.description ?? "",
                value: values.value,
                categoryIds: values.categoryIds || [],
                year: values.year,
                month: values.month,
            }).unwrap();
            message.success(t("budgets.created"));
            closeDrawer();
        } catch (error) {
            setDrawerError(parseAxiosError(error, t("budgets.formErrors.create"), t));
        }
    };

    const handleCopyFromPrevious = async () => {
        setCopyError(null);
        try {
            await copyBudgets({
                sourceYear: previousMonth.year(),
                sourceMonth: previousMonth.month() + 1,
                targetYear: selectedYear,
                targetMonth: selectedMonthNumber,
            }).unwrap();
            message.success(t("budgets.copySuccess"));
        } catch (error) {
            setCopyError(parseAxiosError(error, t("budgets.formErrors.copy"), t));
        }
    };

    const retryAll = () => {
        refetchBudgets();
        refetchBudgetReport();
    };

    return (
        <>
            <InExDrawer
                open={drawerOpen}
                onClose={closeDrawer}
                title={t("budgets.addDrawerTitle")}
                subtitle={t("budgets.drawerSubtitle", {
                    month: formatMonthLabel(selectedMonth),
                })}
                width={520}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                    initialValues={{
                        key: "",
                        name: "",
                        description: "",
                        value: 0,
                        categoryIds: [],
                        year: selectedYear,
                        month: selectedMonthNumber,
                    }}
                >
                    {drawerError && (
                        <Alert
                            className="budgets-drawer__alert"
                            message={drawerError}
                            type="error"
                            showIcon
                        />
                    )}
                    <Form.Item
                        name="key"
                        label={t("budgets.key")}
                        rules={[{ required: true, message: t("errors.key.required") }]}
                    >
                        <Input size="large" placeholder={t("budgets.keyPlaceholder")} />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label={t("budgets.name")}
                        rules={[{ required: true, message: t("errors.name.required") }]}
                    >
                        <Input size="large" placeholder={t("budgets.namePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="description" label={t("budgets.description")}>
                        <Input.TextArea size="large" rows={3} placeholder={t("budgets.descriptionPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="categoryIds" label={t("budgets.categories")}>
                        <CategoryDropdown categories={categories} tree={categoryTree} />
                    </Form.Item>
                    <Form.Item
                        name="value"
                        label={t("budgets.amount")}
                        rules={[{ required: true, message: t("errors.value.must_be_positive") }]}
                    >
                        <ExpressionInputNumber
                            size="large"
                            style={{ width: "100%" }}
                            precision={2}
                            placeholder="0.00"
                            addonAfter={currency}
                        />
                    </Form.Item>
                    <div className="budgets-drawer__period">
                        <Form.Item
                            name="year"
                            label={t("budgets.year")}
                            rules={[{ required: true, message: t("errors.year.out_of_range") }]}
                        >
                            <InputNumber size="large" min={2020} max={2030} />
                        </Form.Item>
                        <Form.Item
                            name="month"
                            label={t("budgets.month")}
                            rules={[{ required: true, message: t("errors.month.out_of_range") }]}
                        >
                            <InputNumber size="large" min={1} max={12} />
                        </Form.Item>
                    </div>
                    <div className="budgets-drawer__actions">
                        <InExButton kind="ghost" onClick={closeDrawer}>
                            {t("budgets.cancel")}
                        </InExButton>
                        <InExButton kind="primary" type="submit" disabled={isCreateLoading}>
                            {isCreateLoading ? t("budgets.loading.creating") : t("budgets.create")}
                        </InExButton>
                    </div>
                </Form>
            </InExDrawer>

            <BasicPage title={t("budgets.title")} subtitle={t("budgets.subtitle")}>
                <div className="budgets-workspace">
                    <section className="budgets-hero">
                        <div className="budgets-hero__summary">
                            <div className="budgets-eyebrow">{t("budgets.heroLabel")}</div>
                            <h2>{formatMonthLabel(selectedMonth)}</h2>
                            <p>{t("budgets.heroDescription")}</p>
                            <div className="budgets-hero__progress">
                                <BudgetProgress
                                    value={Math.max(0, totalSpent)}
                                    max={Math.max(totalBudgeted, 1)}
                                    height={8}
                                    showLabel
                                    overBudgetLabel={t("primitives.progress.overBudget")}
                                />
                            </div>
                        </div>
                        <div className="budgets-hero__metrics" aria-label={t("budgets.summaryLabel")}>
                            <MetricCard label={t("budgets.metrics.budgeted")} value={totalBudgeted} currency={currency} />
                            <MetricCard label={t("budgets.metrics.spent")} value={totalSpent} currency={currency} kind="expense" />
                            <MetricCard
                                label={t("budgets.metrics.remaining")}
                                value={totalRemaining}
                                currency={currency}
                                kind={totalRemaining < 0 ? "warn" : "neutral"}
                            />
                            <MetricCard label={t("budgets.metrics.used")} text={`${percentUsed}%`} />
                            <MetricCard label={t("budgets.metrics.overBudget")} text={String(overBudgetCount)} warning={overBudgetCount > 0} />
                        </div>
                    </section>

                    <section className="budgets-toolbar" aria-label={t("budgets.toolbarLabel")}>
                        <div className="budgets-month-switcher">
                            <SegmentedControl
                                options={monthOptions}
                                value={selectedMonthKey}
                                onChange={(key) => setSelectedMonth(dayjs(`${key}-01`, "YYYY-MM-DD"))}
                            />
                        </div>
                        <DatePicker
                            picker="month"
                            value={selectedMonth}
                            onChange={(value) => value && setSelectedMonth(value)}
                            allowClear={false}
                            className="budgets-toolbar__picker"
                        />
                        <label className="budgets-search">
                            <Search aria-hidden="true" size={16} />
                            <span className="budgets-sr-only">{t("budgets.searchLabel")}</span>
                            <input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder={t("budgets.searchPlaceholder")}
                            />
                        </label>
                        <div className="budgets-toolbar__actions">
                            <InExButton
                                icon={<Copy size={16} />}
                                kind="ghost"
                                onClick={handleCopyFromPrevious}
                                disabled={isCopyLoading}
                            >
                                {isCopyLoading
                                    ? t("budgets.loading.copying")
                                    : t("budgets.copyFromMonth", { month: formatMonthLabel(previousMonth) })}
                            </InExButton>
                            <InExButton icon={<Plus size={16} />} kind="primary" onClick={openDrawer}>
                                {t("budgets.addBudget")}
                            </InExButton>
                        </div>
                    </section>

                    {copyError && (
                        <Alert
                            message={copyError}
                            type="error"
                            showIcon
                            action={
                                <InExButton kind="ghost" size="sm" onClick={handleCopyFromPrevious}>
                                    {t("budgets.error.retry")}
                                </InExButton>
                            }
                        />
                    )}

                    {isRefreshing && (
                        <div className="budgets-refreshing" role="status">
                            <RefreshCw size={14} />
                            {t("budgets.loading.refreshing")}
                        </div>
                    )}

                    {hasInitialBudgetError ? (
                        <EmptyState
                            iconNode={<RefreshCw size={28} />}
                            title={t("budgets.error.loadTitle")}
                            description={parseAxiosError(budgetError, t("budgets.error.loadDescription"), t)}
                            actions={
                                <InExButton icon={<RefreshCw size={16} />} kind="primary" onClick={retryAll}>
                                    {t("budgets.error.retry")}
                                </InExButton>
                            }
                        />
                    ) : (
                        <>
                            {hasPartialBudgetError && (
                                <Alert
                                    message={t("budgets.error.partialRefresh")}
                                    type="warning"
                                    showIcon
                                    action={
                                        <InExButton kind="ghost" size="sm" onClick={retryAll}>
                                            {t("budgets.error.retry")}
                                        </InExButton>
                                    }
                                />
                            )}
                            {reportError && (
                                <Alert
                                    message={t("budgets.error.reportMetrics")}
                                    type="warning"
                                    showIcon
                                    action={
                                        <InExButton kind="ghost" size="sm" onClick={() => refetchBudgetReport()}>
                                            {t("budgets.error.retry")}
                                        </InExButton>
                                    }
                                />
                            )}
                            {isBudgetInitialLoading && !hasBudgets ? (
                                <BudgetSkeleton />
                            ) : !hasBudgets ? (
                                <EmptyState
                                    iconNode={<WalletCards size={30} />}
                                    title={t("budgets.emptyState.title")}
                                    description={t("budgets.emptyState.description")}
                                    actions={
                                        <>
                                            <InExButton icon={<Plus size={16} />} kind="primary" onClick={openDrawer}>
                                                {t("budgets.addBudget")}
                                            </InExButton>
                                            <InExButton
                                                icon={<Copy size={16} />}
                                                kind="ghost"
                                                onClick={handleCopyFromPrevious}
                                                disabled={isCopyLoading}
                                            >
                                                {t("budgets.copyFromMonth", { month: formatMonthLabel(previousMonth) })}
                                            </InExButton>
                                        </>
                                    }
                                />
                            ) : isFilteredEmpty ? (
                                <FilterEmpty
                                    title={t("budgets.filterEmpty.title")}
                                    description={t("budgets.filterEmpty.description")}
                                    onClear={() => setSearchText("")}
                                />
                            ) : (
                                <section className="budgets-list" aria-label={t("budgets.listLabel")}>
                                    <div className="budgets-list__head" aria-hidden="true">
                                        <span>{t("budgets.name")}</span>
                                        <span>{t("budgets.categories")}</span>
                                        <span>{t("budgets.progress")}</span>
                                        <span>{t("budgets.spent")}</span>
                                        <span>{t("budgets.remaining")}</span>
                                        <span />
                                    </div>
                                    {filteredBudgets.map((budget) => {
                                        const reportItem = getBudgetReportForBudget(budget, reportItems);
                                        const spentAmount = getReportMetric(reportItem, "spentAmount");
                                        const remainingAmount = getReportMetric(reportItem, "remainingAmount");
                                        const percentageUsed = getReportMetric(reportItem, "percentageUsed");
                                        const overBudget = isOverBudget(reportItem);
                                        const expanded = expandedBudgetId === budget.id;
                                        const categoryNames = budget.categoryIds
                                            .map((categoryId) => categoryMap.get(categoryId)?.name)
                                            .filter((name): name is string => Boolean(name));

                                        return (
                                            <article className={`budget-row${overBudget ? " is-over-budget" : ""}`} key={budget.id}>
                                                <button
                                                    className="budget-row__main"
                                                    type="button"
                                                    onClick={() => setExpandedBudgetId(expanded ? null : budget.id)}
                                                    aria-expanded={expanded}
                                                >
                                                    <span className="budget-row__title">{budget.name}</span>
                                                    <span className="budget-row__description">
                                                        {budget.description || t("budgets.noDescription")}
                                                    </span>
                                                </button>
                                                <div className="budget-row__categories">
                                                    {categoryNames.length > 0
                                                        ? categoryNames.map((name) => <span key={name}>{name}</span>)
                                                        : <span>{t("budgets.uncategorized")}</span>}
                                                </div>
                                                <div className="budget-row__progress">
                                                    <BudgetProgress
                                                        value={spentAmount ?? 0}
                                                        max={Math.max(budget.value, 1)}
                                                        height={7}
                                                        showLabel
                                                        overBudgetLabel={t("primitives.progress.overBudget")}
                                                    />
                                                    <span className="budget-row__status">
                                                        {reportError
                                                            ? t("budgets.metricsUnavailable")
                                                            : overBudget
                                                                ? t("budgets.overBudgetBy", {
                                                                    amount: Math.abs(remainingAmount ?? 0).toLocaleString(undefined, {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2,
                                                                    }),
                                                                    currency,
                                                                })
                                                                : t("budgets.percentUsed", { percent: Math.round(percentageUsed ?? 0) })}
                                                    </span>
                                                </div>
                                                <div className="budget-row__amount" data-label={t("budgets.spent")}>
                                                    {spentAmount === undefined ? (
                                                        <span>{isReportInitialLoading ? t("budgets.loading.metrics") : t("budgets.metricsUnavailable")}</span>
                                                    ) : (
                                                        <Num value={spentAmount} currency={currency} kind="expense" />
                                                    )}
                                                </div>
                                                <div className="budget-row__amount" data-label={t("budgets.remaining")}>
                                                    {remainingAmount === undefined ? (
                                                        <span>{isReportInitialLoading ? t("budgets.loading.metrics") : t("budgets.metricsUnavailable")}</span>
                                                    ) : (
                                                        <Num
                                                            value={remainingAmount}
                                                            currency={currency}
                                                            kind={remainingAmount < 0 ? "warn" : "neutral"}
                                                        />
                                                    )}
                                                </div>
                                                <div className="budget-row__budgeted" data-label={t("budgets.metrics.budgeted")}>
                                                    <Num value={budget.value} currency={currency} kind="neutral" />
                                                </div>
                                                {overBudget && (
                                                    <div className="budget-row__notice">
                                                        <Target size={14} />
                                                        {t("budgets.overBudget")}
                                                    </div>
                                                )}
                                                {expanded && (
                                                    <div className="budget-row__edit">
                                                        <BudgetEditForm
                                                            record={budget}
                                                            currency={currency}
                                                            onCollapse={() => setExpandedBudgetId(null)}
                                                        />
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}
                                </section>
                            )}
                            {searchText && !isFilteredEmpty && (
                                <button className="budgets-clear-filter" type="button" onClick={() => setSearchText("")}>
                                    <FilterX size={14} />
                                    {t("budgets.clearSearch")}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </BasicPage>
        </>
    );
};

interface MetricCardProps {
    label: string;
    value?: number;
    text?: string;
    currency?: string;
    kind?: "income" | "expense" | "transfer" | "neutral" | "warn";
    warning?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, text, currency, kind = "neutral", warning }) => (
    <div className={`budgets-metric${warning ? " is-warning" : ""}`}>
        <span>{label}</span>
        <strong>{value === undefined ? text : <Num value={value} currency={currency} kind={kind} compact />}</strong>
    </div>
);

const BudgetSkeleton = () => (
    <div className="budgets-skeleton" aria-hidden="true">
        {[0, 1, 2].map((index) => (
            <div className="budgets-skeleton__row" key={index}>
                <span />
                <span />
                <span />
            </div>
        ))}
    </div>
);

export default Budgets;
