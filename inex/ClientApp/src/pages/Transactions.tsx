import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, DatePicker, Dropdown } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Plus, SlidersHorizontal, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import BasicPage from "../layouts/BasicPage";
import { TransactionType } from "../model/Transaction/TransactionType";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccountResponse, useGetAccountsQuery, useGetAccountsSummaryQuery } from "../store/accounts/accounts-api";
import { CategoryResponse, useGetCategoriesQuery } from "../store/categories/categories-api";
import { useGetTransactionsSummaryQuery } from "../store/transactions/transactions-api";
import { fetchRatesForRange } from "../store/rates/rates-action";
import { normalizeTransactionFilter, transactionsActions, transactionsDefaultFilter, type TransactionFilter } from "../store/transactions/transactions-slice";
import {
    InExButton,
    InExDrawer,
    RECORD_EDITOR_DRAWER_WIDTH,
    Input,
    Num,
    SegmentedControl,
    type MoneyKind,
} from "../components/primitives";
import type { Signage } from "../components/primitives";
import InternalTransferRequests from "./Transactions/InternalTransferRequests";
import TransactionCreate from "./Transactions/TransactionCreate";
import AccountBalancesCompanion from "./Transactions/AccountBalancesCompanion";
import { useCurrentBalanceRates } from "./Dashboard/useCurrentBalanceRates";
import TransactionFilterForm from "./Transactions/TransactionFilterForm";
import TransactionList, { type TransactionListCount } from "./Transactions/TransactionList";
import { createFixedAmountFormatter, getCurrencyFractionDigits } from "../utils/formatAmount";
import { buildTransactionFilterSearch, parseTransactionFilterParam } from "./Transactions/transaction-filter-url";
import {
    emptyLedgerMetrics,
    formatTransactionMonthLabel,
    formatTransactionPeriodLabel,
    getAccountBalanceConversionResult,
    getCashFlowConversionResult,
    getCurrentTransactionMonthRange,
    isCurrentOrFutureTransactionMonth,
    isWholeTransactionMonthRange,
    shiftTransactionMonthRange,
} from "./Transactions/transaction-ledger-utils";
import "./Transactions/transactions-ledger.css";

const MONTH_FILTER_COMMIT_DELAY_MS = 250;
const additionalFilterTypes = ["internalTransfer", "correction"] as const;

interface FilterChip {
    key: string;
    label: string;
    onClear: () => void;
}

const areRangesEqual = (left: number[], right: number[]): boolean =>
    left.length === right.length && left.every((value, index) => value === right[index]);

const ACCOUNT_BALANCES_PINNED_STORAGE_KEY = "inex.transactions.account-balances-pinned";
const ACCOUNT_BALANCES_RAIL_BREAKPOINT = "(min-width: 1180px)";

