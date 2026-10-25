import { useEffect, useMemo, useRef, useState, useId } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { fetchRatesForRange } from "../../store/rates/rates-action";
import { useGetAccountsQuery, useGetAccountsSummaryQuery } from "../../store/accounts/accounts-api";
import { useGetCategoriesQuery } from "../../store/categories/categories-api";
import { useGetTransactionsQuery, useGetTransactionsSummaryQuery } from "../../store/transactions/transactions-api";
import { transactionsDefaultFilter } from "../../store/transactions/transactions-slice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getAccountBalanceConversionResult, getBaseCurrencyEquivalent, getCashFlowConversionResult, getCurrentTransactionMonthRange } from "../Transactions/transaction-ledger-utils";
import { buildDashboardCategorySlices, buildDashboardTransactionFilter, type DashboardCategoryMode, type DashboardFlow, type DashboardCategorySlice } from "./dashboard-utils";

export const useDashboardData = ({ autoExpandSingleParent = false } = {}) => {
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const selectedLinkedUserId = useAppSelector((state) => state.linkedAccount.selectedLinkedUserId);
    const selectedLinkedAccount = useAppSelector((state) => state.linkedAccount.linkState?.linkedAccounts.find(
        (account) => account.id === state.linkedAccount.selectedLinkedUserId,
    ));
    const dailyRates = useAppSelector((state) => state.rates.items);
    const cachedRates = useAppSelector((state) => state.rates.range);
    const [categoryMode, setCategoryMode] = useState<DashboardCategoryMode>("parent");
    // undefined uses the automatic initial level; null is an explicit return to parents.
    const [expenseParentSelection, setExpenseParentId] = useState<number | null>();
    const [incomeParentSelection, setIncomeParentId] = useState<number | null>();
    const [accountsExpanded, setAccountsExpanded] = useState(false);
    const accountListId = useId();

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
    const reportingAccounts = useMemo(
        () => (accountsQuery.currentData ?? []).filter((account) => account.isEnabled),
        [accountsQuery.currentData],
    );
    const reportingAccountIds = useMemo(() => reportingAccounts.map((account) => account.id), [reportingAccounts]);
    const hasReportingAccounts = reportingAccountIds.length > 0;
    const visibleAccounts = useMemo(
        () => reportingAccounts.filter((account) => account.isFavourite !== false),
        [reportingAccounts],
    );
    const visibleAccountIds = useMemo(() => visibleAccounts.map((account) => account.id), [visibleAccounts]);
    const summaryFilter = useMemo(() => ({
        ...transactionsDefaultFilter,
        accountIds: reportingAccountIds,
        range: monthRange,
    }), [monthRange, reportingAccountIds]);
    const hasVisibleAccounts = visibleAccountIds.length > 0;
    const summaryQuery = useGetTransactionsSummaryQuery({
        filter: summaryFilter,
        linkedUserId: selectedLinkedUserId,
    }, { skip: !hasReportingAccounts });
    const categoryTransactionsQuery = useGetTransactionsQuery({
        pageSize: 0,
        page: 0,
        filter: summaryFilter,
        linkedUserId: selectedLinkedUserId,
    }, { skip: !hasReportingAccounts });
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

    const attemptedRateKey = useRef<string | null>(null);
    useEffect(() => {
        if (!needsCachedRates) {
            attemptedRateKey.current = null;
            return;
        }
        if (attemptedRateKey.current === cachedRateKey) return;
        attemptedRateKey.current = cachedRateKey;
        void dispatch(fetchRatesForRange(startDate, endDate, selectedLinkedUserId));
    }, [cachedRateKey, dispatch, endDate, needsCachedRates, selectedLinkedUserId, startDate]);

    useEffect(() => {
        setExpenseParentId(undefined);
        setIncomeParentId(undefined);
        setAccountsExpanded(false);
    }, [categoryMode, selectedLinkedUserId, startDate]);

    const exchangeRates = cachedRates?.completedKey === cachedRateKey ? cachedRates.items : [];
    const ratesLoading = needsCachedRates && (
        cachedRates?.completedKey !== cachedRateKey
        || (cachedRates?.requestKey === cachedRateKey && cachedRates.loading)
    );
    const retryRates = () => {
        void dispatch(fetchRatesForRange(startDate, endDate, selectedLinkedUserId));
    };
    const accountConversion = useMemo(
        () => baseCurrency
            ? getAccountBalanceConversionResult(accountBalances, baseCurrency, exchangeRates)
            : { value: 0, isComplete: false, unavailableCurrencies: [] },
        [accountBalances, baseCurrency, exchangeRates],
    );
    const cashFlowConversion = useMemo(
        () => hasReportingAccounts && summaryQuery.currentData && baseCurrency
            ? getCashFlowConversionResult(summaryQuery.currentData.currentScope, baseCurrency, exchangeRates)
            : null,
        [baseCurrency, exchangeRates, hasReportingAccounts, summaryQuery.currentData],
    );

    const categorySource = categoriesQuery.currentData ?? [];
    const categoryConversion = useMemo(() => {
        const rows: Array<{ id: number; value: number }> = [];
        const missing: Record<DashboardFlow, string[]> = { income: [], expense: [] };

        for (const transaction of hasReportingAccounts ? categoryTransactionsQuery.currentData?.data ?? [] : []) {
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
    }, [baseCurrency, categoryTransactionsQuery.currentData, exchangeRates, hasReportingAccounts]);
    const defaultParentIds = useMemo(() => {
        const singleParent = (flow: DashboardFlow) => {
            const parents = buildDashboardCategorySlices({
                categories: categorySource, reportData: categoryConversion.rows,
                flow, mode: "parent", otherLabel: t("dashboard.categories.other"),
            });
            const parentId = parents.length === 1 ? parents[0].id : null;
            return parentId != null && categorySource.some((category) => !category.isSystem && category.parentId === parentId)
                ? parentId : null;
        };
        return { expense: singleParent("expense"), income: singleParent("income") };
    }, [categoryConversion.rows, categorySource, t]);
    const expenseAutoExpanded = autoExpandSingleParent && categoryMode === "parent"
        && expenseParentSelection === undefined && defaultParentIds.expense != null;
    const incomeAutoExpanded = autoExpandSingleParent && categoryMode === "parent"
        && incomeParentSelection === undefined && defaultParentIds.income != null;
    const expenseParentId = expenseAutoExpanded ? defaultParentIds.expense : expenseParentSelection ?? null;
    const incomeParentId = incomeAutoExpanded ? defaultParentIds.income : incomeParentSelection ?? null;
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
        if (!hasReportingAccounts) return;
        navigate(`/transactions?filter=accountIds:${reportingAccountIds.join(",")};start:${startDate};end:${endDate};type:${flow};`);
    };

    const selectCategory = (flow: DashboardFlow, slice: DashboardCategorySlice) => {
        if (slice.id == null || !hasReportingAccounts) return;
        const hasChildren = categorySource.some((category) => category.parentId === slice.id);
        const selectedParentId = flow === "expense" ? expenseParentId : incomeParentId;
        if (categoryMode === "parent" && selectedParentId == null && hasChildren) {
            if (flow === "expense") setExpenseParentId(slice.id);
            else setIncomeParentId(slice.id);
            return;
        }

        navigate(`/transactions?filter=${buildDashboardTransactionFilter({
            accountIds: reportingAccountIds,
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
    const hasCollapsibleAccounts = accountBalances.some((account, index) => index >= 3 && account.value >= 0);
    const hasDesktopCollapsibleAccounts = accountBalances.some((account, index) => index >= 5 && account.value >= 0);

    return {
        t,
        i18n,
        navigate,
        selectedLinkedUserId,
        selectedLinkedAccount,
        visibleAccounts,
        hasReportingAccounts,
        accountsQuery,
        accountBalancesQuery,
        accountBalances,
        baseCurrency,
        accountConversion,
        balancePanelLoading,
        balancePanelError,
        accountDataLoading,
        accountDataError,
        categoryPanelLoading,
        categoriesQuery,
        categoryTransactionsQuery,
        summaryQuery,
        ratesLoading,
        missingCashFlowRates,
        cashFlowConversion,
        hasCashFlow,
        cashFlowChartData,
        oneSidedCashFlow,
        formatMoney,
        openFlow,
        categoryMode,
        setCategoryMode,
        expenseParentName,
        incomeParentName,
        expenseAutoExpanded,
        incomeAutoExpanded,
        expenseSlices,
        incomeSlices,
        setExpenseParentId,
        setIncomeParentId,
        selectCategory,
        categoryConversion,
        retryRates,
        effectiveDate,
        currentPeriodLabel,
        accountsExpanded,
        setAccountsExpanded,
        accountListId,
        hasCollapsibleAccounts,
        hasDesktopCollapsibleAccounts,
        exchangeRates,
    };
};

export type DashboardData = ReturnType<typeof useDashboardData>;
