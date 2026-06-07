import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useTranslation } from "react-i18next";
import { Alert, DatePicker, Form, Input, message } from "antd";
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
import { EmptyState, FilterEmpty, InExButton, InExDrawer, Num, SegmentedControl } from "../components/primitives";
import apiClient from "../utils/apiClient";
import { parseAxiosError } from "../utils/parseAxiosError";
import { CategoryResponse, useGetCategoriesQuery } from "../store/categories/categories-api";
import { useAppSelector } from "../store/hooks";
import {
    useCopyBudgetsMutation,
    useCreateBudgetMutation,
    useGetBudgetsQuery,
} from "../store/budgets/budgets-api";
import { useGetBudgetReportQuery } from "../store/budgetReport/budgetReport-api";
import BudgetEditForm from "./Budgets/BudgetEditForm";
import {
    getBudgetEditSnapshot,
    getBudgetPaceMetrics,
    getBudgetReportCurrency,
    getBudgetReportForBudget,
    getBudgetUsageStatus,
    getPeriodPayload,
    getReportMetricsState,
    getSupportedBudgetMonthFromParams,
    isBudgetPeriodDisabled,
} from "./Budgets/budget-planning-utils";
import type {
    BudgetEditSnapshot,
    BudgetPaceMetrics,
    BudgetUsageStatus,
    ReportMetricsState,
} from "./Budgets/budget-planning-utils";
import "./Budgets/budgets.css";

interface CategoryDropdownProps {
    value?: number[];
    onChange?: (value: number[]) => void;
    categories: CategoryResponse[];
    tree: CategoryDetails[];
}

type BudgetFormValues = BudgetEditState & { period: Dayjs };

interface BudgetCategoryContext {
    categoryNames: string[];
    parentNames: string[];
}

