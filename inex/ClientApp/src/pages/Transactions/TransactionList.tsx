import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pagination } from "antd";
import { Inbox, Plus, RotateCw } from "lucide-react";

import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import { transactionsApi, useGetTransactionsQuery } from "../../store/transactions/transactions-api";
import type { NormalizedTransactionFilter } from "../../store/transactions/transactions-slice";
import { EmptyState, FilterEmpty, InExButton, InExDrawer, Num, type MoneyKind } from "../../components/primitives";
import TransactionEditForm from "./TransactionEditForm";
import {
    appendSequentialPage,
    createProgressivePageAccumulator,
    getProgressivePageDisplay,
    getBaseCurrencyEquivalent,
    getCategoryPathLabel,
    getFriendlyTransactionDayLabel,
    getTransactionLocalDate,
    getTransactionKind,
    getTransactionNavigationMode,
    type ExchangeRateLike,
} from "./transaction-ledger-utils";

interface TransactionListProps {
    accounts: AccountResponse[];
    accountSummaries: AccountSummary[];
    baseCurrency: string;
    categories: CategoryResponse[];
    cachedExchangeRates: ExchangeRateLike[];
    filter: NormalizedTransactionFilter;
    onAddTransaction: () => void;
    onClearFilters: () => void;
    onInitialLoadingChange: (loading: boolean) => void;
    onEditDrawerOpenChange: (open: boolean) => void;
    onVisibleCountChange: (count: number) => void;
    periodLabel: string;
}

interface TransactionDateGroup {
    dateKey: string;
    label: string;
    items: TransactionResponse[];
}

const emptyTransactions: TransactionResponse[] = [];

const groupTransactions = (transactions: TransactionResponse[], dayLabels: { today: string; yesterday: string }): TransactionDateGroup[] => {
    const groups = new Map<string, TransactionDateGroup>();
    for (const transaction of transactions) {
        const dateKey = getTransactionLocalDate(transaction.created);
        const group = groups.get(dateKey) ?? {
            dateKey,
            label: getFriendlyTransactionDayLabel(transaction.created, dayLabels),
            items: [],
        };
        group.items.push(transaction);
        groups.set(dateKey, group);
    }
    return Array.from(groups.values()).sort((left, right) => right.dateKey.localeCompare(left.dateKey));
};

