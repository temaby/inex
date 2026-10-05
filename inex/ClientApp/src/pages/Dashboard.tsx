import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Spin } from "antd";
import dayjs from "dayjs";
import { ArrowDown, ArrowUp, ChevronLeft, Landmark, Layers3, WalletCards } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { InExButton, Num, SegmentedControl } from "../components/primitives";
import BasicPage from "../layouts/BasicPage";
import { fetchCachedRatesForRange } from "../store/rates/rates-action";
import { useGetAccountsQuery, useGetAccountsSummaryQuery } from "../store/accounts/accounts-api";
import { useGetCategoriesQuery } from "../store/categories/categories-api";
import { useGetTransactionsQuery, useGetTransactionsSummaryQuery } from "../store/transactions/transactions-api";
import { transactionsDefaultFilter } from "../store/transactions/transactions-slice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
    getAccountBalanceConversionResult,
    getBaseCurrencyEquivalent,
    getCashFlowConversionResult,
    getCurrentTransactionMonthRange,
} from "./Transactions/transaction-ledger-utils";
import {
    buildDashboardCategorySlices,
    buildDashboardTransactionFilter,
    type DashboardCategoryMode,
    type DashboardCategorySlice,
    type DashboardFlow,
} from "./Dashboard/dashboard-utils";
import "./Dashboard/dashboard.css";

export const DASHBOARD_INCOME_COLORS = [
    "#147D64",
    "#2478D0",
    "#00A6A6",
    "#6D5BD0",
    "#2E9B46",
    "#3F51B5",
    "#0088CC",
    "#5B8C00",
    "#546E7A",
];

export const DASHBOARD_EXPENSE_COLORS = [
    "#C53D43",
    "#E76F51",
    "#D97706",
    "#C0266D",
    "#A63A50",
    "#F59E0B",
    "#E4572E",
    "#9F2B68",
    "#B45309",
];

interface CategoryPanelProps {
    currency: string;
    flow: DashboardFlow;
    isError: boolean;
    isLoading: boolean;
    isUnavailable: boolean;
    locale: string;
    missingRates: string[];
    mode: DashboardCategoryMode;
    selectedParentName?: string;
    slices: DashboardCategorySlice[];
    onBack: () => void;
    onRetry: () => void;
    onSelect: (slice: DashboardCategorySlice) => void;
}

