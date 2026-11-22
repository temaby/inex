import * as React from "react";
import { Alert, message } from "antd";
import { FolderTree, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
    EmptyState,
    InExButton,
    ListPanel,
    ListPanelColumnHeader,
    ListPanelNoMatchRow,
} from "../components/primitives";
import BasicPage from "../layouts/BasicPage";
import type { BudgetDetails } from "../model/Budget/BudgetDetails";
import type { TransactionResponse } from "../model/Transaction/TransactionResponse";
import { budgetsApi, useGetBudgetsQuery } from "../store/budgets/budgets-api";
import type { CategoryResponse } from "../store/categories/categories-api";
import { useGetCategoriesQuery } from "../store/categories/categories-api";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchCachedRatesForRange } from "../store/rates/rates-action";
import apiClient from "../utils/apiClient";
import { CategoryDrawer, type CategoryDrawerSession, type CategoryMutation, type CategorySnapshot } from "./Categories/CategoryDrawer";
import { CategoryRow } from "./Categories/CategoryRow";
import { useCollapsedTreeNodeIds } from "./tree-expansion-preferences";
import { CategoriesHero } from "./Categories/CategoriesHero";
import {
    CategoriesToolbar,
    type CategoriesViewMode,
} from "./Categories/CategoriesToolbar";
import {
    buildCategoriesTree,
    buildBudgetCategoryIndex,
    categoryPaletteColor,
    computeCategorySpendStats,
    filterCollapsedCategoryTree,
    flattenCategoryTree,
    getCategoryBaseCurrency,
    getCategoryIncomeSnapshot,
    includeAncestorCategories,
    sortLeafCategoriesBySpend,
} from "./Categories/categories.utils";
import "./Categories/categories.css";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const isTransactionResponse = (value: unknown): value is TransactionResponse =>
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.accountId === "number" &&
    typeof value.categoryId === "number" &&
    typeof value.created === "string" &&
    typeof value.amount === "number" &&
    typeof value.accountCurrency === "string" &&
    Array.isArray(value.tags) &&
    Array.isArray(value.refs);

interface CategoryPeriod {
    year: number;
    month: number;
}

interface TransactionsPagedData {
    data: TransactionResponse[];
    metadata: { totalItems: number };
}

interface CurrencyOption {
    id: number;
    key: string;
}

interface CategoryDrawerState {
    key: number;
    open: boolean;
    ownerId?: number;
    preferHeaderFallback: boolean;
    session: CategoryDrawerSession;
}

const CATEGORY_TRANSACTIONS_PAGE_SIZE = 250;
const CATEGORY_TRANSACTIONS_MAX_PAGES = 40;

const isTransactionsPagedData = (value: unknown): value is TransactionsPagedData =>
    isRecord(value) &&
    Array.isArray(value.data) &&
    value.data.every(isTransactionResponse) &&
    isRecord(value.metadata) &&
    typeof value.metadata.totalItems === "number";

const formatPeriodDate = (year: number, month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const formatPeriodDateTime = (
    year: number,
    month: number,
    day: number,
    time: "start" | "end",
) => `${formatPeriodDate(year, month, day)}T${time === "start" ? "00:00:00" : "23:59:59"}`;

const getPeriodQueryDates = ({ year, month }: CategoryPeriod) => ({
    startDate: formatPeriodDateTime(year, month, 1, "start"),
    endDate: formatPeriodDateTime(year, month, new Date(year, month, 0).getDate(), "end"),
});

const fetchPeriodTransactions = async (
    period: CategoryPeriod,
    linkedUserId?: number | null,
): Promise<TransactionResponse[] | null> => {
    const { startDate, endDate } = getPeriodQueryDates(period);
    const transactions: TransactionResponse[] = [];
    const seenIds = new Set<number>();
    let totalItems = Number.POSITIVE_INFINITY;
    let page = 1;

    while (seenIds.size < totalItems && page <= CATEGORY_TRANSACTIONS_MAX_PAGES) {
        const { data } = await apiClient.get<TransactionsPagedData>("/transactions", {
            params: {
                mode: "ALL",
                pageSize: CATEGORY_TRANSACTIONS_PAGE_SIZE,
                page,
                startDate,
                endDate,
                linkedUserId: linkedUserId ?? undefined,
            },
        });

        if (!isTransactionsPagedData(data)) {
            return null;
        }

        totalItems = data.metadata.totalItems;
        data.data.forEach((transaction) => {
            if (!seenIds.has(transaction.id)) {
                seenIds.add(transaction.id);
                transactions.push(transaction);
            }
        });

        if (data.data.length === 0) {
            break;
        }
        page += 1;
    }

    return seenIds.size >= totalItems ? transactions : null;
};

const getCurrentPeriod = () => {
    const now = new Date();
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
    };
};