const TransactionList = ({ accounts, accountSummaries, baseCurrency, cachedExchangeRates, categories, filter, onAddTransaction, onClearFilters, onInitialLoadingChange, onEditDrawerOpenChange, onVisibleCountChange, periodLabel }: TransactionListProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formError = useAppSelector(state => state.transactions.error);
    const [pagination, setPagination] = useState({ current: 1, size: 20 });
    const [requestedProgressivePage, setRequestedProgressivePage] = useState(1);
    const [editRecord, setEditRecord] = useState<TransactionResponse | null>(null);
    const [focusTargetId, setFocusTargetId] = useState<number | null | undefined>(undefined);
    const [restoredFocusId, setRestoredFocusId] = useState<number | null>(null);
    const initialFailureRef = useRef<HTMLDivElement>(null);
    const navigationMode = getTransactionNavigationMode(filter.range);
    const requestKey = useMemo(() => JSON.stringify({ filter, pageSize: pagination.size, navigationMode }), [filter, pagination.size, navigationMode]);
    const [progressivePages, setProgressivePages] = useState(() => createProgressivePageAccumulator<TransactionResponse>(requestKey));
    const loadMoreSentinel = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setPagination(previous => ({ ...previous, current: 1 }));
        setRequestedProgressivePage(1);
        setProgressivePages(createProgressivePageAccumulator<TransactionResponse>(requestKey));
    }, [requestKey]);

    const requestedPage = navigationMode === "progressive" ? requestedProgressivePage : pagination.current;
    const query = useGetTransactionsQuery(
        { pageSize: pagination.size, page: requestedPage, filter },
        { skip: accounts.length === 0 || categories.length === 0 },
    );
    const currentPageData = query.currentData;

    useEffect(() => {
        if (navigationMode !== "progressive" || !currentPageData) return;
        setProgressivePages((current) => appendSequentialPage(
            current,
            requestKey,
            requestedPage,
            currentPageData.metadata.totalItems,
            currentPageData.data,
        ));
    }, [currentPageData, navigationMode, requestKey, requestedPage]);

    const progressiveDisplay = getProgressivePageDisplay(progressivePages, requestKey, currentPageData && {
        total: currentPageData.metadata.totalItems,
        items: currentPageData.data,
    });
    const transactions = navigationMode === "progressive"
        ? progressiveDisplay.items
        : currentPageData?.data ?? emptyTransactions;
    const total = navigationMode === "progressive"
        ? progressiveDisplay.total
        : currentPageData?.metadata.totalItems ?? 0;
    const hasRows = transactions.length > 0;
    const isCurrentDataLoading = query.isLoading || (query.isFetching && currentPageData === undefined);
    const hasNextPage = navigationMode === "progressive" && progressivePages.items.length < progressivePages.total;
    const canRequestMore = hasNextPage && !query.isFetching && progressivePages.nextPage === requestedProgressivePage + 1;

    const loadMore = useCallback(() => {
        if (canRequestMore) setRequestedProgressivePage(progressivePages.nextPage);
    }, [canRequestMore, progressivePages.nextPage]);

    useEffect(() => {
        const sentinel = loadMoreSentinel.current;
        if (!sentinel || !canRequestMore || typeof IntersectionObserver === "undefined") return undefined;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) loadMore();
        }, { rootMargin: "240px" });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [canRequestMore, loadMore]);

    const accountsById = useMemo(() => new Map(accounts.map(account => [account.id, account])), [accounts]);
    const categoriesById = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);
    const groups = useMemo(() => groupTransactions(transactions, {
        today: t("transactions.day.today"),
        yesterday: t("transactions.day.yesterday"),
    }), [t, transactions]);

    useEffect(() => onVisibleCountChange(transactions.length), [onVisibleCountChange, transactions.length]);
    useEffect(() => onInitialLoadingChange(isCurrentDataLoading && !hasRows), [hasRows, isCurrentDataLoading, onInitialLoadingChange]);
    useEffect(() => {
        if (query.isError && !hasRows) {
            initialFailureRef.current?.scrollIntoView({ block: "center" });
        }
    }, [hasRows, query.isError]);

    const closeEditDrawer = useCallback(() => {
        onEditDrawerOpenChange(false);
        setEditRecord(null);
    }, [onEditDrawerOpenChange]);

    const restoreLedgerFocusAfterMutation = useCallback((updatedTransactionId: number | null) => {
        closeEditDrawer();
        if (navigationMode === "progressive") {
            setRequestedProgressivePage(1);
            setProgressivePages(createProgressivePageAccumulator<TransactionResponse>(requestKey));
            void dispatch(transactionsApi.endpoints.getTransactions.initiate({ pageSize: pagination.size, page: 1, filter }, { forceRefetch: true })).unwrap()
                .catch(() => undefined)
                .finally(() => setFocusTargetId(updatedTransactionId));
            return;
        }

        void query.refetch().unwrap()
            .catch(() => undefined)
            .finally(() => setFocusTargetId(updatedTransactionId));
    }, [closeEditDrawer, dispatch, filter, navigationMode, pagination.size, query, requestKey]);

    useEffect(() => {
        if (focusTargetId === undefined) return undefined;

        const timeoutId = window.setTimeout(() => {
            const editedRow = focusTargetId === null
                ? null
                : document.querySelector<HTMLElement>(`[data-transaction-id="${focusTargetId}"]`);
            (editedRow ?? document.getElementById("transactions-ledger-heading"))?.focus();
            setRestoredFocusId(editedRow ? focusTargetId : null);
            setFocusTargetId(undefined);
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [focusTargetId, transactions]);

    const paginationChangedHandler = (page: number, size: number) => {
        setPagination(previous => ({ current: previous.size === size ? page : 1, size }));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const serverFilterActive = filter.accountIds.length > 0 || filter.categoryIds.length > 0 || filter.tags.length > 0 || filter.refs.length > 0 || filter.type !== "all" || filter.search !== "";

    if (isCurrentDataLoading && !hasRows) {
        return <div className="transactions-loading" aria-label={t("transactions.loading.initial")}>{Array.from({ length: 6 }).map((_, index) => <div className="transactions-skeleton-row" key={index}><span /><span /><span /></div>)}</div>;
    }

    if (query.isError && !hasRows) {
        return <div className="transactions-load-failure" ref={initialFailureRef}><Alert action={<InExButton icon={<RotateCw size={14} />} kind="ghost" onClick={() => query.refetch()} size="sm">{t("transactions.error.retry")}</InExButton>} message={t("transactions.error.loadFailure")} showIcon type="error" /><div className="transactions-error-detail">{String(query.error ?? "")}</div></div>;
    }

    if (!isCurrentDataLoading && transactions.length === 0 && serverFilterActive) {
        return <div className="transactions-empty-wrap"><FilterEmpty description={t("transactions.emptyDescription")} onClear={onClearFilters} title={t("transactions.noMatch")} /></div>;
    }

    if (!isCurrentDataLoading && transactions.length === 0) {
        return <div className="transactions-empty-wrap"><EmptyState actions={<InExButton icon={<Plus size={15} />} kind="primary" onClick={onAddTransaction} size="md">{t("transactions.add")}</InExButton>} iconNode={<Inbox size={28} />} description={t("transactions.emptyDescription")} title={t("transactions.empty")} /></div>;
    }

    return <>
        {query.isFetching && hasRows && <div className="transactions-refreshing" role="status"><RotateCw aria-hidden="true" size={14} />{t("transactions.loading.refreshing")}</div>}
        {query.isError && hasRows && <Alert action={<InExButton icon={<RotateCw size={14} />} kind="ghost" onClick={() => query.refetch()} size="sm">{t("transactions.error.retry")}</InExButton>} className="transactions-inline-error" message={t("transactions.error.partialFailure")} showIcon type="error" />}
        <div className="transactions-ledger-head"><div>{t("transactions.description")}</div><div>{t("transactions.account")}</div><div>{t("transactions.date")}</div><div>{t("transactions.amount")}</div></div>
        {groups.map(group => <section className="transactions-day-group" key={group.dateKey}>
            <header className="transactions-day-header"><div className="transactions-day-header__date">{group.label}<span>&middot; {t("transactions.itemCount", { count: group.items.length })}</span></div></header>
            {group.items.map(transaction => {
                const account = accountsById.get(transaction.accountId);
                const category = categoriesById.get(transaction.categoryId);
                const kind = getTransactionKind(transaction, category);
                const amountKind: MoneyKind = kind === "transfer" ? "transfer" : kind;
                const cleanComment = transaction.comment?.replace(/#\S+/g, "").replace(/@\S+/g, "").trim();
                const categoryPath = getCategoryPathLabel(category, categoriesById);
                const title = cleanComment || (kind === "transfer" ? t("transactions.transfer") : category?.name) || t("transactions.uncategorized");
                const currency = account?.currency ?? transaction.accountCurrency;
                const baseEquivalent = getBaseCurrencyEquivalent(transaction.amount, currency, transaction.created, baseCurrency, cachedExchangeRates);
                const openEdit = () => {
                    setRestoredFocusId(null);
                    onEditDrawerOpenChange(true);
                    setEditRecord(transaction);
                };
                return <div className={`transactions-ledger-row transactions-ledger-row--${kind}${restoredFocusId === transaction.id ? " transactions-ledger-row--restored-focus" : ""}`} data-transaction-id={transaction.id} key={transaction.id} onBlur={() => setRestoredFocusId(null)} onClick={openEdit} onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openEdit(); }
                }} role="button" tabIndex={0}>
                    <div className="transactions-row-main"><div className="transactions-row-title">{title}</div><div className="transactions-row-meta">{categoryPath && kind !== "transfer" && <span className="transactions-category-path">{categoryPath}</span>}{kind === "transfer" && <span>{t("transactions.transfer")}</span>}{transaction.tags.map(tag => <span className="transactions-row-token" key={`tag-${tag}`}>#{tag}</span>)}{transaction.refs.map(ref => <span className="transactions-row-token" key={`ref-${ref}`}>@{ref}</span>)}</div></div>
                    <div className="transactions-row-account">{account?.name ?? t("transactions.unknownAccount")}</div><div className="transactions-row-date">{getTransactionLocalDate(transaction.created)}</div>
                    <div className="transactions-row-amount"><Num currency={currency} kind={amountKind} signage="signed" size={15} value={transaction.amount} />{baseEquivalent && <span className="transactions-row-amount-equivalent">≈ <Num currency={baseEquivalent.currency} kind={amountKind} signage="signed" size={12} value={baseEquivalent.value} /></span>}</div>
                </div>;
            })}
        </section>)}
        <div className="transactions-pagination"><div>{t("transactions.paginationSummary", { visible: transactions.length, total, period: periodLabel })}</div>{navigationMode === "progressive" ? <div ref={loadMoreSentinel}><InExButton disabled={!hasNextPage || query.isFetching} kind="default" onClick={loadMore}>{query.isFetching ? t("transactions.loading.refreshing") : t("transactions.loadMore")}</InExButton></div> : <Pagination current={pagination.current} onChange={paginationChangedHandler} pageSize={pagination.size} pageSizeOptions={[20, 50, 100]} showSizeChanger total={total} />}</div>
        <InExDrawer onClose={closeEditDrawer} open={editRecord !== null} subtitle={t("transactions.editDrawerSubtitle")} title={t("transactions.editDrawerTitle")} width={460}>{editRecord ? <><TransactionEditForm accountSummaries={accountSummaries} accounts={accounts} categories={categories} onMutationSuccess={restoreLedgerFocusAfterMutation} record={editRecord} />{formError && <Alert className="transactions-form-error" message={formError} showIcon type="error" />}</> : <div className="transactions-empty-drawer"><Inbox size={20} /></div>}</InExDrawer>
    </>;
};

export default TransactionList;
