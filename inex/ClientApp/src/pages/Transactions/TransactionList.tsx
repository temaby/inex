import * as React from "react";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pagination } from "antd";
import { Inbox, Plus, RotateCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AccountResponse } from "../../store/accounts/accounts-api";
import { CategoryResponse } from "../../store/categories/categories-api";
import { useAppSelector } from "../../store/hooks";
import { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import { useGetTransactionsQuery, type TransactionFilterParams } from "../../store/transactions/transactions-api";
import { EmptyState, FilterEmpty, InExButton, InExDrawer, ListPanelNoMatchRow, Num, type MoneyKind } from "../../components/primitives";
import TransactionEditForm from "./TransactionEditForm";
import { buildSingleTagOrRefFilterSearch } from "./transaction-filter-url";
import {
    getBaseCurrencyEquivalent,
    getCategoryPathLabel,
    getFriendlyTransactionDayLabel,
    getLedgerTypeCounts,
    getTransactionKind,
    toBaseCurrencyAmount,
    type ExchangeRateLike,
    type LedgerMetrics,
    type LedgerUiFilter,
} from "./transaction-ledger-utils";

interface TransactionListProps {
    accounts: AccountResponse[];
    baseCurrency: string;
    categories: CategoryResponse[];
    exchangeRates: ExchangeRateLike[];
    ledgerFilter: LedgerUiFilter;
    onAddTransaction: () => void;
    onClearFilters: () => void;
    onInitialLoadingChange: (loading: boolean) => void;
    onMetricsChange: (metrics: LedgerMetrics) => void;
    periodLabel: string;
}

interface TransactionDateGroup {
    dateKey: string;
    label: string;
    income: number;
    expense: number;
    items: TransactionResponse[];
}

const matchesAmount = (amount: number, min: string, max: string): boolean => {
    const absoluteAmount = Math.abs(amount);
    const minValue = min.trim() === "" ? null : Number(min);
    const maxValue = max.trim() === "" ? null : Number(max);

    if (minValue !== null && Number.isFinite(minValue) && absoluteAmount < minValue) return false;
    if (maxValue !== null && Number.isFinite(maxValue) && absoluteAmount > maxValue) return false;
    return true;
};

const buildSearchHaystack = (
    transaction: TransactionResponse,
    account?: AccountResponse,
    category?: CategoryResponse,
    categoryPath?: string,
): string =>
    [
        transaction.comment,
        account?.name,
        category?.name,
        categoryPath,
        transaction.accountCurrency,
        ...transaction.tags,
        ...transaction.refs,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

const groupTransactions = (
    transactions: TransactionResponse[],
    accountsById: Map<number, AccountResponse>,
    categoriesById: Map<number, CategoryResponse>,
    exchangeRates: ExchangeRateLike[],
    dayLabels: { today: string; yesterday: string },
): TransactionDateGroup[] => {
    const groups = new Map<string, TransactionDateGroup>();

    for (const transaction of transactions) {
        const dateKey = dayjs(transaction.created).format("YYYY-MM-DD");
        const existing = groups.get(dateKey) ?? {
            dateKey,
            label: getFriendlyTransactionDayLabel(transaction.created, dayLabels),
            income: 0,
            expense: 0,
            items: [],
        };
        const account = accountsById.get(transaction.accountId);
        const category = categoriesById.get(transaction.categoryId);
        const kind = getTransactionKind(transaction, category);
        const currency = account?.currency ?? transaction.accountCurrency;
        const baseAmount = toBaseCurrencyAmount(transaction.amount, currency, exchangeRates);

        if (baseAmount !== null && kind === "income") existing.income += baseAmount;
        if (baseAmount !== null && kind === "expense") existing.expense += baseAmount;
        existing.items.push(transaction);
        groups.set(dateKey, existing);
    }

    return Array.from(groups.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
};

const TransactionList = ({
    accounts,
    baseCurrency,
    categories,
    exchangeRates,
    ledgerFilter,
    onAddTransaction,
    onClearFilters,
    onInitialLoadingChange,
    onMetricsChange,
    periodLabel,
}: TransactionListProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const filter = useAppSelector(state => state.transactions.filter);
    const formError = useAppSelector(state => state.transactions.error);

    const [pagination, setPagination] = useState({ current: 1, total: 0, size: 20 });
    const [editRecord, setEditRecord] = useState<TransactionResponse | null>(null);
    const { size: pageSize, current: currentPage } = pagination;

    const queryFilter = useMemo<TransactionFilterParams>(() => ({
        accountIds: filter.accountIds,
        categoryIds: filter.categoryIds,
        tags: filter.tags,
        refs: filter.refs,
        range: filter.range,
    }), [filter]);

    const {
        data,
        error,
        isError,
        isFetching,
        isLoading,
        refetch,
    } = useGetTransactionsQuery(
        { pageSize, page: currentPage, filter: queryFilter },
        { skip: accounts.length === 0 || categories.length === 0 },
    );

    const transactions = data?.data ?? [];
    const total = data?.metadata.totalItems ?? 0;
    const hasRows = transactions.length > 0;

    const accountsById = useMemo(() => new Map(accounts.map(account => [account.id, account])), [accounts]);
    const categoriesById = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);

    const locallyScopedTransactions = useMemo(() => {
        const search = ledgerFilter.search.trim().toLowerCase();

        return transactions.filter(transaction => {
            const account = accountsById.get(transaction.accountId);
            const category = categoriesById.get(transaction.categoryId);
            const categoryPath = getCategoryPathLabel(category, categoriesById);
            const currency = account?.currency ?? transaction.accountCurrency;
            const baseAmount = toBaseCurrencyAmount(transaction.amount, currency, exchangeRates);
            const amountFilterActive = ledgerFilter.minAmount.trim() !== "" || ledgerFilter.maxAmount.trim() !== "";

            if (search && !buildSearchHaystack(transaction, account, category, categoryPath).includes(search)) return false;
            if (amountFilterActive && baseAmount === null) return false;
            if (baseAmount === null) return true;
            return matchesAmount(baseAmount, ledgerFilter.minAmount, ledgerFilter.maxAmount);
        });
    }, [accountsById, categoriesById, exchangeRates, ledgerFilter.maxAmount, ledgerFilter.minAmount, ledgerFilter.search, transactions]);

    const visibleTransactions = useMemo(() => (
        locallyScopedTransactions.filter(transaction => {
            const category = categoriesById.get(transaction.categoryId);
            const kind = getTransactionKind(transaction, category);

            return ledgerFilter.type === "all" || kind === ledgerFilter.type;
        })
    ), [categoriesById, ledgerFilter.type, locallyScopedTransactions]);

    const groups = useMemo(
        () => groupTransactions(
            visibleTransactions,
            accountsById,
            categoriesById,
            exchangeRates,
            {
                today: t("transactions.day.today"),
                yesterday: t("transactions.day.yesterday"),
            },
        ),
        [accountsById, categoriesById, exchangeRates, t, visibleTransactions],
    );
    const ledgerMetrics = useMemo<LedgerMetrics>(() => {
        let income = 0;
        let expense = 0;

        for (const transaction of visibleTransactions) {
            const account = accountsById.get(transaction.accountId);
            const category = categoriesById.get(transaction.categoryId);
            const kind = getTransactionKind(transaction, category);
            const currency = account?.currency ?? transaction.accountCurrency;
            const baseAmount = toBaseCurrencyAmount(transaction.amount, currency, exchangeRates);

            if (baseAmount !== null && kind === "income") income += baseAmount;
            if (baseAmount !== null && kind === "expense") expense += baseAmount;
        }

        return {
            income,
            expense,
            net: income + expense,
            visibleCount: visibleTransactions.length,
            totalCount: total,
            typeCounts: getLedgerTypeCounts(locallyScopedTransactions, categoriesById),
        };
    }, [accountsById, categoriesById, exchangeRates, locallyScopedTransactions, total, visibleTransactions]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, total }));
    }, [total]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, current: 1 }));
    }, [queryFilter]);

    useEffect(() => {
        onMetricsChange(ledgerMetrics);
    }, [ledgerMetrics, onMetricsChange]);

    useEffect(() => {
        onInitialLoadingChange(isLoading && !hasRows);
    }, [hasRows, isLoading, onInitialLoadingChange]);

    const paginationChangedHandler = (page: number, size: number) => {
        setPagination(prev => ({ ...prev, current: prev.size === size ? page : 1, size }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleTagClick = (tag: string) => {
        navigate(`../../transactions${buildSingleTagOrRefFilterSearch("tags", tag)}`, { replace: false });
    };

    const handleRefClick = (ref: string) => {
        navigate(`../../transactions${buildSingleTagOrRefFilterSearch("refs", ref)}`, { replace: false });
    };

    if (isLoading && !hasRows) {
        return (
            <div className="transactions-loading" aria-label={t("transactions.loading.initial")}>
                {Array.from({ length: 6 }).map((_, index) => (
                    <div className="transactions-skeleton-row" key={index}>
                        <span />
                        <span />
                        <span />
                    </div>
                ))}
            </div>
        );
    }

    if (isError && !hasRows) {
        return (
            <div className="transactions-load-failure">
                <Alert
                    action={(
                        <InExButton icon={<RotateCw size={14} />} kind="ghost" onClick={() => refetch()} size="sm">
                            {t("transactions.error.retry")}
                        </InExButton>
                    )}
                    message={t("transactions.error.loadFailure")}
                    showIcon
                    type="error"
                />
                <div className="transactions-error-detail">{String(error ?? "")}</div>
            </div>
        );
    }

    const serverFilterActive =
        queryFilter.accountIds.length > 0 ||
        queryFilter.categoryIds.length > 0 ||
        queryFilter.tags.length > 0 ||
        queryFilter.refs.length > 0 ||
        (queryFilter.range.length === 2 && (queryFilter.range[0] > 0 || queryFilter.range[1] > 0));

    if (!isLoading && transactions.length === 0 && serverFilterActive) {
        return (
            <div className="transactions-empty-wrap">
                <FilterEmpty
                    description={t("transactions.emptyDescription")}
                    onClear={onClearFilters}
                    title={t("transactions.empty")}
                />
            </div>
        );
    }

    if (!isLoading && transactions.length === 0) {
        return (
            <div className="transactions-empty-wrap">
                <EmptyState
                    actions={(
                        <InExButton icon={<Plus size={15} />} kind="primary" onClick={onAddTransaction} size="md">
                            {t("transactions.add")}
                        </InExButton>
                    )}
                    iconNode={<Inbox size={28} />}
                    description={t("transactions.emptyDescription")}
                    title={t("transactions.empty")}
                />
            </div>
        );
    }

    return (
        <>
            {isFetching && hasRows && (
                <div className="transactions-refreshing" role="status">
                    <RotateCw aria-hidden="true" size={14} />
                    {t("transactions.loading.refreshing")}
                </div>
            )}

            {isError && hasRows && (
                <Alert
                    action={(
                        <InExButton icon={<RotateCw size={14} />} kind="ghost" onClick={() => refetch()} size="sm">
                            {t("transactions.error.retry")}
                        </InExButton>
                    )}
                    className="transactions-inline-error"
                    message={t("transactions.error.partialFailure")}
                    showIcon
                    type="error"
                />
            )}

            <div className="transactions-ledger-head">
                <div>{t("transactions.description")}</div>
                <div>{t("transactions.account")}</div>
                <div>{t("transactions.date")}</div>
                <div>{t("transactions.amount")}</div>
            </div>

            {visibleTransactions.length === 0 ? (
                <ListPanelNoMatchRow message={t("transactions.noMatch")} />
            ) : (
                groups.map(group => (
                    <section className="transactions-day-group" key={group.dateKey}>
                        <header className="transactions-day-header">
                            <div className="transactions-day-header__date">
                                {group.label}
                                <span>{t("transactions.itemCount", { count: group.items.length })}</span>
                            </div>
                            <div className="transactions-day-header__totals">
                                {group.income > 0 && <Num value={group.income} kind="income" currency={baseCurrency} signage="signed" size={12} />}
                                {group.expense < 0 && <Num value={group.expense} kind="expense" currency={baseCurrency} signage="signed" size={12} />}
                            </div>
                        </header>
                        {group.items.map(transaction => {
                            const account = accountsById.get(transaction.accountId);
                            const category = categoriesById.get(transaction.categoryId);
                            const kind = getTransactionKind(transaction, category);
                            const amountKind: MoneyKind = kind === "transfer" ? "transfer" : kind;
                            const cleanComment = transaction.comment?.replace(/#\S+/g, "").replace(/@\S+/g, "").trim();
                            const categoryPath = getCategoryPathLabel(category, categoriesById);
                            const title = cleanComment || (kind === "transfer" ? t("transactions.transfer") : category?.name) || t("transactions.uncategorized");
                            const currency = account?.currency ?? transaction.accountCurrency;
                            const baseEquivalent = getBaseCurrencyEquivalent(transaction.amount, currency, exchangeRates);

                            const openEdit = () => setEditRecord(transaction);

                            return (
                                <div
                                    className={`transactions-ledger-row transactions-ledger-row--${kind}`}
                                    key={transaction.id}
                                    onClick={openEdit}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            openEdit();
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="transactions-row-main">
                                        <div className="transactions-row-title">{title}</div>
                                        <div className="transactions-row-meta">
                                            {categoryPath && kind !== "transfer" && <span className="transactions-category-path">{categoryPath}</span>}
                                            {kind === "transfer" && <span>{t("transactions.transfer")}</span>}
                                            {transaction.tags.map(tag => (
                                                <button
                                                    className="transactions-row-token"
                                                    key={`tag-${tag}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleTagClick(tag);
                                                    }}
                                                    type="button"
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                            {transaction.refs.map(ref => (
                                                <button
                                                    className="transactions-row-token"
                                                    key={`ref-${ref}`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleRefClick(ref);
                                                    }}
                                                    type="button"
                                                >
                                                    @{ref}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="transactions-row-account">{account?.name ?? t("transactions.unknownAccount")}</div>
                                    <div className="transactions-row-date">{dayjs(transaction.created).format("YYYY-MM-DD")}</div>
                                    <div className="transactions-row-amount">
                                        <Num
                                            currency={currency}
                                            kind={amountKind}
                                            signage="signed"
                                            value={transaction.amount}
                                            size={15}
                                        />
                                        {baseEquivalent && (
                                            <span className="transactions-row-amount-equivalent">
                                                {t("transactions.approxBaseAmount")}{" "}
                                                <Num
                                                    currency={baseEquivalent.currency}
                                                    kind={amountKind}
                                                    signage="signed"
                                                    value={baseEquivalent.value}
                                                    size={12}
                                                />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                ))
            )}

            <div className="transactions-pagination">
                <div>
                    {t("transactions.paginationSummary", {
                        visible: visibleTransactions.length,
                        total,
                        period: periodLabel,
                    })}
                </div>
                <Pagination
                    current={pagination.current}
                    onChange={paginationChangedHandler}
                    pageSize={pagination.size}
                    pageSizeOptions={[20, 50, 100]}
                    showSizeChanger
                    total={pagination.total}
                />
            </div>

            <InExDrawer
                onClose={() => setEditRecord(null)}
                open={editRecord !== null}
                subtitle={t("transactions.editDrawerSubtitle")}
                title={t("transactions.editDrawerTitle")}
                width={460}
            >
                {editRecord ? (
                    <>
                        <TransactionEditForm
                            accounts={accounts}
                            categories={categories}
                            record={editRecord}
                        />
                        {formError && (
                            <Alert
                                className="transactions-form-error"
                                message={formError}
                                showIcon
                                type="error"
                            />
                        )}
                    </>
                ) : (
                    <div className="transactions-empty-drawer">
                        <Inbox size={20} />
                    </div>
                )}
            </InExDrawer>
        </>
    );
};

export default TransactionList;