const samePeriod = (left: CategoryPeriod, right: CategoryPeriod) =>
    left.year === right.year && left.month === right.month;

const useCurrentPeriod = () => {
    const [period, setPeriod] = React.useState<CategoryPeriod>(() => getCurrentPeriod());

    React.useEffect(() => {
        const intervalId = window.setInterval(() => {
            setPeriod((current) => {
                const next = getCurrentPeriod();
                return samePeriod(current, next) ? current : next;
            });
        }, 60_000);

        return () => window.clearInterval(intervalId);
    }, []);

    return period;
};

const Categories = () => {
    const { i18n, t } = useTranslation();
    const dispatch = useAppDispatch();
    const [drawerState, setDrawerState] = React.useState<CategoryDrawerState | null>(null);
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [view, setView] = React.useState<CategoriesViewMode>("tree");
    const [currencies, setCurrencies] = React.useState<CurrencyOption[]>([]);
    const drawerTriggerRef = React.useRef<HTMLButtonElement | null>(null);
    const drawerSequence = React.useRef(0);
    const restoreFocusAfterRefresh = React.useRef(false);
    const [categoryMessage, messageHolder] = message.useMessage();
    const period = useCurrentPeriod();
    const [periodTransactions, setPeriodTransactions] = React.useState<{
        key: string;
        items: TransactionResponse[] | null;
    } | null>(null);
    const selectedLinkedUserId = useAppSelector((state) => state.linkedAccount.selectedLinkedUserId);
    const selectedLinkedAccount = useAppSelector((state) => state.linkedAccount.linkState?.linkedAccounts.find(
        (account) => account.id === state.linkedAccount.selectedLinkedUserId,
    ));

    const {
        currentData: categories = [],
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useGetCategoriesQuery(
        selectedLinkedUserId === null
            ? "ALL"
            : { mode: "ALL", linkedUserId: selectedLinkedUserId },
    );
    const { data: currentMonthBudgets } = useGetBudgetsQuery(period, { skip: selectedLinkedUserId !== null });
    const currentRates = useAppSelector((state) => state.rates.items);
    const cachedRates = useAppSelector((state) => state.rates.cached?.items ?? []);
    const exchangeRates = selectedLinkedUserId === null ? currentRates : cachedRates;
    const userCurrencyId = useAppSelector((state) => state.auth.user?.currencyId);
    const userId = useAppSelector((state) => state.auth.user?.id);
    const isLinkedMode = selectedLinkedUserId !== null;
    const dataOwnerId = selectedLinkedUserId ?? userId;
    const [collapsedCategoryIds, setCollapsedCategoryIds] = useCollapsedTreeNodeIds("categories", dataOwnerId);
    const profileCurrency = React.useMemo(
        () => selectedLinkedAccount?.baseCurrency
            ?? currencies.find((currency) => currency.id === userCurrencyId)?.key.trim()
            ?? null,
        [currencies, selectedLinkedAccount?.baseCurrency, userCurrencyId],
    );
    const baseCurrency = React.useMemo(
        () => getCategoryBaseCurrency(exchangeRates, profileCurrency),
        [exchangeRates, profileCurrency],
    );
    const cachedBudgets = useAppSelector((state) => {
        const cachedCurrentMonthBudgets = budgetsApi.endpoints.getBudgets.select(period)(state).data;
        if (cachedCurrentMonthBudgets !== undefined) {
            return cachedCurrentMonthBudgets;
        }
        const legacyBudgets = state.budgets.items as BudgetDetails[];
        return legacyBudgets.filter((budget) =>
            budget.year === period.year && budget.month === period.month,
        );
    });
    const budgetsForPeriod = isLinkedMode ? [] : currentMonthBudgets ?? cachedBudgets;
    const periodRequestKey = `${selectedLinkedUserId ?? "self"}:${period.year}-${period.month}`;
    const currentPeriodTransactions = periodTransactions?.key === periodRequestKey
        ? periodTransactions.items
        : null;

    const focusDrawerTrigger = React.useCallback((preferHeaderFallback = false) => {
        const originalTrigger = drawerTriggerRef.current;
        const connectedOriginalTrigger = originalTrigger?.isConnected ? originalTrigger : null;
        const pageHeadAddButton = document.querySelector<HTMLButtonElement>("button[data-category-add-trigger]");
        const focusTarget = preferHeaderFallback
            ? pageHeadAddButton ?? connectedOriginalTrigger
            : connectedOriginalTrigger ?? pageHeadAddButton;

        focusTarget?.focus({ preventScroll: true });
    }, []);

    const openDrawer = (trigger: HTMLButtonElement, session: CategoryDrawerSession) => {
        drawerTriggerRef.current = trigger;
        restoreFocusAfterRefresh.current = false;
        setDrawerState({
            key: ++drawerSequence.current,
            open: true,
            ownerId: dataOwnerId,
            preferHeaderFallback: false,
            session,
        });
    };

    const openAddDrawer: React.MouseEventHandler<HTMLButtonElement> = (event) =>
        openDrawer(event.currentTarget, { mode: "create" });

    const closeDrawer = (key: number, preferHeaderFallback = false) => {
        setDrawerState((current) => current?.key === key ? { ...current, open: false, preferHeaderFallback } : current);
    };

    const handleCategoryMutation = (key: number, mutation: CategoryMutation) => {
        if (key !== drawerSequence.current) return;
        void categoryMessage.success(t(`categories.formSuccess.${mutation}`));
        restoreFocusAfterRefresh.current = mutation === "update";
        closeDrawer(key, mutation !== "update");
    };

    React.useEffect(() => {
        if (drawerState || !restoreFocusAfterRefresh.current || isFetching) return;
        restoreFocusAfterRefresh.current = false;
        if (!drawerTriggerRef.current?.isConnected && document.activeElement === document.body) {
            focusDrawerTrigger(true);
        }
    }, [drawerState, focusDrawerTrigger, isFetching]);

    React.useEffect(() => {
        let cancelled = false;
        const requestKey = `${selectedLinkedUserId ?? "self"}:${period.year}-${period.month}`;

        fetchPeriodTransactions(period, selectedLinkedUserId)
            .then((transactions) => {
                if (!cancelled) {
                    setPeriodTransactions({ key: requestKey, items: transactions });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setPeriodTransactions({ key: requestKey, items: null });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [period.month, period.year, selectedLinkedUserId]);

    React.useEffect(() => {
        if (selectedLinkedUserId === null) return;

        const { startDate, endDate } = getPeriodQueryDates(period);
        dispatch(fetchCachedRatesForRange(startDate, endDate, selectedLinkedUserId));
    }, [dispatch, period.month, period.year, selectedLinkedUserId]);

    React.useEffect(() => {
        setDrawerState(null);
        drawerSequence.current += 1;
        restoreFocusAfterRefresh.current = false;
    }, [dataOwnerId, isLinkedMode]);

    React.useEffect(() => {
        let cancelled = false;

        apiClient.get<CurrencyOption[]>("/currencies")
            .then(({ data }) => {
                if (!cancelled) {
                    setCurrencies(data);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setCurrencies([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredCategories = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        const scope = activeOnly
            ? categories.filter((category) => category.isEnabled)
            : categories;

        if (!query) {
            return scope;
        }

        const matched = scope.filter((category) =>
            category.name.toLowerCase().includes(query),
        );

        return includeAncestorCategories(matched, categories);
    }, [activeOnly, categories, search]);

    const treeRows = React.useMemo(
        () => flattenCategoryTree(buildCategoriesTree(filteredCategories)),
        [filteredCategories],
    );
    const hasSearch = search.trim().length > 0;
    const visibleTreeRows = React.useMemo(
        () => hasSearch ? treeRows : filterCollapsedCategoryTree(treeRows, collapsedCategoryIds),
        [collapsedCategoryIds, hasSearch, treeRows],
    );

    const categoryStats = React.useMemo(
        () =>
            computeCategorySpendStats({
                categories,
                transactions: currentPeriodTransactions,
                exchangeRates,
                baseCurrency,
                now: new Date(period.year, period.month - 1, 1),
            }),
        [baseCurrency, categories, currentPeriodTransactions, exchangeRates, period.month, period.year],
    );

    const periodLabel = React.useMemo(
        () =>
            new Intl.DateTimeFormat(i18n.language, {
                month: "long",
                year: "numeric",
            }).format(new Date(categoryStats.period.year, categoryStats.period.month - 1, 1)),
        [categoryStats.period.month, categoryStats.period.year, i18n.language],
    );
    const budgetByCategoryId = React.useMemo(
        () => buildBudgetCategoryIndex(budgetsForPeriod, categoryStats.period, categories),
        [budgetsForPeriod, categories, categoryStats.period],
    );

    const openedCategory = drawerState?.session.mode === "edit" ? drawerState.session.category : undefined;
    const snapshot = React.useMemo<CategorySnapshot | undefined>(() => {
        if (!openedCategory || isLinkedMode || drawerState?.ownerId !== dataOwnerId) return;
        const income = getCategoryIncomeSnapshot(
            openedCategory, categories, currentPeriodTransactions, categoryStats.period, baseCurrency, exchangeRates,
        );
        const spend = categoryStats.byCategoryId.get(openedCategory.id);
        return {
            kind: income ? "income" : "expense",
            amount: income ? income.amount : spend?.totalSpend ?? null,
            transactionCount: income?.transactionCount ?? spend?.transactionCount ?? 0,
            budget: budgetByCategoryId.get(openedCategory.id),
            periodLabel,
            currency: categoryStats.currency,
        };
    }, [
        baseCurrency, budgetByCategoryId, categories, categoryStats, currentPeriodTransactions, dataOwnerId,
        drawerState?.ownerId, exchangeRates, isLinkedMode, openedCategory, periodLabel,
    ]);

    const bySpendRows = React.useMemo(() => {
        return sortLeafCategoriesBySpend(filteredCategories, categories, categoryStats)
            .map((category) => ({
                category: {
                    ...category,
                    children: [],
                },
                depth: 0,
                hasChildren: false,
            }));
    }, [categories, categoryStats, filteredCategories]);

    const rows = view === "tree" ? visibleTreeRows : bySpendRows;
    const showInitialLoading = isLoading && categories.length === 0;
    const showFullError = isError && categories.length === 0;
    const showPartialError = isError && categories.length > 0;
    const showFirstUseEmpty = !showInitialLoading && !showFullError && categories.length === 0;
    const showFilterEmpty =
        !showInitialLoading && categories.length > 0 && filteredCategories.length === 0;
    const showRowsEmpty =
        !showInitialLoading && categories.length > 0 && filteredCategories.length > 0 && rows.length === 0;

    const clearFilters = () => {
        setSearch("");
        setActiveOnly(false);
    };

    const toggleBranch = React.useCallback((categoryId: number) => {
        const nodeId = String(categoryId);
        setCollapsedCategoryIds((current) => {
            const next = new Set(current);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    }, []);

    const pageExtra = !isLinkedMode ? (
        <InExButton
            aria-haspopup="dialog"
            data-category-add-trigger=""
            kind="primary"
            icon={<Plus size={16} aria-hidden="true" />}
            onClick={openAddDrawer}
            style={{ width: "100%" }}
        >
            {t("categories.addCategory")}
        </InExButton>
    ) : undefined;

    const renderRows = (items: typeof rows) => items.map(({ category, depth, hasChildren }) => (
        <CategoryRow
            key={category.id}
            category={category}
            depth={depth}
            hasChildren={view === "tree" && hasChildren}
            isCollapsed={collapsedCategoryIds.has(String(category.id))}
            readOnly={isLinkedMode}
            paletteColor={categoryPaletteColor(category, categories)}
            periodLabel={periodLabel}
            stats={categoryStats.byCategoryId.get(category.id)}
            statsAvailable={categoryStats.available}
            budget={budgetByCategoryId.get(category.id)}
            currency={categoryStats.currency}
            onEdit={(event) => openDrawer(event.currentTarget, { mode: "edit", category })}
            onBranchToggle={() => toggleBranch(category.id)}
        />
    ));

    return (
        <React.Fragment>
            {messageHolder}
            {drawerState && !isLinkedMode && drawerState.ownerId === dataOwnerId && (
                <CategoryDrawer
                    key={drawerState.key}
                    session={drawerState.session}
                    open={drawerState.open}
                    allCategories={categories}
                    snapshot={snapshot}
                    onClose={() => closeDrawer(drawerState.key)}
                    afterOpenChange={(open) => {
                        if (open || drawerState.open || drawerState.key !== drawerSequence.current) return;
                        setDrawerState(null);
                        // The Drawer restores its own trigger after this callback.
                        window.setTimeout(() => {
                            if (drawerState.key === drawerSequence.current) {
                                focusDrawerTrigger(drawerState.preferHeaderFallback);
                            }
                        }, 0);
                    }}
                    onMutationSuccess={(mutation) => handleCategoryMutation(drawerState.key, mutation)}
                />
            )}
            <BasicPage
                frame="management"
                title={t("categories.title")}
                subtitle={t("categories.subtitle")}
                extra={pageExtra}
            >
                <div className="categories-workspace">
                    {isLinkedMode ? (
                        <Alert
                            className="categories-alert"
                            message={t("linkedAccount.readOnly", {
                                username: selectedLinkedAccount?.username ?? "",
                            })}
                            showIcon
                            type="info"
                        />
                    ) : null}
                    {!showFirstUseEmpty && !showFullError ? (
                        <React.Fragment>
                            <CategoriesHero
                                categories={categories}
                                loading={showInitialLoading}
                                periodLabel={periodLabel}
                                stats={categoryStats}
                            />
                        </React.Fragment>
                    ) : null}
                    {showPartialError ? (
                        <Alert
                            className="categories-alert"
                            type="warning"
                            showIcon
                            message={t("categories.error.partialFailure")}
                            action={
                                <InExButton kind="ghost" size="sm" onClick={() => refetch()}>
                                    {t("categories.error.retry")}
                                </InExButton>
                            }
                        />
                    ) : null}
                    {showFullError ? (
                        <EmptyState
                            iconNode={<FolderTree size={30} />}
                            title={t("categories.error.loadFailed")}
                            description={t("categories.error.loadFailedDescription")}
                            actions={
                                <InExButton kind="primary" onClick={() => refetch()}>
                                    {t("categories.error.retry")}
                                </InExButton>
                            }
                        />
                    ) : null}
                    {showFirstUseEmpty ? (
                        <EmptyState
                            iconNode={<FolderTree size={30} />}
                            title={t("categories.emptyState.title")}
                            description={isLinkedMode
                                ? t("linkedAccount.readOnly", { username: selectedLinkedAccount?.username ?? "" })
                                : t("categories.emptyState.description")}
                            actions={!isLinkedMode ? (
                                <InExButton
                                    aria-haspopup="dialog"
                                    kind="primary"
                                    icon={<Plus size={16} aria-hidden="true" />}
                                    onClick={openAddDrawer}
                                >
                                    {t("categories.emptyState.addManually")}
                                </InExButton>
                            ) : undefined}
                        />
                    ) : null}
                    {!showFullError && !showFirstUseEmpty ? (
                        <ListPanel
                            ariaLabel={t("categories.listTitle")}
                            className="categories-list"
                        >
                            <CategoriesToolbar
                                total={categories.length}
                                visible={filteredCategories.length}
                                activeOnly={activeOnly}
                                view={view}
                                search={search}
                                refreshing={isFetching && categories.length > 0}
                                onActiveOnlyChange={setActiveOnly}
                                onViewChange={setView}
                                onSearchChange={setSearch}
                            />
                            <ListPanelColumnHeader
                                columns={[
                                    t("categories.category"),
                                    t("categories.snapshot.spend"),
                                    t("categories.activity.title"),
                                ]}
                            />
                            {showInitialLoading ? (
                                <div
                                    className="categories-loading"
                                    aria-label={t("categories.loading.initial")}
                                >
                                    <span />
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            ) : null}
                            {showFilterEmpty || showRowsEmpty ? (
                                <ListPanelNoMatchRow
                                    message={t("categories.filterEmpty.title")}
                                    action={
                                        <InExButton kind="ghost" size="sm" onClick={clearFilters}>
                                            {t("categories.filterEmpty.clear")}
                                        </InExButton>
                                    }
                                />
                            ) : null}
                            {!showInitialLoading && !showFilterEmpty && !showRowsEmpty ? renderRows(rows) : null}
                        </ListPanel>
                    ) : null}
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Categories;