const CategoryPanel = ({
    currency,
    flow,
    isError,
    isLoading,
    isUnavailable,
    locale,
    missingRates,
    mode,
    selectedParentName,
    slices,
    onBack,
    onRetry,
    onSelect,
}: CategoryPanelProps) => {
    const { t } = useTranslation();
    const [otherExpanded, setOtherExpanded] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const lastParentButtonRef = useRef<HTMLButtonElement | null>(null);
    const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
    const colors = flow === "income" ? DASHBOARD_INCOME_COLORS : DASHBOARD_EXPENSE_COLORS;

    useEffect(() => {
        setOtherExpanded(false);
    }, [mode, selectedParentName, slices]);

    useEffect(() => {
        if (selectedParentName) headingRef.current?.focus();
    }, [selectedParentName]);

    const returnToParents = () => {
        onBack();
        window.requestAnimationFrame(() => lastParentButtonRef.current?.focus());
    };

    return (
        <section
            className={`dashboard-panel dashboard-category-panel dashboard-category-panel--${flow}`}
            data-qa={`dashboard-${flow}-categories`}
            onKeyDown={(event) => {
                if (event.key === "Escape" && selectedParentName) {
                    event.preventDefault();
                    returnToParents();
                }
            }}
        >
            <div className="dashboard-panel__header">
                <div>
                    <span className="dashboard-panel__eyebrow">{t("dashboard.categories.eyebrow")}</span>
                    <h2 className="dashboard-panel__title" ref={headingRef} tabIndex={-1}>{t(`dashboard.categories.${flow}Title`)}</h2>
                    <p className="dashboard-panel__context">
                        {selectedParentName
                            ? t("dashboard.categories.childrenOf", { category: selectedParentName })
                            : t(`dashboard.categories.${mode}Context`)}
                    </p>
                </div>
                <Layers3 size={18} aria-hidden="true" />
            </div>

            {selectedParentName && (
                <InExButton icon={<ChevronLeft size={15} />} kind="ghost" onClick={returnToParents} size="sm">
                    {t("dashboard.categories.backToParents")}
                </InExButton>
            )}

            <Spin spinning={isLoading} tip={t("dashboard.categories.loading")}>
                {isError ? (
                    <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                        {t("dashboard.categories.error")}
                    </div>
                ) : isUnavailable ? (
                    <div className="dashboard-panel-state" role="status">
                        <strong>{t("dashboard.unavailable.title")}</strong>
                        <span>{t("dashboard.unavailable.rates", { currencies: missingRates.join(", ") })}</span>
                        <InExButton kind="ghost" onClick={onRetry} size="sm">{t("dashboard.unavailable.retry")}</InExButton>
                    </div>
                ) : slices.length === 0 ? (
                    <div className="dashboard-panel-state" role="status">
                        {t(`dashboard.categories.${flow}Empty`)}
                    </div>
                ) : (
                    <div className="dashboard-donut-layout">
                        <div className="dashboard-donut" aria-hidden="true">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={slices}
                                        dataKey="amount"
                                        innerRadius="58%"
                                        nameKey="label"
                                        outerRadius="84%"
                                        paddingAngle={2}
                                        stroke="var(--bg-surface)"
                                        strokeWidth={2}
                                    >
                                        {slices.map((slice, index) => (
                                            <Cell fill={colors[index % colors.length]} key={slice.key} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [
                                            new Intl.NumberFormat(locale, {
                                                style: "currency",
                                                currency: currency || "USD",
                                                maximumFractionDigits: 2,
                                            }).format(Number(value)),
                                            t("dashboard.categories.amount"),
                                        ]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="dashboard-donut__total">
                                <strong>{slices.length}</strong>
                                <span>{t("dashboard.categories.visible")}</span>
                            </div>
                        </div>

                        <ol className="dashboard-chart-legend" aria-label={t(`dashboard.categories.${flow}Summary`)}>
                            {slices.map((slice, index) => {
                                const percentage = total > 0 ? (slice.amount / total) * 100 : 0;
                                const action = slice.isOther
                                    ? () => setOtherExpanded((value) => !value)
                                    : () => onSelect(slice);
                                return (
                                    <li key={slice.key}>
                                        <button
                                            aria-expanded={slice.isOther ? otherExpanded : undefined}
                                            className="dashboard-chart-legend__button"
                                            onClick={(event) => {
                                                if (!slice.isOther && mode === "parent" && !selectedParentName) {
                                                    lastParentButtonRef.current = event.currentTarget;
                                                }
                                                action();
                                            }}
                                            type="button"
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="dashboard-chart-legend__swatch"
                                                style={{ background: colors[index % colors.length] }}
                                            />
                                            <span className="dashboard-chart-legend__label">{slice.label}</span>
                                            <span className="dashboard-chart-legend__percentage">{percentage.toFixed(0)}%</span>
                                            <Num
                                                currency={currency}
                                                currencySize="sm"
                                                kind={flow}
                                                value={flow === "expense" ? -slice.amount : slice.amount}
                                            />
                                        </button>
                                        {slice.isOther && otherExpanded && slice.members && (
                                            <ol className="dashboard-other-list">
                                                {slice.members.map((member) => (
                                                    <li key={member.key}>
                                                        <button onClick={() => onSelect(member)} type="button">
                                                            <span>{member.label}</span>
                                                            <Num
                                                                currency={currency}
                                                                currencySize="sm"
                                                                kind={flow}
                                                                value={flow === "expense" ? -member.amount : member.amount}
                                                            />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                )}
            </Spin>
        </section>
    );
};

const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const selectedLinkedUserId = useAppSelector((state) => state.linkedAccount.selectedLinkedUserId);
    const selectedLinkedAccount = useAppSelector((state) => state.linkedAccount.linkState?.linkedAccounts.find(
        (account) => account.id === state.linkedAccount.selectedLinkedUserId,
    ));
    const dailyRates = useAppSelector((state) => state.rates.items);
    const cachedRates = useAppSelector((state) => state.rates.cached);
    const [categoryMode, setCategoryMode] = useState<DashboardCategoryMode>("parent");
    const [expenseParentId, setExpenseParentId] = useState<number | null>(null);
    const [incomeParentId, setIncomeParentId] = useState<number | null>(null);
    const [accountsExpanded, setAccountsExpanded] = useState(false);

    const [monthRange, setMonthRange] = useState(() => getCurrentTransactionMonthRange());

    useEffect(() => {
        let timeoutId: number;
        const scheduleMonthRefresh = () => {
            const nextMonth = dayjs().add(1, "month").startOf("month");
            const delayUntilNextCheck = Math.min(
                Math.max(nextMonth.diff(dayjs()) + 1_000, 1_000),
                24 * 60 * 60 * 1_000,
            );
            timeoutId = window.setTimeout(() => {
                const nextRange = getCurrentTransactionMonthRange();
                setMonthRange((currentRange) => (
                    currentRange[0] === nextRange[0] && currentRange[1] === nextRange[1]
                        ? currentRange
                        : nextRange
                ));
                scheduleMonthRefresh();
            }, delayUntilNextCheck);
        };

        scheduleMonthRefresh();

        return () => window.clearTimeout(timeoutId);
    }, []);
    const startDate = dayjs.unix(monthRange[0]).format("YYYY-MM-DD");
    const endDate = dayjs.unix(monthRange[1]).format("YYYY-MM-DD");
    const accountsQuery = useGetAccountsQuery(
        selectedLinkedUserId == null
            ? "ALL"
            : { mode: "ALL", linkedUserId: selectedLinkedUserId },
    );
    const categoriesQuery = useGetCategoriesQuery(
        selectedLinkedUserId == null
            ? "ALL"
            : { mode: "ALL", linkedUserId: selectedLinkedUserId },
    );
    const visibleAccounts = useMemo(
        () => (accountsQuery.currentData ?? []).filter((account) => account.isEnabled && account.isFavourite !== false),
        [accountsQuery.currentData],
    );
    const visibleAccountIds = useMemo(() => visibleAccounts.map((account) => account.id), [visibleAccounts]);
    const summaryFilter = useMemo(() => ({
        ...transactionsDefaultFilter,
        accountIds: visibleAccountIds,
        range: monthRange,
    }), [monthRange, visibleAccountIds]);
    const hasVisibleAccounts = visibleAccountIds.length > 0;
    const summaryQuery = useGetTransactionsSummaryQuery({
        filter: summaryFilter,
        linkedUserId: selectedLinkedUserId,
    }, { skip: !hasVisibleAccounts });
    const categoryTransactionsQuery = useGetTransactionsQuery({
        pageSize: 0,
        page: 0,
        filter: summaryFilter,
        linkedUserId: selectedLinkedUserId,
    }, { skip: !hasVisibleAccounts });
    const accountBalancesQuery = useGetAccountsSummaryQuery({
        ids: visibleAccountIds,
        linkedUserId: selectedLinkedUserId,
    }, { skip: visibleAccountIds.length === 0 });
    const visibleAccountIdSet = useMemo(() => new Set(visibleAccountIds), [visibleAccountIds]);
    const accountBalances = useMemo(
        () => (accountBalancesQuery.currentData ?? []).filter((account) => visibleAccountIdSet.has(account.id)),
        [accountBalancesQuery.currentData, visibleAccountIdSet],
    );
    const baseCurrency = selectedLinkedAccount?.baseCurrency
        ?? summaryQuery.currentData?.baseCurrency
        ?? dailyRates[0]?.currencyFrom
        ?? "";

    const accountNeedsRate = accountBalances.some(
        (account) => account.value !== 0 && account.currency !== baseCurrency,
    );
    const cashFlowNeedsRate = (summaryQuery.currentData?.currentScope.cashFlowBuckets ?? []).some(
        (bucket) => (bucket.income !== 0 || bucket.expense !== 0) && bucket.currency !== baseCurrency,
    );
    const categoryNeedsRate = (categoryTransactionsQuery.currentData?.data ?? []).some(
        (transaction) => transaction.amount !== 0 && transaction.accountCurrency !== baseCurrency,
    );
    const needsCachedRates = accountNeedsRate || cashFlowNeedsRate || categoryNeedsRate;
    const cachedRateKey = `${selectedLinkedUserId ?? "self"}:${startDate}:${endDate}`;

    useEffect(() => {
        if (!needsCachedRates || cachedRates?.completedKey === cachedRateKey || cachedRates?.requestKey === cachedRateKey) return;
        void dispatch(fetchCachedRatesForRange(startDate, endDate, selectedLinkedUserId));
    }, [cachedRateKey, cachedRates?.completedKey, cachedRates?.requestKey, dispatch, endDate, needsCachedRates, selectedLinkedUserId, startDate]);

    useEffect(() => {
        setExpenseParentId(null);
        setIncomeParentId(null);
        setAccountsExpanded(false);
    }, [categoryMode, selectedLinkedUserId]);

    const exchangeRates = cachedRates?.completedKey === cachedRateKey ? cachedRates.items : [];
    const ratesLoading = needsCachedRates && (
        cachedRates?.completedKey !== cachedRateKey
        || (cachedRates?.requestKey === cachedRateKey && cachedRates.loading)
    );
    const retryRates = () => {
        void dispatch(fetchCachedRatesForRange(startDate, endDate, selectedLinkedUserId));
    };
    const accountConversion = useMemo(
        () => baseCurrency
            ? getAccountBalanceConversionResult(accountBalances, baseCurrency, exchangeRates)
            : { value: 0, isComplete: false, unavailableCurrencies: [] },
        [accountBalances, baseCurrency, exchangeRates],
    );
    const cashFlowConversion = useMemo(
        () => summaryQuery.currentData && baseCurrency
            ? getCashFlowConversionResult(summaryQuery.currentData.currentScope, baseCurrency, exchangeRates)
            : null,
        [baseCurrency, exchangeRates, summaryQuery.currentData],
    );

    const categorySource = categoriesQuery.currentData ?? [];
    const categoryConversion = useMemo(() => {
        const rows: Array<{ id: number; value: number }> = [];
        const missing: Record<DashboardFlow, string[]> = { income: [], expense: [] };

        for (const transaction of categoryTransactionsQuery.currentData?.data ?? []) {
            const flow: DashboardFlow = transaction.amount >= 0 ? "income" : "expense";
            let value = transaction.amount;
            if (transaction.accountCurrency !== baseCurrency) {
                const converted = getBaseCurrencyEquivalent(
                    transaction.amount,
                    transaction.accountCurrency,
                    transaction.created,
                    baseCurrency,
                    exchangeRates,
                );
                if (!converted) {
                    missing[flow].push(`${transaction.accountCurrency} (${dayjs(transaction.created).format("YYYY-MM-DD")})`);
                    continue;
                }
                value = converted.value;
            }
            rows.push({ id: transaction.categoryId, value });
        }

        return {
            rows,
            incomeMissingRates: Array.from(new Set(missing.income)),
            expenseMissingRates: Array.from(new Set(missing.expense)),
        };
    }, [baseCurrency, categoryTransactionsQuery.currentData, exchangeRates]);
    const expenseSlices = useMemo(() => buildDashboardCategorySlices({
        categories: categorySource,
        reportData: categoryConversion.rows,
        flow: "expense",
        mode: categoryMode,
        selectedParentId: categoryMode === "parent" ? expenseParentId : null,
        otherLabel: t("dashboard.categories.other"),
    }), [categoryConversion.rows, categoryMode, categorySource, expenseParentId, t]);
    const incomeSlices = useMemo(() => buildDashboardCategorySlices({
        categories: categorySource,
        reportData: categoryConversion.rows,
        flow: "income",
        mode: categoryMode,
        selectedParentId: categoryMode === "parent" ? incomeParentId : null,
        otherLabel: t("dashboard.categories.other"),
    }), [categoryConversion.rows, categoryMode, categorySource, incomeParentId, t]);

    const expenseParentName = categorySource.find((category) => category.id === expenseParentId)?.name;
    const incomeParentName = categorySource.find((category) => category.id === incomeParentId)?.name;
    useEffect(() => {
        if (expenseParentId != null && !expenseParentName) setExpenseParentId(null);
        if (incomeParentId != null && !incomeParentName) setIncomeParentId(null);
    }, [expenseParentId, expenseParentName, incomeParentId, incomeParentName]);
    const cashFlowWarnings = cashFlowConversion?.warnings ?? [];
    const missingCashFlowRates = Array.from(new Set(cashFlowWarnings.map(
        (warning) => `${warning.currency} (${warning.date})`,
    )));
    const cashFlowChartData = [
        {
            key: "income",
            label: t("dashboard.cashFlow.income"),
            value: cashFlowConversion?.isComplete ? cashFlowConversion.income : 0,
            fill: "var(--income-500)",
        },
        {
            key: "expense",
            label: t("dashboard.cashFlow.expenses"),
            value: cashFlowConversion?.isComplete ? Math.abs(cashFlowConversion.expense) : 0,
            fill: "var(--expense-500)",
        },
    ];

    const formatMoney = (value: number) => new Intl.NumberFormat(i18n.language, {
        style: "currency",
        currency: baseCurrency || "USD",
        maximumFractionDigits: 0,
    }).format(value);

    const openFlow = (flow: DashboardFlow) => {
        navigate(`/transactions?filter=accountIds:${visibleAccountIds.join(",")};start:${startDate};end:${endDate};type:${flow};`);
    };

    const selectCategory = (flow: DashboardFlow, slice: DashboardCategorySlice) => {
        if (slice.id == null) return;
        const hasChildren = categorySource.some((category) => category.parentId === slice.id);
        const selectedParentId = flow === "expense" ? expenseParentId : incomeParentId;
        if (categoryMode === "parent" && selectedParentId == null && hasChildren) {
            if (flow === "expense") setExpenseParentId(slice.id);
            else setIncomeParentId(slice.id);
            return;
        }

        navigate(`/transactions?filter=${buildDashboardTransactionFilter({
            accountIds: visibleAccountIds,
            categoryIds: slice.categoryIds.length > 0 ? slice.categoryIds : [slice.id],
            flow,
            startDate,
            endDate,
        })}`);
    };

    const accountSummaryComplete = visibleAccountIds.every((id) => visibleAccountIdSet.has(id)
        && accountBalances.some((account) => account.id === id));
    const accountDataLoading = accountsQuery.isLoading || accountBalancesQuery.isLoading;
    const accountDataError = accountsQuery.isError
        || accountBalancesQuery.isError
        || (hasVisibleAccounts && !accountBalancesQuery.isLoading && !accountSummaryComplete);
    const balancePanelLoading = accountDataLoading
        || (!baseCurrency && summaryQuery.isLoading)
        || (accountNeedsRate && ratesLoading);
    const balancePanelError = accountDataError || (!baseCurrency && summaryQuery.isError);
    const categoryPanelLoading = categoriesQuery.isLoading
        || categoryTransactionsQuery.isLoading
        || (!baseCurrency && summaryQuery.isLoading)
        || (categoryNeedsRate && ratesLoading);
    const hasCashFlow = Boolean(cashFlowConversion?.isComplete
        && (cashFlowConversion.income !== 0 || cashFlowConversion.expense !== 0));
    const oneSidedCashFlow = cashFlowConversion?.isComplete && hasCashFlow
        ? cashFlowConversion.income === 0
            ? t("dashboard.cashFlow.expenseOnly")
            : cashFlowConversion.expense === 0
                ? t("dashboard.cashFlow.incomeOnly")
                : null
        : null;
    const currentPeriodLabel = new Intl.DateTimeFormat(i18n.language, {
        month: "long",
        year: "numeric",
    }).format(dayjs(startDate).toDate());
    const effectiveDate = new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "medium",
    }).format(new Date());

    return (
        <BasicPage
            extra={<InExButton kind="primary" onClick={() => navigate("/transactions?create=true")}>{t("dashboard.addTransaction")}</InExButton>}
            frame="analytics"
            title={t("dashboard.title")}
            subtitle={t("dashboard.subtitle")}
        >
            <div className="dashboard-workspace">
                {selectedLinkedUserId !== null ? (
                    <Alert
                        message={t("linkedAccount.readOnly", { username: selectedLinkedAccount?.username ?? "" })}
                        showIcon
                        type="info"
                    />
                ) : null}

                <div className="dashboard-grid">
                    <section className="dashboard-panel dashboard-position-panel" data-qa="dashboard-position">
                    <div className="dashboard-position-panel__balance" data-qa="dashboard-balance">
                        <div className="dashboard-panel__header">
                            <div>
                                <span className="dashboard-panel__eyebrow">{t("dashboard.balance.eyebrow")}</span>
                                <h2 className="dashboard-panel__title">{t("dashboard.balance.title")}</h2>
                            </div>
                            <WalletCards size={19} aria-hidden="true" />
                        </div>
                        <Spin spinning={balancePanelLoading} tip={t("dashboard.balance.loading")}>
                            {balancePanelError ? (
                                <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                                    {t("dashboard.balance.error")}
                                </div>
                            ) : visibleAccounts.length === 0 ? (
                                <div className="dashboard-panel-state" role="status">
                                    <span>{t("dashboard.balance.empty")}</span>
                                    <Link to="/accounts">{t("dashboard.balance.manageAccounts")}</Link>
                                </div>
                            ) : accountConversion.isComplete ? (
                                <div className="dashboard-balance-total">
                                    <Num currency={baseCurrency} kind="neutral" signage="signed" value={accountConversion.value} />
                                    <span>{t("dashboard.balance.accountCount", { count: visibleAccounts.length })}</span>
                                    <span>{t("dashboard.balance.effectiveDate", { date: effectiveDate })}</span>
                                </div>
                            ) : (
                                <div className="dashboard-balance-total dashboard-balance-total--unavailable" role="status">
                                    <strong>{t("dashboard.unavailable.short")}</strong>
                                    <span>{t("dashboard.unavailable.rates", {
                                        currencies: accountConversion.unavailableCurrencies
                                            .map((currency) => `${currency} (${dayjs().format("YYYY-MM-DD")})`)
                                            .join(", "),
                                    })}</span>
                                    <InExButton kind="ghost" onClick={retryRates} size="sm">{t("dashboard.unavailable.retry")}</InExButton>
                                </div>
                            )}
                        </Spin>
                    </div>

                    <div className="dashboard-position-panel__accounts" data-qa="dashboard-accounts">
                        <div className="dashboard-panel__header">
                            <div>
                                <span className="dashboard-panel__eyebrow">{t("dashboard.accounts.eyebrow")}</span>
                                <h2 className="dashboard-panel__title">{t("dashboard.accounts.title")}</h2>
                            </div>
                            <Link to="/accounts">{t("dashboard.accounts.open")}</Link>
                        </div>
                        <Spin spinning={accountDataLoading} tip={t("dashboard.balance.loading")}>
                            {accountDataError ? (
                                <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                                    {t("dashboard.balance.error")}
                                </div>
                            ) : accountBalances.length === 0 ? (
                                <div className="dashboard-panel-state" role="status">{t("dashboard.balance.empty")}</div>
                            ) : (
                                <>
                                <ul className={`dashboard-account-list${accountsExpanded ? " dashboard-account-list--expanded" : ""}`}>
                                    {accountBalances.map((account) => (
                                        <li key={account.id}>
                                            <Link to="/accounts">
                                                <span>{account.name}</span>
                                                <Num currency={account.currency} kind="neutral" signage="signed" value={account.value} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                {accountBalances.length > 3 ? (
                                    <InExButton
                                        aria-expanded={accountsExpanded}
                                        className="dashboard-account-list__toggle"
                                        kind="ghost"
                                        onClick={() => setAccountsExpanded((value) => !value)}
                                        size="sm"
                                    >
                                        {accountsExpanded ? t("dashboard.accounts.showLess") : t("dashboard.accounts.showAll", { count: accountBalances.length })}
                                    </InExButton>
                                ) : null}
                                </>
                            )}
                        </Spin>
                    </div>
                    </section>

                    <section className="dashboard-panel dashboard-cash-flow-panel" data-qa="dashboard-cash-flow">
                    <div className="dashboard-panel__header">
                        <div>
                            <span className="dashboard-panel__eyebrow">{t("dashboard.cashFlow.eyebrow")}</span>
                            <h2 className="dashboard-panel__title">{t("dashboard.cashFlow.title")}</h2>
                            <p className="dashboard-panel__context">{t("dashboard.cashFlow.period", { period: currentPeriodLabel })}</p>
                        </div>
                        <Landmark size={18} aria-hidden="true" />
                    </div>
                    <Spin spinning={summaryQuery.isLoading || ratesLoading} tip={t("dashboard.cashFlow.loading")}>
                        {summaryQuery.isError ? (
                            <div className="dashboard-panel-state dashboard-panel-state--error" role="alert">
                                {t("dashboard.cashFlow.error")}
                            </div>
                        ) : cashFlowConversion && !cashFlowConversion.isComplete && !ratesLoading ? (
                            <div className="dashboard-panel-state" role="status">
                                <strong>{t("dashboard.unavailable.title")}</strong>
                                <span>{t("dashboard.unavailable.rates", { currencies: missingCashFlowRates.join(", ") })}</span>
                                <InExButton kind="ghost" onClick={retryRates} size="sm">{t("dashboard.unavailable.retry")}</InExButton>
                            </div>
                        ) : !hasCashFlow ? (
                            <div className="dashboard-panel-state" role="status">
                                <strong>{t("dashboard.cashFlow.noActivity")}</strong>
                                <span>{t("dashboard.cashFlow.noActivityHint")}</span>
                                {selectedLinkedUserId === null ? (
                                    <InExButton kind="primary" onClick={() => navigate("/transactions?create=true")} size="sm">
                                        {t("dashboard.addTransaction")}
                                    </InExButton>
                                ) : null}
                            </div>
                        ) : (
                            <div className="dashboard-cash-flow-layout">
                                <div className="dashboard-cash-flow-chart" aria-hidden="true">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cashFlowChartData} margin={{ top: 16, right: 12, bottom: 8, left: 12 }}>
                                            <CartesianGrid stroke="var(--border-1)" vertical={false} />
                                            <XAxis axisLine={false} dataKey="label" tickLine={false} />
                                            <YAxis axisLine={false} tickFormatter={(value) => formatMoney(Number(value))} tickLine={false} width={86} />
                                            <Tooltip formatter={(value) => [formatMoney(Number(value)), t("dashboard.categories.amount")]} />
                                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                                {cashFlowChartData.map((item) => <Cell fill={item.fill} key={item.key} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="dashboard-cash-flow-summary" aria-label={t("dashboard.cashFlow.summaryTitle")}>
                                    {oneSidedCashFlow ? <p className="dashboard-cash-flow-note">{oneSidedCashFlow}</p> : null}
                                    {cashFlowChartData.map((item) => (
                                        <button key={item.key} onClick={() => openFlow(item.key as DashboardFlow)} type="button">
                                            <span>
                                                {item.key === "income" ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}
                                                {item.label}
                                            </span>
                                            <span>
                                                <Num
                                                    currency={baseCurrency}
                                                    kind={item.key as DashboardFlow}
                                                    value={item.key === "expense" ? -item.value : item.value}
                                                />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Spin>
                    </section>

                    <div className="dashboard-category-toolbar">
                    <div>
                        <span className="dashboard-panel__eyebrow">{t("dashboard.categories.sectionEyebrow")}</span>
                        <h2>{t("dashboard.categories.sectionTitle")}</h2>
                    </div>
                    <SegmentedControl
                        label={t("dashboard.categories.level")}
                        onChange={(value) => setCategoryMode(value as DashboardCategoryMode)}
                        options={[
                            { key: "parent", label: t("dashboard.categories.parent") },
                            { key: "child", label: t("dashboard.categories.child") },
                        ]}
                        size="compact"
                        value={categoryMode}
                    />
                    </div>

                    <CategoryPanel
                    currency={baseCurrency}
                    flow="expense"
                    isError={categoriesQuery.isError || categoryTransactionsQuery.isError || (!baseCurrency && summaryQuery.isError)}
                    isLoading={categoryPanelLoading}
                    isUnavailable={categoryConversion.expenseMissingRates.length > 0 && !ratesLoading}
                    locale={i18n.language}
                    missingRates={categoryConversion.expenseMissingRates}
                    mode={categoryMode}
                    onBack={() => setExpenseParentId(null)}
                    onRetry={retryRates}
                    onSelect={(slice) => selectCategory("expense", slice)}
                    selectedParentName={expenseParentName}
                    slices={expenseSlices}
                    />
                    <CategoryPanel
                    currency={baseCurrency}
                    flow="income"
                    isError={categoriesQuery.isError || categoryTransactionsQuery.isError || (!baseCurrency && summaryQuery.isError)}
                    isLoading={categoryPanelLoading}
                    isUnavailable={categoryConversion.incomeMissingRates.length > 0 && !ratesLoading}
                    locale={i18n.language}
                    missingRates={categoryConversion.incomeMissingRates}
                    mode={categoryMode}
                    onBack={() => setIncomeParentId(null)}
                    onRetry={retryRates}
                    onSelect={(slice) => selectCategory("income", slice)}
                    selectedParentName={incomeParentName}
                    slices={incomeSlices}
                    />
                </div>
            </div>
        </BasicPage>
    );
};

export default Dashboard;
