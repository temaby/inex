import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight, Filter, Plus, SlidersHorizontal, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import BasicPage from "../layouts/BasicPage";
import { TransactionType } from "../model/Transaction/TransactionType";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccountResponse, useGetAccountsQuery, useGetAccountsSummaryQuery } from "../store/accounts/accounts-api";
import { CategoryResponse, useGetCategoriesQuery } from "../store/categories/categories-api";
import { useGetTransactionsSummaryQuery } from "../store/transactions/transactions-api";
import { fetchCachedRatesForRange } from "../store/rates/rates-action";
import { normalizeTransactionFilter, transactionsActions, transactionsDefaultFilter, type TransactionFilter } from "../store/transactions/transactions-slice";
import {
    InExButton,
    InExDrawer,
    Input,
    Num,
    SegmentedControl,
    type MoneyKind,
} from "../components/primitives";
import type { Signage } from "../components/primitives";
import TransactionCreate from "./Transactions/TransactionCreate";
import AccountBalancesCompanion from "./Transactions/AccountBalancesCompanion";
import TransactionFilterForm from "./Transactions/TransactionFilterForm";
import TransactionList from "./Transactions/TransactionList";
import { buildTransactionFilterSearch, parseTransactionFilterParam } from "./Transactions/transaction-filter-url";
import {
    emptyLedgerMetrics,
    formatTransactionMonthLabel,
    formatTransactionPeriodLabel,
    getCashFlowConversionResult,
    getCurrentTransactionMonthRange,
    isCurrentOrFutureTransactionMonth,
    isWholeTransactionMonthRange,
    shiftTransactionMonthRange,
} from "./Transactions/transaction-ledger-utils";
import "./Transactions/transactions-ledger.css";

const MONTH_FILTER_COMMIT_DELAY_MS = 250;

interface FilterChip {
    key: string;
    label: string;
    onClear: () => void;
}

const isTransactionFilterActive = (filter: TransactionFilter): boolean =>
    filter.accountIds.length > 0 ||
    filter.categoryIds.length > 0 ||
    filter.tags.length > 0 ||
    filter.refs.length > 0;

const formatDateRange = (range: number[]): string => {
    if (range.length !== 2) return "";

    const format = (value: number, fallback: string) =>
        value > 0 ? new Date(value * 1000).toISOString().slice(0, 10) : fallback;

    return `${format(range[0], "start")} - ${format(range[1], "end")}`;
};