const readAccountBalancesPinnedPreference = (): boolean => {
    try {
        return typeof window !== "undefined" && window.localStorage.getItem(ACCOUNT_BALANCES_PINNED_STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

const useAccountBalancesRailViewport = (): boolean => {
    const getMatches = () => typeof window !== "undefined" && window.matchMedia(ACCOUNT_BALANCES_RAIL_BREAKPOINT).matches;
    const [matches, setMatches] = useState(getMatches);

    useEffect(() => {
        const mediaQuery = window.matchMedia(ACCOUNT_BALANCES_RAIL_BREAKPOINT);
        const updateMatches = () => setMatches(mediaQuery.matches);
        updateMatches();
        mediaQuery.addEventListener("change", updateMatches);
        return () => mediaQuery.removeEventListener("change", updateMatches);
    }, []);

    return matches;
};

const Transactions = () => {
    const { t, i18n } = useTranslation();
    const locale = i18n.resolvedLanguage ?? i18n.language;
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get("filter");

    const userId = useAppSelector(state => state.auth.user?.id);
    const userCurrencyId = useAppSelector(state => state.auth.user?.currencyId);
    const selectedLinkedUserId = useAppSelector(state => state.linkedAccount.selectedLinkedUserId);
    const selectedLinkedAccount = useAppSelector(state => state.linkedAccount.linkState?.linkedAccounts.find(
        account => account.id === state.linkedAccount.selectedLinkedUserId,
    ));
    const isLinkedMode = selectedLinkedUserId !== null;
    const dataOwnerId = selectedLinkedUserId ?? userId;

    const {
        currentData: allAccounts = [],
        isError: accountsError,
        isLoading: accountsLoading,
        refetch: refetchAccounts,
    } = useGetAccountsQuery(
        selectedLinkedUserId === null
            ? "ALL"
            : { mode: "ALL", linkedUserId: selectedLinkedUserId },
    );
    const { currentData: allCategories = [] } = useGetCategoriesQuery(
        selectedLinkedUserId === null
            ? "ALL"
            : { mode: "ALL", linkedUserId: selectedLinkedUserId },
    );
    const formError = useAppSelector(state => state.transactions.error);
    const cachedExchangeRateItems = useAppSelector(state => state.rates.range?.items ?? []);
    const cachedRatesLoading = useAppSelector(state => state.rates.range?.loading ?? false);
    const cachedRatesCompletedKey = useAppSelector(state => state.rates.range?.completedKey ?? null);

    const [addDrawerOpen, setAddDrawerOpen] = useState(false);
    const [accountBalancesPinned, setAccountBalancesPinned] = useState(readAccountBalancesPinnedPreference);
    const [accountBalancesOpen, setAccountBalancesOpen] = useState(readAccountBalancesPinnedPreference);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [moreTypesOpen, setMoreTypesOpen] = useState(false);
    const moreTypesButton = useRef<HTMLButtonElement>(null);
    const [createMode, setCreateMode] = useState<TransactionType>(TransactionType.EXPENSE);
    const [ledgerCount, setLedgerCount] = useState<TransactionListCount | null>(null);
    const [ledgerInitialLoading, setLedgerInitialLoading] = useState(false);
    const [ledgerRefreshToken, setLedgerRefreshToken] = useState(0);
    const accountBalancesRailViewport = useAccountBalancesRailViewport();
    const accountBalancesRailVisible = accountBalancesPinned && accountBalancesRailViewport;
    const accountBalancesHadFocus = useRef(false);
    const previousAccountBalancesPinned = useRef(accountBalancesPinned);
    const previousAccountBalancesRailVisible = useRef(accountBalancesRailVisible);

    const activeAccounts = useMemo(
        () => allAccounts.filter((account: AccountResponse) => account.isEnabled),
        [allAccounts],
    );
    const visibleOverviewAccounts = useMemo(
        () => activeAccounts.filter(account => account.isFavourite === true),
        [activeAccounts],
    );
    const activeCategories = useMemo(
        () => allCategories.filter((category: CategoryResponse) => category.isEnabled),
        [allCategories],
    );
    const visibleOverviewAccountIds = useMemo(() => visibleOverviewAccounts.map(account => account.id), [visibleOverviewAccounts]);
    const accountBalancesQuery = useGetAccountsSummaryQuery({
        ids: visibleOverviewAccountIds,
        linkedUserId: selectedLinkedUserId,
    }, {
        skip: !(accountBalancesOpen || accountBalancesRailVisible) || visibleOverviewAccountIds.length === 0,
    });
    const accountBalances = useMemo(() => {
        const balancesById = new Map((accountBalancesQuery.currentData ?? []).map(account => [account.id, account]));
        return visibleOverviewAccountIds.flatMap(id => {
            const balance = balancesById.get(id);
            return balance ? [balance] : [];
        });
    }, [accountBalancesQuery.currentData, visibleOverviewAccountIds]);
    const accountBalancesLoading = (accountBalancesOpen || accountBalancesRailVisible) && (
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
        try {
            window.localStorage.setItem(ACCOUNT_BALANCES_PINNED_STORAGE_KEY, String(accountBalancesPinned));
        } catch {
            // Keep the presentation setting in memory when browser storage is unavailable.
        }
    }, [accountBalancesPinned]);

    useEffect(() => {
        const presentationChanged = previousAccountBalancesRailVisible.current !== accountBalancesRailVisible;
        const pinnedChanged = previousAccountBalancesPinned.current !== accountBalancesPinned;
        previousAccountBalancesRailVisible.current = accountBalancesRailVisible;
        previousAccountBalancesPinned.current = accountBalancesPinned;

        if ((presentationChanged || pinnedChanged) && accountBalancesHadFocus.current) {
            requestAnimationFrame(() => document.getElementById("transactions-account-balances-pin-control")?.focus());
        }
    }, [accountBalancesPinned, accountBalancesRailVisible]);

    const canonicalFilter = useMemo(() => normalizeTransactionFilter(
        parseTransactionFilterParam(filterParam) ?? {
            ...transactionsDefaultFilter,
            range: getCurrentTransactionMonthRange(),
        },
    ), [filterParam]);
    const activeMonthRange = canonicalFilter.range;
    const isWholeMonth = isWholeTransactionMonthRange(activeMonthRange);
    const activeMonthRangeKey = activeMonthRange.join(":");
    const [pendingMonthRange, setPendingMonthRange] = useState<number[]>(activeMonthRange);
    const pendingMonthRangeKey = pendingMonthRange.join(":");
    const summaryQuery = useGetTransactionsSummaryQuery({
        filter: canonicalFilter,
        linkedUserId: selectedLinkedUserId,
    });
    const summaryData = summaryQuery.currentData;
    const summaryInitialLoading = summaryQuery.isLoading || (summaryQuery.isFetching && summaryData === undefined);
    const baseCurrency = summaryData?.baseCurrency ?? selectedLinkedAccount?.baseCurrency ?? "USD";
    // Keep the known reporting currency while a different ledger filter loads,
    // but never carry that context across owners or profile currency changes.
    const balanceCurrencyKey = `${userId}:${selectedLinkedUserId ?? "self"}:${userCurrencyId}`;
    const [balanceCurrencyContext, setBalanceCurrencyContext] = useState<{ key: string; currency: string }>();
    useEffect(() => {
        if (summaryData?.baseCurrency) {
            setBalanceCurrencyContext({ key: balanceCurrencyKey, currency: summaryData.baseCurrency });
        }
    }, [balanceCurrencyKey, summaryData?.baseCurrency]);
    const balanceBaseCurrency = summaryData?.baseCurrency
        ?? (balanceCurrencyContext?.key === balanceCurrencyKey ? balanceCurrencyContext.currency : undefined)
        ?? selectedLinkedAccount?.baseCurrency
        ?? "";
    const balanceNeedsRates = (accountBalancesOpen || accountBalancesRailVisible)
        && Boolean(balanceBaseCurrency)
        && accountBalances.some(account => account.value !== 0 && account.currency !== balanceBaseCurrency);
    const currentBalanceRates = useCurrentBalanceRates(
        balanceNeedsRates, dayjs().format("YYYY-MM"), userId, selectedLinkedUserId, balanceBaseCurrency,
    );
    const cachedRateRange = useMemo(() => {
        const currentPeriod = summaryData?.currentScope.period;
        if (!currentPeriod) return null;

        const needsCachedRateForCashFlow = [summaryData.currentScope, summaryData.previousScope]
            .flatMap(scope => scope?.cashFlowBuckets ?? [])
            .some(bucket => (bucket.income !== 0 || bucket.expense !== 0) && bucket.currency !== baseCurrency);
        if (!needsCachedRateForCashFlow) return null;

        const startDate = summaryData.previousScope?.period?.startDate.slice(0, 10) ?? currentPeriod.startDate.slice(0, 10);
        const endDate = currentPeriod.endDate.slice(0, 10);
        return { startDate, endDate, key: `${selectedLinkedUserId ?? "self"}:${startDate}:${endDate}` };
    }, [baseCurrency, selectedLinkedUserId, summaryData]);
    const cachedRateRangeKey = cachedRateRange?.key;
    const cachedRateStartDate = cachedRateRange?.startDate;
    const cachedRateEndDate = cachedRateRange?.endDate;
    const cachedExchangeRates = cachedRatesCompletedKey === cachedRateRangeKey
        ? cachedExchangeRateItems
        : [];
    const accountBalanceConversion = useMemo(
        () => balanceBaseCurrency
            ? getAccountBalanceConversionResult(accountBalances, balanceBaseCurrency, currentBalanceRates.items)
            : { value: 0, isComplete: false, unavailableCurrencies: [] },
        [accountBalances, balanceBaseCurrency, currentBalanceRates.items],
    );
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
    const viewTypeCounts = summaryData?.viewTypeCounts ?? emptyLedgerMetrics.typeCounts;
    const activeAdditionalType = additionalFilterTypes.find(type => type === canonicalFilter.type);
    const periodLabel = useMemo(
        () => isWholeMonth
            ? formatTransactionMonthLabel(activeMonthRange, t("transactions.period.allActiveDates"))
            : formatTransactionPeriodLabel(activeMonthRange, t("transactions.period.allActiveDates")),
        [activeMonthRange, isWholeMonth, t],
    );
    const nextMonthDisabled = useMemo(
        () => isCurrentOrFutureTransactionMonth(pendingMonthRange),
        [pendingMonthRange],
    );
    const pendingMonthPickerValue = useMemo(
        () => pendingMonthRange.length === 2 && pendingMonthRange[0] > 0
            ? dayjs.unix(pendingMonthRange[0])
            : null,
        [pendingMonthRangeKey],
    );

    useEffect(() => {
        if (!cachedRateRangeKey || !cachedRateStartDate || !cachedRateEndDate) return;
        dispatch(fetchRatesForRange(cachedRateStartDate, cachedRateEndDate, selectedLinkedUserId));
    }, [cachedRateEndDate, cachedRateRangeKey, cachedRateStartDate, dispatch, selectedLinkedUserId]);

    const applyServerFilter = useCallback((nextFilter: TransactionFilter, replace = true) => {
        const normalizedFilter = normalizeTransactionFilter(nextFilter);
        dispatch(transactionsActions.setFilter({ filter: normalizedFilter }));
        navigate(`${location.pathname}${buildTransactionFilterSearch(normalizedFilter)}`, { replace });
    }, [dispatch, location.pathname, navigate]);

    const toggleFavoriteAccountFilter = (accountId: number) => {
        applyServerFilter({
            ...canonicalFilter,
            accountIds: canonicalFilter.accountIds.includes(accountId)
                ? canonicalFilter.accountIds.filter(id => id !== accountId)
                : [...canonicalFilter.accountIds, accountId],
        });
    };

    const previousDataOwnerId = useRef(dataOwnerId);
    useEffect(() => {
        if (previousDataOwnerId.current === dataOwnerId) return;

        previousDataOwnerId.current = dataOwnerId;
        setAddDrawerOpen(false);
        setFilterDrawerOpen(false);
        applyServerFilter({
            ...canonicalFilter,
            accountIds: [],
            categoryIds: [],
        });
    }, [applyServerFilter, canonicalFilter, dataOwnerId]);

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
                placeholder={t("transactions.period.allActiveDates")}
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

        for (const id of canonicalFilter.accountIds) {
            next.push({
                key: `account-${id}`,
                label: `${t("transactions.account")}: ${accountById.get(id) ?? id}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, accountIds: canonicalFilter.accountIds.filter(value => value !== id) }),
            });
        }

        for (const id of canonicalFilter.categoryIds) {
            next.push({
                key: `category-${id}`,
                label: `${t("transactions.category")}: ${categoryById.get(id) ?? id}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, categoryIds: canonicalFilter.categoryIds.filter(value => value !== id) }),
            });
        }

        for (const tag of canonicalFilter.tags) {
            next.push({
                key: `tag-${tag}`,
                label: `${t("transactions.tags")}: #${tag}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, tags: canonicalFilter.tags.filter(value => value !== tag) }),
            });
        }

        for (const ref of canonicalFilter.refs) {
            next.push({
                key: `ref-${ref}`,
                label: `${t("transactions.refs")}: @${ref}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, refs: canonicalFilter.refs.filter(value => value !== ref) }),
            });
        }

        if (canonicalFilter.range.length === 2 && !isWholeMonth) {
            next.push({
                key: "date",
                label: `${t("transactions.date")}: ${periodLabel}`,
                onClear: () => clearServerFilter({ ...canonicalFilter, range: getCurrentTransactionMonthRange() }),
            });
        }

        return next;
    }, [allAccounts, allCategories, applyServerFilter, canonicalFilter, clearServerFilter, isWholeMonth, periodLabel, t]);

    const conversionLoading = cachedRateRangeKey !== undefined
        && (cachedRatesLoading || cachedRatesCompletedKey !== cachedRateRangeKey);
    const currentConversionUnavailable = !conversionLoading && summaryData !== undefined && currentConversion?.isComplete === false;
    const previousPeriod = summaryData?.previousScope?.period;
    const previousPeriodLabel = previousPeriod
        ? isWholeMonth
            ? dayjs(previousPeriod.startDate).locale(locale).format("MMMM YYYY")
            : `${dayjs(previousPeriod.startDate).locale(locale).format("D MMM YYYY")} – ${dayjs(previousPeriod.endDate).locale(locale).format("D MMM YYYY")}`
        : "";
    let netComparison: string;
    let netComparisonDirection: "up" | "down" | undefined;
    if (summaryInitialLoading || conversionLoading) {
        netComparison = t("transactions.kpi.comparisonLoading");
    } else if (currentConversionUnavailable || previousConversion?.isComplete === false) {
        netComparison = t("transactions.kpi.conversionUnavailable");
    } else if (previousPeriod && previousConversion && summaryData?.previousScope) {
        let period = previousPeriodLabel;
        if (isWholeMonth) {
            const previousMonth = dayjs(previousPeriod.startDate).locale(locale);
            // Including a day in the formatter gives Russian month names in the genitive.
            const month = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" })
                .formatToParts(previousMonth.toDate()).find(part => part.type === "month")?.value ?? previousMonth.format("MMMM");
            period = previousMonth.year() === dayjs.unix(activeMonthRange[0]).year()
                ? month
                : t("transactions.kpi.comparisonMonthWithYear", { month, year: previousMonth.format("YYYY") });
        }

        const netChange = scopedMetrics.net - previousConversion.net;
        const fractionDigits = getCurrencyFractionDigits(baseCurrency);
        const formatter = createFixedAmountFormatter(locale, fractionDigits);
        const amount = formatter.format(Math.abs(netChange));
        const roundsToZero = amount === formatter.format(0);
        if (roundsToZero && formatter.format(scopedMetrics.net) === formatter.format(previousConversion.net)) {
            netComparison = t("transactions.kpi.noChange", { period });
        } else {
            netComparisonDirection = netChange > 0 ? "up" : "down";
            const displayAmount = roundsToZero ? `< ${formatter.format(10 ** -fractionDigits)}` : amount;
            netComparison = t("transactions.kpi.absoluteChange", {
                arrow: netComparisonDirection === "up" ? "↑" : "↓",
                change: `${displayAmount} ${baseCurrency}`,
                period,
            });
        }
        if (summaryData.previousScope.totalCount === 0) {
            netComparison = t("transactions.kpi.noPreviousActivity", { comparison: netComparison });
        }
    } else {
        netComparison = t("transactions.kpi.comparisonUnavailable");
    }
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
            signage: "negative-only" as Signage,
            sub: t("transactions.kpi.transactionCount", { count: scopedMetrics.typeCounts.income }),
        },
        {
            label: t("transactions.kpi.expenses"),
            value: currentConversionUnavailable ? null : Math.abs(scopedMetrics.expense),
            kind: "expense" as MoneyKind,
            signage: "negative-only" as Signage,
            sub: t("transactions.kpi.transactionCount", { count: scopedMetrics.typeCounts.expense }),
        },
        {
            label: t(isWholeMonth ? "transactions.kpi.monthResult" : "transactions.kpi.netFlow"),
            value: currentConversionUnavailable ? null : scopedMetrics.net,
            kind: scopedMetrics.net > 0 ? "income" as MoneyKind : scopedMetrics.net < 0 ? "expense" as MoneyKind : "neutral" as MoneyKind,
            signage: "signed" as Signage,
            sub: netComparison,
            comparisonDirection: netComparisonDirection,
            primary: true,
        },
    ];

    const openAddDrawer = () => {
        if (isLinkedMode) return;
        dispatch(transactionsActions.setError({ error: null }));
        setCreateMode(TransactionType.EXPENSE);
        setAddDrawerOpen(true);
    };

    const closeAddDrawer = () => {
        dispatch(transactionsActions.setError({ error: null }));
        setAddDrawerOpen(false);
    };

    const toggleAccountBalancesPinned = useCallback(() => {
        setAccountBalancesPinned(pinned => !pinned);
        setAccountBalancesOpen(true);
    }, []);

    const headerActions = (
        <div className="transactions-header-actions">
            {!isLinkedMode && <InExButton
                icon={<Plus size={16} />}
                kind="primary"
                onClick={openAddDrawer}
                size="md"
            >
                {t("transactions.addTransaction")}
            </InExButton>}
            {!accountBalancesPinned && (
                <InExButton
                    aria-expanded={accountBalancesOpen}
                    aria-haspopup="dialog"
                    id="transactions-account-balances-trigger"
                    kind="ghost"
                    onClick={() => setAccountBalancesOpen(true)}
                    size="md"
                >
                    {t("transactions.accountBalances")}
                </InExButton>
            )}
        </div>
    );

    const addDrawerTitle = {
        [TransactionType.EXPENSE]: t("transactions.newExpenseTitle"),
        [TransactionType.INCOME]: t("transactions.newIncomeTitle"),
        [TransactionType.TRANSFER]: t("transactions.newTransferTitle"),
        [TransactionType.INTERNAL_TRANSFER]: t("transactions.newInternalTransferTitle"),
        [TransactionType.CORRECTION]: t("transactions.newCorrectionTitle"),
    }[createMode];

    const accountBalancesOverview = (
        <AccountBalancesCompanion
            accounts={accountBalances}
            baseCurrency={balanceBaseCurrency}
            conversion={accountBalanceConversion}
            isConversionLoading={currentBalanceRates.loading || (!balanceBaseCurrency && summaryInitialLoading)}
            onConversionRetry={currentBalanceRates.retry}
            selectedAccountIds={canonicalFilter.accountIds}
            onAccountToggle={toggleFavoriteAccountFilter}
            isError={accountBalancesError}
            isExpanded={accountBalancesRailVisible || accountBalancesOpen}
            isLoading={accountBalancesLoading}
            isPinned={accountBalancesPinned}
            onExpandedChange={() => setAccountBalancesOpen(open => !open)}
            onPinChange={toggleAccountBalancesPinned}
            onFocusChange={(hasFocus) => { accountBalancesHadFocus.current = hasFocus; }}
            onRetry={retryAccountBalances}
            variant={accountBalancesRailVisible ? "rail" : "inline"}
            visibleAccountCount={visibleOverviewAccounts.length}
        />
    );

    const accountBalancesDrawerOverview = (
        <AccountBalancesCompanion
            accounts={accountBalances}
            baseCurrency={balanceBaseCurrency}
            conversion={accountBalanceConversion}
            isConversionLoading={currentBalanceRates.loading || (!balanceBaseCurrency && summaryInitialLoading)}
            onConversionRetry={currentBalanceRates.retry}
            selectedAccountIds={canonicalFilter.accountIds}
            onAccountToggle={toggleFavoriteAccountFilter}
            isError={accountBalancesError}
            isExpanded
            isLoading={accountBalancesLoading}
            isPinned={accountBalancesPinned}
            onExpandedChange={() => setAccountBalancesOpen(open => !open)}
            onPinChange={toggleAccountBalancesPinned}
            onFocusChange={(hasFocus) => { accountBalancesHadFocus.current = hasFocus; }}
            onRetry={retryAccountBalances}
            variant="drawer"
            visibleAccountCount={visibleOverviewAccounts.length}
        />
    );

    return (
        <>
            <BasicPage frame="management" title={t("transactions.title")} subtitle={t("transactions.subtitle")} extra={headerActions}>
                <section className="transactions-ledger">
                    {!isLinkedMode && <InternalTransferRequests accounts={activeAccounts} />}
                    {isLinkedMode ? (
                        <Alert
                            className="transactions-rate-warning"
                            message={t("linkedAccount.readOnly", {
                                username: selectedLinkedAccount?.username ?? "",
                            })}
                            showIcon
                            type="info"
                        />
                    ) : null}
                    <div className="transactions-kpi-strip" aria-label={t("transactions.kpi.title")} data-qa="hero-card" role="group">
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
                                                fractionDigits="currency"
                                                kind={item.kind}
                                                locale={locale}
                                                signage={item.signage}
                                                value={item.value}
                                            />
                                    )}
                                </div>
                                <div className="transactions-kpi__sub" data-change={item.comparisonDirection} data-qa={item.primary ? "hero-secondary-text" : undefined}>{item.sub}</div>
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

                    {accountBalancesPinned && !accountBalancesRailVisible && accountBalancesOverview}
                    <div className={accountBalancesRailVisible ? "transactions-workspace transactions-workspace--pinned" : undefined}>
                    <section className="transactions-ledger-card" aria-label={t("transactions.ledger")}>
                        <div className="transactions-ledger-toolbar">
                            <div className="transactions-ledger-toolbar__title">
                                <h2 id="transactions-ledger-heading" tabIndex={-1}>{t("transactions.ledger")}</h2>
                                {monthControls}
                                <span aria-hidden="true" className="transactions-toolbar-count">
                                    {ledgerCount && t("transactions.toolbarCount", { ...ledgerCount })}
                                </span>
                                <span className="sr-only" role="status">
                                    {ledgerCount && t("transactions.toolbarCountAnnouncement", { ...ledgerCount })}
                                </span>
                            </div>
                            <div className="transactions-ledger-toolbar__actions">
                                <Input
                                    aria-label={t("transactions.search")}
                                    className="transactions-search"
                                    onChange={(event) => applyServerFilter({ ...canonicalFilter, search: event.target.value })}
                                    placeholder={t("transactions.searchPlaceholder")}
                                    value={canonicalFilter.search}
                                    variant="search"
                                    width="100%"
                                />
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

                        <div aria-label={t("transactions.type")} className="transactions-ledger-controls" role="group">
                            <SegmentedControl
                                onChange={(value) => applyServerFilter({ ...canonicalFilter, type: value as TransactionFilter["type"] })}
                                options={[
                                    { key: "all", label: `${t("transactions.all")} ${viewTypeCounts.all}` },
                                    { key: "income", label: `${t("transactions.income")} ${viewTypeCounts.income}` },
                                    { key: "expense", label: `${t("transactions.expense")} ${viewTypeCounts.expense}` },
                                    { key: "transfer", label: `${t("transactions.transfer")} ${viewTypeCounts.transfer}` },
                                ]}
                                size="compact"
                                value={canonicalFilter.type}
                            />
                            <Dropdown
                                autoFocus
                                menu={{
                                    "aria-label": t("transactions.moreTypes"),
                                    selectable: true,
                                    selectedKeys: activeAdditionalType ? [activeAdditionalType] : [],
                                    items: additionalFilterTypes.map(type => ({
                                        key: type,
                                        label: `${t(`transactions.${type}`)} ${viewTypeCounts[type]}`,
                                        role: "menuitemradio",
                                        "aria-checked": type === activeAdditionalType,
                                        onClick: ({ domEvent }) => {
                                            // Cancel Enter's default action before returning focus to the trigger.
                                            domEvent.preventDefault();
                                            applyServerFilter({ ...canonicalFilter, type });
                                            setMoreTypesOpen(false);
                                            moreTypesButton.current?.focus();
                                        },
                                    })),
                                }}
                                onOpenChange={setMoreTypesOpen}
                                open={moreTypesOpen}
                                placement="bottomRight"
                                trigger={["click"]}
                            >
                                <button
                                    aria-expanded={moreTypesOpen}
                                    aria-haspopup="menu"
                                    aria-label={activeAdditionalType ? t("transactions.moreTypesActive", { type: t(`transactions.${activeAdditionalType}`) }) : undefined}
                                    className="transactions-more-types"
                                    data-active={Boolean(activeAdditionalType)}
                                    onKeyDown={event => {
                                        if (event.key === "ArrowDown") {
                                            event.preventDefault();
                                            setMoreTypesOpen(true);
                                        }
                                    }}
                                    ref={moreTypesButton}
                                    type="button"
                                >
                                    {activeAdditionalType && <Check aria-hidden="true" size={12} />}
                                    {t("transactions.moreTypes")}
                                    <ChevronDown aria-hidden="true" size={12} />
                                </button>
                            </Dropdown>
                        </div>

                        {chips.length > 0 && (
                            <div className="transactions-filter-chips" aria-label={t("transactions.activeFilters")} role="group">
                                {chips.map(chip => (
                                    <button aria-label={t("transactions.removeFilter", { filter: chip.label })} className="transactions-filter-chip" key={chip.key} onClick={chip.onClear} type="button">
                                        <span>{chip.label}</span>
                                        <X aria-hidden="true" size={12} />
                                    </button>
                                ))}
                                <button className="transactions-clear-filters" onClick={clearAllFilters} type="button">
                                    {t("transactions.clearAll")}
                                </button>
                            </div>
                        )}

                        <TransactionList
                            accounts={activeAccounts}
                            baseCurrency={baseCurrency}
                            categories={allCategories}
                            cachedExchangeRates={cachedExchangeRates}
                            dataOwnerId={dataOwnerId}
                            filter={canonicalFilter}
                            linkedUserId={selectedLinkedUserId}
                            onAddTransaction={openAddDrawer}
                            onClearFilters={clearAllFilters}
                            onCountChange={setLedgerCount}
                            onInitialLoadingChange={setLedgerInitialLoading}
                            periodLabel={periodLabel}
                            readOnly={isLinkedMode}
                            refreshToken={ledgerRefreshToken}
                        />
                    </section>
                    {accountBalancesRailVisible && <aside className="transactions-account-balances-rail">{accountBalancesOverview}</aside>}
                    </div>
                </section>
            </BasicPage>

            {!isLinkedMode && <InExDrawer
                onClose={closeAddDrawer}
                open={addDrawerOpen}
                title={addDrawerTitle}
                width={RECORD_EDITOR_DRAWER_WIDTH}
            >
                {addDrawerOpen && (
                    <TransactionCreate
                        accounts={activeAccounts}
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
            </InExDrawer>}

            <InExDrawer
                bodyPadding={0}
                onClose={() => setAccountBalancesOpen(false)}
                open={!accountBalancesPinned && accountBalancesOpen}
                subtitle={t("transactions.accountBalancesSubtitle")}
                title={t("transactions.accountBalances")}
                width={440}
            >
                {accountBalancesOpen && !accountBalancesPinned && accountBalancesDrawerOverview}
            </InExDrawer>

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