interface CurrencyOption {
    id: number;
    key: string;
    name: string;
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

const getDefaultBudgetMonth = () => dayjs().date(1).startOf("day");

const getMonthOptions = (selectedMonth: Dayjs) =>
    [-2, -1, 0, 1, 2].map((offset) => {
        const value = selectedMonth.add(offset, "month");
        return {
            key: value.format("YYYY-MM"),
            label: formatMonthLabel(value),
        };
    });

const getReportMetric = (
    reportItem: BudgetComparisonDTO | undefined,
    field: keyof Pick<BudgetComparisonDTO, "spentAmount" | "remainingAmount" | "percentageUsed">,
) => reportItem?.[field];

const isOverBudget = (reportItem: BudgetComparisonDTO | undefined) =>
    getBudgetUsageStatus(reportItem) === "over";

const getMetricStateLabel = (state: ReportMetricsState, t: (key: string) => string) => {
    if (state === "loading") return t("budgets.loading.metrics");
    if (state === "error") return t("budgets.metricsError");
    return t("budgets.metricsUnavailable");
};

const Budgets = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm<BudgetFormValues>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [expandedBudgetId, setExpandedBudgetId] = useState<number | null>(null);
    const [searchText, setSearchText] = useState("");
    const [drawerError, setDrawerError] = useState<string | null>(null);
    const [copyError, setCopyError] = useState<string | null>(null);
    const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
    const [currenciesResolved, setCurrenciesResolved] = useState(false);
    const [currencyLoadError, setCurrencyLoadError] = useState(false);
    const [currencyReloadToken, setCurrencyReloadToken] = useState(0);
    const [pendingCreatedFocusRestore, setPendingCreatedFocusRestore] = useState(false);
    const initialSearchParamsInvalidRef = React.useRef(false);
    const drawerTriggerRef = React.useRef<HTMLButtonElement | null>(null);
    const userCurrencyId = useAppSelector((state) => state.auth.user?.currencyId);

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const year = searchParams.get("year");
        const month = searchParams.get("month");
        const fallbackMonth = getDefaultBudgetMonth();
        const supportedMonth = getSupportedBudgetMonthFromParams(year, month, fallbackMonth);
        initialSearchParamsInvalidRef.current = Boolean(year || month) &&
            (supportedMonth.year().toString() !== year ||
                (supportedMonth.month() + 1).toString() !== month);
        return supportedMonth;
    });

    useEffect(() => {
        const year = selectedMonth.year().toString();
        const month = (selectedMonth.month() + 1).toString();
        if (searchParams.get("year") !== year || searchParams.get("month") !== month) {
            setSearchParams({ year, month }, { replace: initialSearchParamsInvalidRef.current });
            initialSearchParamsInvalidRef.current = false;
        }
    }, [selectedMonth, setSearchParams, searchParams]);

    const selectedYear = selectedMonth.year();
    const selectedMonthNumber = selectedMonth.month() + 1;
    const reportCurrency = useMemo(
        () => currenciesResolved ? getBudgetReportCurrency(currencies, userCurrencyId) : null,
        [currencies, currenciesResolved, userCurrencyId],
    );
    const reportCurrencyResolved = reportCurrency !== null;
    const hasCurrencyResolutionError = currenciesResolved && !reportCurrencyResolved;

    useEffect(() => {
        let cancelled = false;
        setCurrencyLoadError(false);

        apiClient.get<CurrencyOption[]>("/currencies")
            .then(({ data }) => {
                if (!cancelled) {
                    setCurrencies(data);
                    setCurrenciesResolved(true);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCurrencies([]);
                    setCurrencyLoadError(true);
                    setCurrenciesResolved(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [currencyReloadToken]);

    const {
        currentData: currentBudgets,
        isLoading: isBudgetInitialLoading,
        isFetching: isBudgetFetching,
        error: budgetError,
        refetch: refetchBudgets,
    } = useGetBudgetsQuery({ year: selectedYear, month: selectedMonthNumber });
    const budgets = currentBudgets ?? [];

    const {
        currentData: budgetReport,
        isLoading: isReportInitialLoading,
        isFetching: isReportFetching,
        error: reportError,
        refetch: refetchBudgetReport,
    } = useGetBudgetReportQuery(reportCurrency
        ? {
            year: selectedYear,
            month: selectedMonthNumber,
            currency: reportCurrency,
        }
        : skipToken);

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
    const currency = reportCurrency ?? "";
    const reportMetricsState = getReportMetricsState({
        isLoading: !reportCurrencyResolved || isReportInitialLoading,
        isFetching: isReportFetching,
        hasReportData: Boolean(budgetReport),
        hasError: Boolean(reportError) || hasCurrencyResolutionError || currencyLoadError,
    });
    const isReportReady = reportMetricsState === "ready";
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
    const percentUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    const overBudgetCount = isReportReady
        ? budgets.filter((budget) => isOverBudget(getBudgetReportForBudget(budget, reportItems))).length
        : undefined;
    const isBudgetDataLoading = (isBudgetInitialLoading || isBudgetFetching) && currentBudgets === undefined;
    const isRefreshing = (isBudgetFetching || isReportFetching) && currentBudgets !== undefined && hasBudgets;
    const hasInitialBudgetError = Boolean(budgetError) && currentBudgets === undefined;
    const hasPartialBudgetError = Boolean(budgetError) && currentBudgets !== undefined;
    const showFirstUseEmpty = !isBudgetDataLoading && !hasInitialBudgetError && !hasBudgets;
    const previousMonth = selectedMonth.subtract(1, "month");
    const metricStateLabel = getMetricStateLabel(reportMetricsState, t);
    const today = dayjs();
    const heroPace = isReportReady
        ? getBudgetPaceMetrics({
            budgetedAmount: totalBudgeted,
            spentAmount: totalSpent,
            selectedMonth,
            today,
        })
        : undefined;
    const heroUsageStatus: BudgetUsageStatus = isReportReady
        ? getBudgetUsageStatus({
            categoryName: "",
            categoryIds: [],
            budgetedAmount: totalBudgeted,
            spentAmount: totalSpent,
            remainingAmount: totalRemaining,
            percentageUsed: percentUsed,
        })
        : "unavailable";
    const highestBurnBudgets = budgets
        .map((budget) => {
            const reportItem = getBudgetReportForBudget(budget, reportItems);
            return {
                budget,
                reportItem,
                status: getBudgetUsageStatus(reportItem),
                percentUsed: reportItem?.percentageUsed ?? 0,
            };
        })
        .sort((left, right) => right.percentUsed - left.percentUsed)
        .slice(0, 5);

    const getBudgetCategoryContext = (budget: BudgetDetails): BudgetCategoryContext => {
        const categoryNames = budget.categoryIds
            .map((categoryId) => categoryMap.get(categoryId)?.name)
            .filter((name): name is string => Boolean(name));
        const parentNames = budget.categoryIds
            .map((categoryId) => {
                const category = categoryMap.get(categoryId);
                if (!category) return undefined;
                if (!category.parentId) return category.name;
                return categoryMap.get(category.parentId)?.name ?? category.name;
            })
            .filter((name): name is string => Boolean(name));

        return {
            categoryNames,
            parentNames: Array.from(new Set(parentNames)),
        };
    };

    const focusDrawerTrigger = React.useCallback((preferToolbarFallback = false) => {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
        const addButtons = buttons.filter((button) =>
            !button.disabled && button.textContent?.trim() === t("budgets.addBudget"));
        const originalTrigger = drawerTriggerRef.current;
        const connectedOriginalTrigger = originalTrigger?.isConnected ? originalTrigger : null;
        const toolbarAddButton = addButtons[0] ?? null;
        const focusTarget = preferToolbarFallback
            ? toolbarAddButton ?? connectedOriginalTrigger
            : connectedOriginalTrigger ?? toolbarAddButton;

        focusTarget?.focus();
    }, [t]);

    const closeDrawer = (preferToolbarFallback = false) => {
        if (preferToolbarFallback) {
            setPendingCreatedFocusRestore(true);
        }
        setDrawerOpen(false);
        setDrawerError(null);
        form.resetFields();
        window.setTimeout(() => focusDrawerTrigger(preferToolbarFallback), 0);
        if (preferToolbarFallback) {
            window.setTimeout(() => focusDrawerTrigger(true), 250);
        }
    };

    useEffect(() => {
        if (!pendingCreatedFocusRestore || drawerOpen || !hasBudgets) return;

        window.setTimeout(() => focusDrawerTrigger(true), 0);
        setPendingCreatedFocusRestore(false);
    }, [drawerOpen, focusDrawerTrigger, hasBudgets, pendingCreatedFocusRestore]);

    const openDrawer: React.MouseEventHandler<HTMLButtonElement> = (event) => {
        drawerTriggerRef.current = event.currentTarget;
        setDrawerError(null);
        form.setFieldsValue({
            key: "",
            name: "",
            description: "",
            value: 0,
            categoryIds: [],
            period: selectedMonth,
            year: selectedYear,
            month: selectedMonthNumber,
        });
        setDrawerOpen(true);
    };

    const handleDrawerPeriodChange = (period: Dayjs | null) => {
        if (!period) return;
        form.setFieldsValue({
            period,
            ...getPeriodPayload(period),
        });
    };

    const handleCreate = async (values: BudgetFormValues) => {
        setDrawerError(null);
        const periodPayload = getPeriodPayload(values.period);
        try {
            await createBudget({
                key: values.key,
                name: values.name,
                description: values.description ?? "",
                value: values.value,
                categoryIds: values.categoryIds || [],
                year: periodPayload.year,
                month: periodPayload.month,
            }).unwrap();
            message.success(t("budgets.created"));
            closeDrawer(true);
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
        if (reportCurrency) {
            refetchBudgetReport();
        } else {
            setCurrenciesResolved(false);
            setCurrencyReloadToken((current) => current + 1);
        }
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
                        period: selectedMonth,
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
                        extra={t("budgets.keyContractHint")}
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
                    <Form.Item
                        name="period"
                        label={t("budgets.period")}
                        rules={[{ required: true, message: t("budgets.periodRequired") }]}
                    >
                        <DatePicker
                            picker="month"
                            size="large"
                            allowClear={false}
                            className="budgets-period-picker"
                            disabledDate={isBudgetPeriodDisabled}
                            onChange={handleDrawerPeriodChange}
                            placeholder={t("budgets.period")}
                        />
                    </Form.Item>
                    <div className="budgets-drawer__actions">
                        <InExButton kind="ghost" onClick={() => closeDrawer()}>
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
                    {!showFirstUseEmpty && (
                    <section className="budgets-hero">
                        <div className="budgets-hero__summary">
                            <div className="budgets-eyebrow">{t("budgets.heroLabel")}</div>
                            <h2>{t("budgets.heroTitle", { month: formatMonthLabel(selectedMonth) })}</h2>
                            <p>{t("budgets.heroDescription")}</p>
                            <div className="budgets-hero__rollup" aria-label={t("budgets.summaryLabel")}>
                                {isReportReady ? (
                                    <>
                                        <Num value={totalSpent} currency={currency} kind="expense" compact />
                                        <span>/</span>
                                        <Num value={totalBudgeted} currency={currency} kind="neutral" compact />
                                    </>
                                ) : (
                                    <>
                                        <span className="budgets-hero__state">{metricStateLabel}</span>
                                        <span>/</span>
                                        <Num value={totalBudgeted} currency={currency} kind="neutral" compact />
                                    </>
                                )}
                            </div>
                            <div className="budgets-hero__progress">
                                {isReportReady && heroPace ? (
                                    <UsageBar
                                        percent={percentUsed}
                                        status={heroUsageStatus}
                                        markerPercent={heroPace.elapsedPercent}
                                        markerLabel={t("budgets.currentDayMarker", {
                                            day: heroPace.dayOfMonth,
                                            days: heroPace.daysInMonth,
                                        })}
                                    />
                                ) : (
                                    <div className="budget-usage-bar is-unavailable">
                                        <span>{metricStateLabel}</span>
                                    </div>
                                )}
                            </div>
                            <div className="budgets-hero__verdict">
                                {isReportReady && heroPace ? (
                                    <>
                                        <span className={totalRemaining < 0 ? "is-over" : "is-left"}>
                                            {totalRemaining < 0
                                                ? t("budgets.remainingOver", {
                                                    amount: Math.abs(totalRemaining).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    }),
                                                    currency,
                                                })
                                                : t("budgets.remainingLeft", {
                                                    amount: totalRemaining.toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    }),
                                                    currency,
                                                })}
                                        </span>
                                        <span className="budgets-hero__divider">/</span>
                                        <PaceVerdict pace={heroPace} currency={currency} />
                                    </>
                                ) : (
                                    <span>{metricStateLabel}</span>
                                )}
                            </div>
                            <div className="budgets-hero__metrics">
                                <MetricCard label={t("budgets.metrics.budgeted")} value={totalBudgeted} currency={currency} />
                                <MetricCard
                                    label={t("budgets.metrics.spent")}
                                    value={isReportReady ? totalSpent : undefined}
                                    text={isReportReady ? undefined : metricStateLabel}
                                    currency={currency}
                                    kind="expense"
                                />
                                <MetricCard
                                    label={t("budgets.metrics.remaining")}
                                    value={isReportReady ? totalRemaining : undefined}
                                    text={isReportReady ? undefined : metricStateLabel}
                                    currency={currency}
                                    kind={totalRemaining < 0 ? "warn" : "neutral"}
                                />
                                <MetricCard
                                    label={t("budgets.metrics.used")}
                                    text={isReportReady ? t("budgets.percentUsed", { percent: Math.round(percentUsed) }) : metricStateLabel}
                                />
                                <MetricCard
                                    label={t("budgets.metrics.overBudget")}
                                    text={overBudgetCount === undefined ? metricStateLabel : String(overBudgetCount)}
                                    warning={(overBudgetCount ?? 0) > 0}
                                />
                            </div>
                        </div>
                        <div className="budgets-hero__burn">
                            <div className="budgets-hero__burn-header">
                                <span>{t("budgets.burnRate.title")}</span>
                                <span>{t("budgets.burnRate.subtitle")}</span>
                            </div>
                            <div className="budgets-hero__legend" aria-label={t("budgets.burnRate.legendLabel")}>
                                {(["ok", "near", "atLimit", "over", "idle"] as BudgetUsageStatus[]).map((status) => (
                                    <span className={`budget-status-legend is-${status}`} key={status}>
                                        <span aria-hidden="true" />
                                        {t(`budgets.usageStatus.${status}`)}
                                    </span>
                                ))}
                            </div>
                            {isReportReady ? (
                                <div className="budgets-hero__burn-list">
                                    {highestBurnBudgets.map(({ budget, percentUsed: rowPercent, status }) => (
                                        <div className="budgets-burn-row" key={budget.id}>
                                            <span title={budget.name}>{budget.name}</span>
                                            <UsageBar percent={rowPercent} status={status} />
                                            <strong>{t("budgets.percentUsed", { percent: Math.round(rowPercent) })}</strong>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="budgets-hero__burn-state">{metricStateLabel}</div>
                            )}
                        </div>
                    </section>
                    )}

                    {!showFirstUseEmpty && (
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
                    )}

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
                            {(reportError || hasCurrencyResolutionError || currencyLoadError) && (
                                <Alert
                                    message={t("budgets.error.reportMetrics")}
                                    type="warning"
                                    showIcon
                                    action={
                                        <InExButton
                                            kind="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (reportCurrency) {
                                                    refetchBudgetReport();
                                                } else {
                                                    setCurrenciesResolved(false);
                                                    setCurrencyReloadToken((current) => current + 1);
                                                }
                                            }}
                                        >
                                            {t("budgets.error.retry")}
                                        </InExButton>
                                    }
                                />
                            )}
                            {isBudgetDataLoading ? (
                                <BudgetSkeleton />
                            ) : showFirstUseEmpty ? (
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
                                        <span>{t("budgets.dailyPace")}</span>
                                        <span>{t("budgets.spent")}</span>
                                        <span>{t("budgets.remaining")}</span>
                                        <span>{t("budgets.metrics.budgeted")}</span>
                                    </div>
                                    {filteredBudgets.map((budget) => {
                                        const reportItem = getBudgetReportForBudget(budget, reportItems);
                                        const spentAmount = getReportMetric(reportItem, "spentAmount");
                                        const remainingAmount = getReportMetric(reportItem, "remainingAmount");
                                        const percentageUsed = getReportMetric(reportItem, "percentageUsed");
                                        const usageStatus = isReportReady ? getBudgetUsageStatus(reportItem) : "unavailable";
                                        const overBudget = usageStatus === "over";
                                        const atLimit = usageStatus === "atLimit";
                                        const expanded = expandedBudgetId === budget.id;
                                        const { categoryNames, parentNames } = getBudgetCategoryContext(budget);
                                        const pace = isReportReady && reportItem
                                            ? getBudgetPaceMetrics({
                                                budgetedAmount: budget.value,
                                                spentAmount: reportItem.spentAmount,
                                                selectedMonth,
                                                today,
                                            })
                                            : undefined;
                                        const snapshot: BudgetEditSnapshot | undefined = isReportReady && reportItem
                                            ? getBudgetEditSnapshot({
                                                budgetedAmount: budget.value,
                                                spentAmount: reportItem.spentAmount,
                                                remainingAmount: reportItem.remainingAmount,
                                                selectedMonth,
                                                today,
                                            })
                                            : undefined;

                                        return (
                                            <article className={`budget-row is-${usageStatus}`} key={budget.id}>
                                                <button
                                                    className="budget-row__main"
                                                    type="button"
                                                    onClick={() => setExpandedBudgetId(expanded ? null : budget.id)}
                                                    aria-expanded={expanded}
                                                >
                                                    <span className="budget-row__title">{budget.name}</span>
                                                    <span className="budget-row__parent-context">
                                                        {parentNames.length > 0
                                                            ? parentNames.join(" / ")
                                                            : t("budgets.uncategorized")}
                                                    </span>
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
                                                    {isReportReady && reportItem ? (
                                                        <UsageBar percent={percentageUsed ?? 0} status={usageStatus} />
                                                    ) : (
                                                        <div className="budget-usage-bar is-unavailable">
                                                            <span>{metricStateLabel}</span>
                                                        </div>
                                                    )}
                                                    <span className="budget-row__status">
                                                        {!isReportReady
                                                            ? metricStateLabel
                                                            : overBudget
                                                                ? t("budgets.overBudgetBy", {
                                                                    amount: Math.abs(remainingAmount ?? 0).toLocaleString(undefined, {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2,
                                                                    }),
                                                                    currency,
                                                                })
                                                                : atLimit
                                                                    ? t("budgets.atLimit")
                                                                    : t("budgets.percentUsed", { percent: Math.round(percentageUsed ?? 0) })}
                                                    </span>
                                                </div>
                                                <div className="budget-row__pace" data-label={t("budgets.dailyPace")}>
                                                    {pace ? (
                                                        <PaceCell pace={pace} currency={currency} />
                                                    ) : (
                                                        <span>{metricStateLabel}</span>
                                                    )}
                                                </div>
                                                <div className="budget-row__amount" data-label={t("budgets.spent")}>
                                                    {!isReportReady || spentAmount === undefined ? (
                                                        <span>{metricStateLabel}</span>
                                                    ) : (
                                                        <Num value={spentAmount} currency={currency} kind="expense" />
                                                    )}
                                                </div>
                                                <div className="budget-row__amount" data-label={t("budgets.remaining")}>
                                                    {!isReportReady || remainingAmount === undefined ? (
                                                        <span>{metricStateLabel}</span>
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
                                                {(overBudget || atLimit) && (
                                                    <div className="budget-row__notice">
                                                        <Target size={14} />
                                                        {overBudget ? t("budgets.overBudget") : t("budgets.atLimit")}
                                                    </div>
                                                )}
                                                {expanded && (
                                                    <div className="budget-row__edit">
                                                        <BudgetEditForm
                                                            record={budget}
                                                            currency={currency}
                                                            selectedMonth={selectedMonth}
                                                            snapshot={snapshot}
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

const formatMetricAmount = (amount: number) =>
    Math.abs(amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

interface PaceDisplayProps {
    pace: BudgetPaceMetrics;
    currency: string;
}

const PaceVerdict: React.FC<PaceDisplayProps> = ({ pace, currency }) => {
    const { t } = useTranslation();
    const amount = formatMetricAmount(pace.paceDelta);

    if (pace.paceStatus === "overBudget") {
        return <span className="pace-verdict is-overBudget">{t("budgets.pace.overBudget")}</span>;
    }
    if (pace.paceStatus === "ahead") {
        return (
            <span className="pace-verdict is-ahead">
                {t("budgets.pace.aheadBy", { amount, currency })}
            </span>
        );
    }
    if (pace.paceStatus === "under") {
        return (
            <span className="pace-verdict is-under">
                {t("budgets.pace.underBy", { amount, currency })}
            </span>
        );
    }
    if (pace.paceStatus === "onPace") {
        return <span className="pace-verdict is-onPace">{t("budgets.pace.onPace")}</span>;
    }
    return <span className="pace-verdict is-idle">{t("budgets.pace.idle")}</span>;
};

const PaceCell: React.FC<PaceDisplayProps> = ({ pace, currency }) => {
    const { t } = useTranslation();
    const dailyAverage = formatMetricAmount(pace.dailyAverageSpent);
    const paceDelta = formatMetricAmount(pace.paceDelta);

    return (
        <div className="budget-pace-cell">
            <strong>{t("budgets.pace.dailyAverage", { amount: dailyAverage, currency })}</strong>
            <span className={`pace-verdict is-${pace.paceStatus}`}>
                {pace.paceStatus === "ahead" && t("budgets.pace.deltaAhead", { amount: paceDelta, currency })}
                {pace.paceStatus === "under" && t("budgets.pace.deltaUnder", { amount: paceDelta, currency })}
                {pace.paceStatus === "onPace" && t("budgets.pace.deltaOnPace")}
                {pace.paceStatus === "overBudget" && t("budgets.pace.deltaOverBudget")}
                {pace.paceStatus === "idle" && t("budgets.pace.idle")}
            </span>
        </div>
    );
};

interface UsageBarProps {
    percent: number;
    status: BudgetUsageStatus;
    markerPercent?: number;
    markerLabel?: string;
}

const UsageBar: React.FC<UsageBarProps> = ({ percent, status, markerPercent, markerLabel }) => {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const roundedPercent = Math.round(clampedPercent);
    const clampedMarkerPercent = markerPercent === undefined
        ? undefined
        : Math.max(0, Math.min(100, markerPercent));

    return (
        <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={roundedPercent}
            className={`budget-usage-bar is-${status}`}
            role="progressbar"
        >
            <span style={{ width: `${clampedPercent}%` }} />
            {clampedMarkerPercent !== undefined && (
                <i
                    aria-label={markerLabel}
                    className="budget-usage-bar__marker"
                    style={{ left: `${clampedMarkerPercent}%` }}
                    title={markerLabel}
                />
            )}
        </div>
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