const areRangesEqual = (left: number[], right: number[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const useIsMobileViewport = (): boolean => {
    const getIsMobile = () => {
        if (typeof window === "undefined") return false;

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        return viewportWidth > 0 && viewportWidth <= 768;
    };
    const [isMobile, setIsMobile] = useState(getIsMobile);

    useEffect(() => {
        const handleResize = () => setIsMobile(getIsMobile());

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isMobile;
};

const Transactions = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobileViewport = useIsMobileViewport();

    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get("filter");

    const {
        data: allAccounts = [],
        isError: accountsError,
        isLoading: accountsLoading,
        refetch: refetchAccounts,
    } = useGetAccountsQuery("ALL");
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
    const formError = useAppSelector(state => state.transactions.error);
    const cachedExchangeRates = useAppSelector(state => state.rates.cached?.items ?? []);
    const cachedRatesLoading = useAppSelector(state => state.rates.cached?.loading ?? false);
    const cachedRatesCompletedKey = useAppSelector(state => state.rates.cached?.completedKey ?? null);

    const [addDrawerOpen, setAddDrawerOpen] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [accountBalancesOpen, setAccountBalancesOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [createMode, setCreateMode] = useState<TransactionType>(TransactionType.EXPENSE);
    const [ledgerVisibleCount, setLedgerVisibleCount] = useState(0);
    const [ledgerInitialLoading, setLedgerInitialLoading] = useState(false);
    const [ledgerRefreshToken, setLedgerRefreshToken] = useState(0);

    const activeAccounts = useMemo(
        () => allAccounts.filter((account: AccountResponse) => account.isEnabled),
        [allAccounts],
    );
    const activeCategories = useMemo(
        () => allCategories.filter((category: CategoryResponse) => category.isEnabled),
        [allCategories],
    );
    const activeAccountIds = useMemo(() => activeAccounts.map(account => account.id), [activeAccounts]);
    const accountBalancesQuery = useGetAccountsSummaryQuery(activeAccountIds, {
        skip: !(accountBalancesOpen || addDrawerOpen || editDrawerOpen) || activeAccountIds.length === 0,
    });
    const accountBalances = accountBalancesQuery.currentData ?? accountBalancesQuery.data ?? [];
    const accountBalancesLoading = accountBalancesOpen && (
        accountsLoading ||
        accountBalancesQuery.isLoading ||
        (accountBalancesQuery.isFetching && accountBalancesQuery.currentData === undefined)
    );
    const accountBalancesError = accountsError || accountBalancesQuery.isError;
    const retryAccountBalances = () => {
        if (accountsError) {
            void refetchAccounts();
            return;
        }

        void accountBalancesQuery.refetch();
    };

    useEffect(() => {
        if (!accountBalancesOpen || isMobileViewport) return;

        document.getElementById("transactions-account-balances-trigger")?.focus();
    }, [accountBalancesOpen, isMobileViewport]);

    const canonicalFilter = useMemo(() => normalizeTransactionFilter(
        parseTransactionFilterParam(filterParam) ?? {
            ...transactionsDefaultFilter,
            range: getCurrentTransactionMonthRange(),
        },
    ), [filterParam]);
    const filterActive = isTransactionFilterActive(canonicalFilter) || canonicalFilter.type !== "all" || canonicalFilter.search !== "";
    const filterIndicatorTitle = filterActive ? t("transactions.filtersActive") : undefined;
    const activeMonthRange = canonicalFilter.range;
    const activeMonthRangeKey = activeMonthRange.join(":");
    const [pendingMonthRange, setPendingMonthRange] = useState<number[]>(activeMonthRange);
    const pendingMonthRangeKey = pendingMonthRange.join(":");
    const summaryQuery = useGetTransactionsSummaryQuery(canonicalFilter);
    const summaryData = summaryQuery.currentData;
    const summaryInitialLoading = summaryQuery.isLoading || (summaryQuery.isFetching && summaryData === undefined);
    const baseCurrency = summaryData?.baseCurrency ?? "USD";
    const cachedRateRange = useMemo(() => {
        const currentPeriod = summaryData?.currentScope.period;
        if (!currentPeriod) return null;

        const needsCachedRate = [summaryData.currentScope, summaryData.previousScope]
            .flatMap(scope => scope?.cashFlowBuckets ?? [])
            .some(bucket => (bucket.income !== 0 || bucket.expense !== 0) && bucket.currency !== baseCurrency);
        if (!needsCachedRate) return null;

        const startDate = summaryData.previousScope?.period?.startDate.slice(0, 10) ?? currentPeriod.startDate.slice(0, 10);
        const endDate = currentPeriod.endDate.slice(0, 10);
        return { startDate, endDate, key: `${startDate}:${endDate}` };
    }, [baseCurrency, summaryData]);
    const currentConversion = useMemo(
        () => summaryData
            ? getCashFlowConversionResult(summaryData.currentScope, baseCurrency, cachedExchangeRates)
            : null,
        [baseCurrency, cachedExchangeRates, summaryData],
    );
    const previousConversion = useMemo(
        () => summaryData?.previousScope
            ? getCashFlowConversionResult(summaryData.previousScope, baseCurrency, cachedExchangeRates)
            : null,
        [baseCurrency, cachedExchangeRates, summaryData],
    );
    const scopedMetrics = summaryData
        ? {
            ...emptyLedgerMetrics,
            income: currentConversion?.income ?? 0,
            expense: currentConversion?.expense ?? 0,
            net: currentConversion?.net ?? 0,
            totalCount: summaryData.currentScope.totalCount,
            typeCounts: summaryData.currentScope.typeCounts,
        }
        : emptyLedgerMetrics;
    const scopedTotalCount = scopedMetrics.totalCount;
    const noMatchActive = filterActive && summaryData?.currentScope.totalCount === 0;
    const periodLabel = useMemo(
        () => isWholeTransactionMonthRange(activeMonthRange)
            ? formatTransactionMonthLabel(activeMonthRange, t("transactions.period.currentMonth"))
            : formatTransactionPeriodLabel(activeMonthRange, t("transactions.period.currentMonth")),
        [activeMonthRange, t],
    );
    const nextMonthDisabled = useMemo(
        () => isCurrentOrFutureTransactionMonth(pendingMonthRange),
        [pendingMonthRange],
    );
    const pendingMonthPickerValue = useMemo(
        () => pendingMonthRange.length === 2 && pendingMonthRange[0] > 0
            ? dayjs.unix(pendingMonthRange[0])
            : dayjs(),
        [pendingMonthRangeKey],
    );

    useEffect(() => {
        if (!cachedRateRange) return;
        dispatch(fetchCachedRatesForRange(cachedRateRange.startDate, cachedRateRange.endDate));
    }, [cachedRateRange, dispatch]);

    const applyServerFilter = useCallback((nextFilter: TransactionFilter, replace = true) => {
        const normalizedFilter = normalizeTransactionFilter(nextFilter);
        dispatch(transactionsActions.setFilter({ filter: normalizedFilter }));
        navigate(`${location.pathname}${buildTransactionFilterSearch(normalizedFilter)}`, { replace });
    }, [dispatch, location.pathname, navigate]);

    useEffect(() => {
        dispatch(transactionsActions.setFilter({ filter: canonicalFilter }));
        const normalizedSearch = buildTransactionFilterSearch(canonicalFilter);
        if (location.search !== normalizedSearch) {
            navigate(`${location.pathname}${normalizedSearch}`, { replace: true });
        }
    }, [canonicalFilter, dispatch, location.pathname, location.search, navigate]);

    useEffect(() => {
        setPendingMonthRange(activeMonthRange);
    }, [activeMonthRangeKey]);

    useEffect(() => {
        if (areRangesEqual(pendingMonthRange, activeMonthRange)) return undefined;

        const timeoutId = window.setTimeout(() => {
            applyServerFilter({
                ...canonicalFilter,
                range: pendingMonthRange,
            }, false);
        }, MONTH_FILTER_COMMIT_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [activeMonthRange, applyServerFilter, canonicalFilter, pendingMonthRange, pendingMonthRangeKey]);

    const changeMonth = useCallback((monthDelta: number) => {
        setPendingMonthRange((currentRange) => {
            if (monthDelta > 0 && isCurrentOrFutureTransactionMonth(currentRange)) {
                return currentRange;
            }

            return shiftTransactionMonthRange(currentRange.length === 2 ? currentRange : activeMonthRange, monthDelta);
        });
    }, [activeMonthRange]);

    const selectMonth = useCallback((month: Dayjs | null) => {
        if (!month) return;

        const selectedMonth = month.startOf("month");
        if (selectedMonth.isAfter(dayjs().startOf("month"))) return;

        setPendingMonthRange([
            selectedMonth.unix(),
            selectedMonth.endOf("month").unix(),
        ]);
    }, []);

    const isFutureMonth = useCallback((date: Dayjs) =>
        date.startOf("month").isAfter(dayjs().startOf("month")), []);

    const clearAllFilters = useCallback(() => {
        applyServerFilter({
            ...transactionsDefaultFilter,
            range: getCurrentTransactionMonthRange(),
        }, true);
    }, [applyServerFilter]);

    const clearServerFilter = useCallback((nextFilter: TransactionFilter) => {
        applyServerFilter(nextFilter, true);
    }, [applyServerFilter]);

    const monthControls = (
        <div className="transactions-month-controls" aria-label={t("transactions.month.chooser")}>
            <InExButton
                aria-label={t("transactions.month.previous")}
                icon={<ChevronLeft size={15} />}
                kind="ghost"
                onClick={() => changeMonth(-1)}
                size="sm"
            />
            <DatePicker
                allowClear={false}
                aria-label={t("transactions.month.chooser")}
                className="transactions-month-picker"
                disabledDate={isFutureMonth}
                format="MMMM YYYY"
                inputReadOnly
                onChange={selectMonth}
                picker="month"
                value={pendingMonthPickerValue}
            />
            <InExButton
                aria-label={t("transactions.month.next")}
                disabled={nextMonthDisabled}
                icon={<ChevronRight size={15} />}
                kind="ghost"
                onClick={() => changeMonth(1)}
                size="sm"
            />
        </div>
    );

    const chips = useMemo<FilterChip[]>(() => {
        const accountById = new Map(allAccounts.map(account => [account.id, account.name]));
        const categoryById = new Map(allCategories.map(category => [category.id, category.name]));
        const next: FilterChip[] = [];

        if (canonicalFilter.type !== "all") {
            next.push({
                key: "type",
                label: `${t("transactions.type")}: ${t(`transactions.${canonicalFilter.type}`)}`,
                onClear: () => applyServerFilter({ ...canonicalFilter, type: "all" }),
            });
        }

        if (canonicalFilter.search !== "") {
            next.push({
                key: "search",
                label: `${t("transactions.search")}: ${canonicalFilter.search}`,
                onClear: () => applyServerFilter({ ...canonicalFilter, search: "" }),
            });
        }

        if (canonicalFilter.accountIds.length > 0) {
            next.push({
                key: "accounts",
                label: `${t("transactions.account")}: ${canonicalFilter.accountIds.map(id => accountById.get(id) ?? id).join(", ")}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, accountIds: [] }),
            });
        }

        if (canonicalFilter.categoryIds.length > 0) {
            next.push({
                key: "categories",
                label: `${t("transactions.category")}: ${canonicalFilter.categoryIds.map(id => categoryById.get(id) ?? id).join(", ")}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, categoryIds: [] }),
            });
        }

        if (canonicalFilter.tags.length > 0) {
            next.push({
                key: "tags",
                label: `${t("transactions.tags")}: ${canonicalFilter.tags.map(tag => `#${tag}`).join(" ")}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, tags: [] }),
            });
        }

        if (canonicalFilter.refs.length > 0) {
            next.push({
                key: "refs",
                label: `${t("transactions.refs")}: ${canonicalFilter.refs.map(ref => `@${ref}`).join(" ")}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, refs: [] }),
            });
        }

        if (canonicalFilter.range.length === 2 && !isWholeTransactionMonthRange(canonicalFilter.range)) {
            next.push({
                key: "date",
                label: `${t("transactions.date")}: ${formatDateRange(canonicalFilter.range)}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, range: getCurrentTransactionMonthRange() }),
            });
        }

        return next;
    }, [allAccounts, allCategories, applyServerFilter, canonicalFilter, clearServerFilter, t]);

    const conversionLoading = cachedRateRange !== null
        && (cachedRatesLoading || cachedRatesCompletedKey !== cachedRateRange.key);
    const currentConversionUnavailable = !conversionLoading && summaryData !== undefined && currentConversion?.isComplete === false;
    const comparisonUnavailable = !conversionLoading && (currentConversionUnavailable || previousConversion?.isComplete === false);
    const previousPeriodLabel = summaryData?.previousScope?.period
        ? `${dayjs(summaryData.previousScope.period.startDate).format("D MMM YYYY")} – ${dayjs(summaryData.previousScope.period.endDate).format("D MMM YYYY")}`
        : "";
    const netChange = previousConversion ? scopedMetrics.net - previousConversion.net : 0;
    const formattedNetChange = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(Math.abs(netChange));
    const netComparison = comparisonUnavailable
        ? t("transactions.kpi.conversionUnavailable")
        : previousConversion && summaryData?.previousScope
            ? summaryData.previousScope.totalCount === 0
                ? t("transactions.kpi.noPreviousActivity", { change: formattedNetChange, period: previousPeriodLabel })
                : previousConversion.net === 0
                    ? t("transactions.kpi.absoluteChange", { change: formattedNetChange })
                    : t("transactions.kpi.percentChange", {
                        change: formattedNetChange,
                        percent: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format((netChange / Math.abs(previousConversion.net)) * 100),
                    })
            : t("transactions.kpi.baseCurrencyContext", { currency: baseCurrency });
    const rateWarnings = (conversionLoading ? [] : [
        ...(currentConversion?.warnings ?? []).map(warning => ({ ...warning, period: periodLabel })),
        ...(previousConversion?.warnings ?? []).map(warning => ({ ...warning, period: previousPeriodLabel })),
    ]).filter((warning, index, warnings) => warnings.findIndex(candidate =>
        candidate.currency === warning.currency && candidate.date === warning.date && candidate.period === warning.period,
    ) === index);

    const kpiItems = [
        {
            label: t("transactions.kpi.income"),
            value: currentConversionUnavailable ? null : Math.abs(scopedMetrics.income),
            kind: "income" as MoneyKind,
            signage: "color-only" as Signage,
            sub: t("transactions.kpi.incomeCount", { count: scopedMetrics.typeCounts.income, period: periodLabel }),
        },
        {
            label: t("transactions.kpi.expenses"),
            value: currentConversionUnavailable ? null : Math.abs(scopedMetrics.expense),
            kind: "expense" as MoneyKind,
            signage: "color-only" as Signage,
            sub: t("transactions.kpi.expenseCount", { count: scopedMetrics.typeCounts.expense, period: periodLabel }),
        },
        {
            label: t("transactions.kpi.netFlow"),
            value: currentConversionUnavailable ? null : scopedMetrics.net,
            kind: scopedMetrics.net > 0 ? "income" as MoneyKind : scopedMetrics.net < 0 ? "expense" as MoneyKind : "neutral" as MoneyKind,
            signage: "signed" as Signage,
            sub: netComparison,
            primary: true,
        },
    ];

    const openAddDrawer = () => {
        dispatch(transactionsActions.setError({ error: null }));
        setCreateMode(TransactionType.EXPENSE);
        setAddDrawerOpen(true);
    };

    const closeAddDrawer = () => {
        dispatch(transactionsActions.setError({ error: null }));
        setAddDrawerOpen(false);
    };

    const headerActions = (
        <div className="transactions-header-actions">
            <InExButton
                icon={<Plus size={16} />}
                kind="primary"
                onClick={openAddDrawer}
                size="md"
            >
                {t("transactions.addTransaction")}
            </InExButton>
        </div>
    );

    const addDrawerSubtitle = {
        [TransactionType.EXPENSE]: t("transactions.newExpenseSubtitle"),
        [TransactionType.INCOME]: t("transactions.newIncomeSubtitle"),
        [TransactionType.TRANSFER]: t("transactions.newTransferSubtitle"),
    }[createMode];

    return (
        <>
            <BasicPage frame="management" title={t("transactions.title")} subtitle={t("transactions.subtitle")} extra={headerActions}>
                <section className="transactions-ledger">
                    <div className="transactions-kpi-strip" aria-label={t("transactions.kpi.title")} data-qa="hero-card">
                        {kpiItems.map(item => (
                            <div className={`transactions-kpi${ledgerInitialLoading || summaryInitialLoading || conversionLoading ? " transactions-kpi--loading" : ""}`} key={item.label}>
                                <div className="transactions-kpi__label" data-qa={item.primary ? "hero-primary-label" : undefined}>{item.label}</div>
                                <div className="transactions-kpi__value" data-qa={item.primary ? "hero-primary-value" : undefined}>
                                    {ledgerInitialLoading || summaryInitialLoading || conversionLoading ? (
                                        <span className="transactions-kpi__skeleton" />
                                    ) : (
                                        item.value === null
                                            ? <span aria-label={t("transactions.kpi.conversionUnavailable")}>{t("transactions.kpi.notAvailable")}</span>
                                            : <Num
                                                currency={baseCurrency}
                                                currencyDataQa={item.primary ? "hero-primary-currency" : undefined}
                                                currencySize="sm"
                                                kind={item.kind}
                                                signage={item.signage}
                                                size={30}
                                                value={item.value}
                                            />
                                    )}
                                </div>
                                <div className="transactions-kpi__sub" data-qa={item.primary ? "hero-secondary-text" : undefined}>{item.sub}</div>
                            </div>
                        ))}
                    </div>
                    {rateWarnings.length > 0 && <Alert
                        className="transactions-rate-warning"
                        description={rateWarnings.map(warning => t("transactions.kpi.rateWarningDetail", warning)).join(" ")}
                        message={t("transactions.kpi.rateWarning")}
                        role="status"
                        showIcon
                        type="warning"
                    />}

                    <div className="transactions-workspace">
                    <section className="transactions-ledger-card" aria-label={t("transactions.ledger")}>
                        <div className="transactions-ledger-toolbar">
                            <div className="transactions-ledger-toolbar__title">
                                <h2 id="transactions-ledger-heading" tabIndex={-1}>{t("transactions.ledger")}</h2>
                                {monthControls}
                                <span className="transactions-toolbar-count">
                                    {t("transactions.toolbarCount", {
                                        visible: ledgerVisibleCount,
                                        total: scopedTotalCount,
                                        period: periodLabel,
                                    })}
                                </span>
                                {filterActive && !noMatchActive && (
                                    <span className="transactions-filter-indicator" title={filterIndicatorTitle}>
                                        <Filter size={13} />
                                        {t("transactions.filtersActive")}
                                    </span>
                                )}
                            </div>
                            <div className="transactions-ledger-toolbar__actions">
                                <InExButton
                                    aria-expanded={accountBalancesOpen}
                                    id="transactions-account-balances-trigger"
                                    kind="ghost"
                                    onClick={() => setAccountBalancesOpen(open => !open)}
                                    size="sm"
                                >
                                    {t("transactions.accountBalances")}
                                </InExButton>
                                <InExButton
                                    aria-expanded={filterDrawerOpen}
                                    aria-haspopup="dialog"
                                    icon={<SlidersHorizontal size={15} />}
                                    kind="ghost"
                                    onClick={() => setFilterDrawerOpen(true)}
                                    size="sm"
                                >
                                    {t("transactions.filters")}
                                </InExButton>
                            </div>
                        </div>

                        <div className="transactions-ledger-controls">
                            <SegmentedControl
                                label={t("transactions.view")}
                                onChange={(value) => applyServerFilter({ ...canonicalFilter, type: value as TransactionFilter["type"] })}
                                options={[
                                    { key: "all", label: `${t("transactions.all")} ${scopedMetrics.typeCounts.all}` },
                                    { key: "income", label: `${t("transactions.income")} ${scopedMetrics.typeCounts.income}` },
                                    { key: "expense", label: `${t("transactions.expense")} ${scopedMetrics.typeCounts.expense}` },
                                    { key: "transfer", label: `${t("transactions.transfer")} ${scopedMetrics.typeCounts.transfer}` },
                                ]}
                                size="compact"
                                value={canonicalFilter.type}
                            />
                            <Input
                                aria-label={t("transactions.search")}
                                className="transactions-search"
                                onChange={(event) => applyServerFilter({ ...canonicalFilter, search: event.target.value })}
                                placeholder={t("transactions.searchPlaceholder")}
                                value={canonicalFilter.search}
                                variant="search"
                            />
                        </div>

                        {chips.length > 0 && (
                            <div className="transactions-filter-chips" aria-label={t("transactions.activeFilters")}>
                                {chips.map(chip => (
                                    <button className="transactions-filter-chip" key={chip.key} onClick={chip.onClear} type="button">
                                        {chip.label}
                                        <X aria-hidden="true" size={12} />
                                    </button>
                                ))}
                                <button className="transactions-clear-filters" onClick={clearAllFilters} type="button">
                                    {t("transactions.clearAll")}
                                </button>
                            </div>
                        )}

                        <TransactionList
                            accounts={allAccounts}
                            accountSummaries={accountBalances}
                            baseCurrency={baseCurrency}
                            categories={allCategories}
                            cachedExchangeRates={cachedExchangeRates}
                            filter={canonicalFilter}
                            onAddTransaction={openAddDrawer}
                            onClearFilters={clearAllFilters}
                            onInitialLoadingChange={setLedgerInitialLoading}
                            onEditDrawerOpenChange={setEditDrawerOpen}
                            onVisibleCountChange={setLedgerVisibleCount}
                            periodLabel={periodLabel}
                            refreshToken={ledgerRefreshToken}
                        />
                    </section>
                    {accountBalancesOpen && (
                        <AccountBalancesCompanion
                            accounts={accountBalances}
                            isError={accountBalancesError}
                            isLoading={accountBalancesLoading}
                            onRetry={retryAccountBalances}
                        />
                    )}
                    </div>
                </section>
            </BasicPage>

            <InExDrawer
                onClose={closeAddDrawer}
                open={addDrawerOpen}
                subtitle={addDrawerSubtitle}
                title={t("transactions.addDrawerTitle")}
                width={460}
            >
                {addDrawerOpen && (
                    <TransactionCreate
                        accounts={activeAccounts}
                        accountSummaries={accountBalances}
                        categories={activeCategories}
                        onCancel={closeAddDrawer}
                        onModeChange={setCreateMode}
                        onSubmit={() => {
                            closeAddDrawer();
                            setLedgerRefreshToken((token) => token + 1);
                        }}
                    />
                )}
                {formError && (
                    <Alert
                        className="transactions-form-error"
                        message={formError}
                        showIcon
                        type="error"
                    />
                )}
            </InExDrawer>

            {isMobileViewport && (
                <InExDrawer
                    bodyPadding={0}
                    onClose={() => setAccountBalancesOpen(false)}
                    open={accountBalancesOpen}
                    subtitle={t("transactions.accountBalancesSubtitle")}
                    title={t("transactions.accountBalances")}
                    width={440}
                >
                    <AccountBalancesCompanion
                        accounts={accountBalances}
                        isError={accountBalancesError}
                        isLoading={accountBalancesLoading}
                        onRetry={retryAccountBalances}
                        showHeading={false}
                    />
                </InExDrawer>
            )}

            <InExDrawer
                onClose={() => setFilterDrawerOpen(false)}
                open={filterDrawerOpen}
                subtitle={t("transactions.filterDrawerSubtitle")}
                title={t("transactions.advancedFilters")}
                width={480}
            >
                <TransactionFilterForm
                    accounts={activeAccounts}
                    categories={activeCategories}
                    filter={canonicalFilter}
                    onApply={(nextFilter) => {
                        applyServerFilter(nextFilter);
                        setFilterDrawerOpen(false);
                    }}
                />
                {formError && (
                    <Alert
                        className="transactions-form-error"
                        message={formError}
                        showIcon
                        type="error"
                    />
                )}
            </InExDrawer>
        </>
    );
};

export default Transactions;
