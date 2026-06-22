import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "antd";
import { ChevronLeft, ChevronRight, Filter, Plus, SlidersHorizontal, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import BasicPage from "../layouts/BasicPage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccountResponse, useGetAccountsQuery } from "../store/accounts/accounts-api";
import { CategoryResponse, useGetCategoriesQuery } from "../store/categories/categories-api";
import { transactionsActions, transactionsDefaultFilter, type TransactionFilter } from "../store/transactions/transactions-slice";
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
import TransactionFilterForm from "./Transactions/TransactionFilterForm";
import TransactionList from "./Transactions/TransactionList";
import { buildTransactionFilterSearch } from "./Transactions/transaction-filter-url";
import {
    emptyLedgerFilter,
    emptyLedgerMetrics,
    formatTransactionMonthLabel,
    formatTransactionPeriodLabel,
    getBaseCurrencyCode,
    getCurrentTransactionMonthRange,
    isCurrentOrFutureTransactionMonth,
    isWholeTransactionMonthRange,
    shiftTransactionMonthRange,
    type LedgerMetrics,
    type LedgerTypeFilter,
    type LedgerUiFilter,
} from "./Transactions/transaction-ledger-utils";
import "./Transactions/transactions-ledger.css";

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

const isLedgerUiFilterActive = (filter: LedgerUiFilter): boolean =>
    filter.type !== "all" ||
    filter.search.trim() !== "" ||
    filter.minAmount.trim() !== "" ||
    filter.maxAmount.trim() !== "";

const formatDateRange = (range: number[]): string => {
    if (range.length !== 2) return "";

    const format = (value: number, fallback: string) =>
        value > 0 ? new Date(value * 1000).toISOString().slice(0, 10) : fallback;

    return `${format(range[0], "start")} - ${format(range[1], "end")}`;
};

const Transactions = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const filterParam = queryParams.get("filter");

    const { data: allAccounts = [] } = useGetAccountsQuery("ALL");
    const { data: allCategories = [] } = useGetCategoriesQuery("ALL");
    const filterState = useAppSelector(state => state.transactions.filter);
    const formError = useAppSelector(state => state.transactions.error);
    const exchangeRates = useAppSelector(state => state.rates.items);

    const [addDrawerOpen, setAddDrawerOpen] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(filterParam !== null);
    const [ledgerFilter, setLedgerFilter] = useState<LedgerUiFilter>(emptyLedgerFilter);
    const [ledgerMetrics, setLedgerMetrics] = useState<LedgerMetrics>(emptyLedgerMetrics);
    const [ledgerInitialLoading, setLedgerInitialLoading] = useState(false);

    const activeAccounts = useMemo(
        () => allAccounts.filter((account: AccountResponse) => account.isEnabled),
        [allAccounts],
    );
    const activeCategories = useMemo(
        () => allCategories.filter((category: CategoryResponse) => category.isEnabled),
        [allCategories],
    );

    const filterActive = isTransactionFilterActive(filterState) || isLedgerUiFilterActive(ledgerFilter);
    const filterIndicatorTitle = filterActive ? t("transactions.filtersActive") : undefined;
    const baseCurrency = useMemo(() => getBaseCurrencyCode(exchangeRates), [exchangeRates]);
    const noMatchActive = filterActive && ledgerMetrics.totalCount > 0 && ledgerMetrics.visibleCount === 0;
    const activeMonthRange = filterState.range.length === 2 ? filterState.range : getCurrentTransactionMonthRange();
    const periodLabel = useMemo(
        () => isWholeTransactionMonthRange(activeMonthRange)
            ? formatTransactionMonthLabel(activeMonthRange, t("transactions.period.currentMonth"))
            : formatTransactionPeriodLabel(activeMonthRange, t("transactions.period.currentMonth")),
        [activeMonthRange, t],
    );
    const nextMonthDisabled = useMemo(
        () => isCurrentOrFutureTransactionMonth(activeMonthRange),
        [activeMonthRange],
    );

    const applyServerFilter = useCallback((nextFilter: TransactionFilter, replace = true) => {
        dispatch(transactionsActions.setFilter({ filter: nextFilter }));
        navigate(`${location.pathname}${buildTransactionFilterSearch(nextFilter)}`, { replace });
    }, [dispatch, location.pathname, navigate]);

    useEffect(() => {
        if (filterParam !== null) return;

        applyServerFilter({
            ...transactionsDefaultFilter,
            range: getCurrentTransactionMonthRange(),
        }, true);
    }, [applyServerFilter, filterParam]);

    const changeMonth = useCallback((monthDelta: number) => {
        applyServerFilter({
            ...filterState,
            range: shiftTransactionMonthRange(activeMonthRange, monthDelta),
        }, false);
    }, [activeMonthRange, applyServerFilter, filterState]);

    const resetToCurrentMonth = useCallback(() => {
        applyServerFilter({
            ...filterState,
            range: getCurrentTransactionMonthRange(),
        }, false);
    }, [applyServerFilter, filterState]);

    const clearAllFilters = useCallback(() => {
        setLedgerFilter(emptyLedgerFilter);
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
            <button className="transactions-month-current" onClick={resetToCurrentMonth} type="button">
                {periodLabel}
            </button>
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

        if (ledgerFilter.type !== "all") {
            next.push({
                key: "type",
                label: `${t("transactions.type")}: ${t(`transactions.${ledgerFilter.type}`)}`,
                onClear: () => setLedgerFilter(prev => ({ ...prev, type: "all" })),
            });
        }

        if (ledgerFilter.search.trim() !== "") {
            next.push({
                key: "search",
                label: `${t("transactions.search")}: ${ledgerFilter.search.trim()}`,
                onClear: () => setLedgerFilter(prev => ({ ...prev, search: "" })),
            });
        }

        if (filterState.accountIds.length > 0) {
            next.push({
                key: "accounts",
                label: `${t("transactions.account")}: ${filterState.accountIds.map(id => accountById.get(id) ?? id).join(", ")}`,
                onClear: () => clearServerFilter({ ...filterState, accountIds: [] }),
            });
        }

        if (filterState.categoryIds.length > 0) {
            next.push({
                key: "categories",
                label: `${t("transactions.category")}: ${filterState.categoryIds.map(id => categoryById.get(id) ?? id).join(", ")}`,
                onClear: () => clearServerFilter({ ...filterState, categoryIds: [] }),
            });
        }

        if (filterState.tags.length > 0) {
            next.push({
                key: "tags",
                label: `${t("transactions.tags")}: ${filterState.tags.map(tag => `#${tag}`).join(" ")}`,
                onClear: () => clearServerFilter({ ...filterState, tags: [] }),
            });
        }

        if (filterState.refs.length > 0) {
            next.push({
                key: "refs",
                label: `${t("transactions.refs")}: ${filterState.refs.map(ref => `@${ref}`).join(" ")}`,
                onClear: () => clearServerFilter({ ...filterState, refs: [] }),
            });
        }

        if (filterState.range.length === 2 && !isWholeTransactionMonthRange(filterState.range)) {
            next.push({
                key: "date",
                label: `${t("transactions.date")}: ${formatDateRange(filterState.range)}`,
                onClear: () => clearServerFilter({ ...filterState, range: getCurrentTransactionMonthRange() }),
            });
        }

        if (ledgerFilter.minAmount.trim() !== "" || ledgerFilter.maxAmount.trim() !== "") {
            next.push({
                key: "amount",
                label: `${t("transactions.amount")}: ${ledgerFilter.minAmount || "0"} - ${ledgerFilter.maxAmount || t("transactions.anyAmount")}`,
                onClear: () => setLedgerFilter(prev => ({ ...prev, minAmount: "", maxAmount: "" })),
            });
        }

        return next;
    }, [allAccounts, allCategories, clearServerFilter, filterState, ledgerFilter, t]);

    const kpiItems = [
        {
            label: t("transactions.kpi.income"),
            value: Math.abs(ledgerMetrics.income),
            kind: "income" as MoneyKind,
            signage: "color-only" as Signage,
            sub: t("transactions.kpi.visibleRows", { count: ledgerMetrics.visibleCount, period: periodLabel }),
        },
        {
            label: t("transactions.kpi.expenses"),
            value: Math.abs(ledgerMetrics.expense),
            kind: "expense" as MoneyKind,
            signage: "color-only" as Signage,
            sub: t("transactions.kpi.visibleRows", { count: ledgerMetrics.visibleCount, period: periodLabel }),
        },
        {
            label: t("transactions.kpi.netFlow"),
            value: ledgerMetrics.net,
            kind: ledgerMetrics.net > 0 ? "income" as MoneyKind : ledgerMetrics.net < 0 ? "expense" as MoneyKind : "neutral" as MoneyKind,
            signage: "signed" as Signage,
            sub: t("transactions.kpi.baseCurrencyContext", { currency: baseCurrency }),
            primary: true,
        },
    ];

    const headerActions = (
        <div className="transactions-header-actions">
            <InExButton icon={<Plus size={16} />} kind="primary" onClick={() => setAddDrawerOpen(true)} size="md">
                {t("transactions.addTransaction")}
            </InExButton>
        </div>
    );

    return (
        <>
            <BasicPage title={t("transactions.title")} subtitle={t("transactions.subtitle")} extra={headerActions}>
                <section className="transactions-ledger">
                    <div className="transactions-kpi-strip" aria-label={t("transactions.kpi.title")} data-qa="hero-card">
                        {kpiItems.map(item => (
                            <div className={`transactions-kpi${ledgerInitialLoading ? " transactions-kpi--loading" : ""}`} key={item.label}>
                                <div className="transactions-kpi__label" data-qa={item.primary ? "hero-primary-label" : undefined}>{item.label}</div>
                                <div className="transactions-kpi__value" data-qa={item.primary ? "hero-primary-value" : undefined}>
                                    {ledgerInitialLoading ? (
                                        <span className="transactions-kpi__skeleton" />
                                    ) : (
                                        <Num
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

                    <section className="transactions-ledger-card" aria-label={t("transactions.ledger")}>
                        <div className="transactions-ledger-toolbar">
                            <div className="transactions-ledger-toolbar__title">
                                <h2>{t("transactions.ledger")}</h2>
                                {monthControls}
                                <span className="transactions-toolbar-count">
                                    {t("transactions.toolbarCount", {
                                        visible: ledgerMetrics.visibleCount,
                                        total: ledgerMetrics.totalCount,
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
                            <InExButton
                                icon={<SlidersHorizontal size={15} />}
                                kind="ghost"
                                onClick={() => setFilterDrawerOpen(true)}
                                size="sm"
                            >
                                {t("transactions.filters")}
                            </InExButton>
                        </div>

                        <div className="transactions-ledger-controls">
                            <SegmentedControl
                                label={t("transactions.view")}
                                onChange={(value) => setLedgerFilter(prev => ({ ...prev, type: value as LedgerTypeFilter }))}
                                options={[
                                    { key: "all", label: `${t("transactions.all")} ${ledgerMetrics.typeCounts.all}` },
                                    { key: "income", label: `${t("transactions.income")} ${ledgerMetrics.typeCounts.income}` },
                                    { key: "expense", label: `${t("transactions.expense")} ${ledgerMetrics.typeCounts.expense}` },
                                    { key: "transfer", label: `${t("transactions.transfer")} ${ledgerMetrics.typeCounts.transfer}` },
                                ]}
                                size="compact"
                                value={ledgerFilter.type}
                            />
                            <Input
                                aria-label={t("transactions.search")}
                                className="transactions-search"
                                onChange={(event) => setLedgerFilter(prev => ({ ...prev, search: event.target.value }))}
                                placeholder={t("transactions.searchPlaceholder")}
                                style={{ flex: "0 1 280px", minWidth: 220 }}
                                value={ledgerFilter.search}
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
                            categories={allCategories}
                            exchangeRates={exchangeRates}
                            ledgerFilter={ledgerFilter}
                            onAddTransaction={() => setAddDrawerOpen(true)}
                            onClearFilters={clearAllFilters}
                            onInitialLoadingChange={setLedgerInitialLoading}
                            onMetricsChange={setLedgerMetrics}
                            periodLabel={periodLabel}
                        />
                    </section>
                </section>
            </BasicPage>

            <InExDrawer
                onClose={() => setAddDrawerOpen(false)}
                open={addDrawerOpen}
                subtitle={t("transactions.newExpenseSubtitle")}
                title={t("transactions.addDrawerTitle")}
                width={460}
            >
                <TransactionCreate
                    accounts={activeAccounts}
                    categories={activeCategories}
                    onCancel={() => setAddDrawerOpen(false)}
                    onSubmit={() => setAddDrawerOpen(false)}
                />
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
                    baseCurrency={baseCurrency}
                    filter={filterParam}
                    ledgerFilter={ledgerFilter}
                    onLedgerFilterChange={setLedgerFilter}
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
