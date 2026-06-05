import * as React from "react";
import { Alert } from "antd";
import { FolderTree, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
    EmptyState,
    FilterEmpty,
    InExButton,
    InExDrawer,
} from "../components/primitives";
import BasicPage from "../layouts/BasicPage";
import type { BudgetDetails } from "../model/Budget/BudgetDetails";
import type { TransactionResponse } from "../model/Transaction/TransactionResponse";
import { budgetsApi } from "../store/budgets/budgets-api";
import type { CategoryResponse } from "../store/categories/categories-api";
import { useGetCategoriesQuery } from "../store/categories/categories-api";
import type { RootState } from "../store";
import { useAppSelector } from "../store/hooks";
import CategoryCreateForm from "./Categories/CategoryCreateForm";
import { CategoryInlineEdit } from "./Categories/CategoryInlineEdit";
import { CategoryRow } from "./Categories/CategoryRow";
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
    flattenCategoryTree,
    hasChildCategories,
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

interface TransactionQueryArgs {
    page: number;
    filter: {
        accountIds: number[];
        categoryIds: number[];
        tags: string[];
        refs: string[];
        range: number[];
    };
}

const isTransactionsPagedData = (value: unknown): value is TransactionsPagedData =>
    isRecord(value) &&
    Array.isArray(value.data) &&
    value.data.every(isTransactionResponse) &&
    isRecord(value.metadata) &&
    typeof value.metadata.totalItems === "number";

const isTransactionQueryArgs = (value: unknown): value is TransactionQueryArgs =>
    isRecord(value) &&
    typeof value.page === "number" &&
    isRecord(value.filter) &&
    Array.isArray(value.filter.accountIds) &&
    Array.isArray(value.filter.categoryIds) &&
    Array.isArray(value.filter.tags) &&
    Array.isArray(value.filter.refs) &&
    Array.isArray(value.filter.range);

const getPeriodBounds = ({ year, month }: CategoryPeriod) => ({
    start: new Date(year, month - 1, 1).getTime() / 1000,
    end: new Date(year, month, 0, 23, 59, 59).getTime() / 1000,
});

const isUnfilteredPeriodCoveringQuery = (
    args: TransactionQueryArgs,
    period: CategoryPeriod,
) => {
    const { filter } = args;
    const hasServerFilters =
        filter.accountIds.length > 0 ||
        filter.categoryIds.length > 0 ||
        filter.tags.length > 0 ||
        filter.refs.length > 0;
    if (hasServerFilters) return false;

    if (filter.range.length === 0) return true;
    if (filter.range.length !== 2) return false;

    const [start, end] = filter.range;
    if (typeof start !== "number" || typeof end !== "number" || start <= 0 || end <= 0) {
        return false;
    }

    const periodBounds = getPeriodBounds(period);
    return start <= periodBounds.start && end >= periodBounds.end;
};

const makeTransactionCacheKey = (args: TransactionQueryArgs) =>
    JSON.stringify({
        accountIds: args.filter.accountIds,
        categoryIds: args.filter.categoryIds,
        tags: args.filter.tags,
        refs: args.filter.refs,
        range: args.filter.range,
    });

const selectCachedTransactions = (
    queries: RootState["transactionsApi"]["queries"],
    period: CategoryPeriod,
) => {
    const groups = new Map<string, {
        ids: Set<number>;
        transactions: TransactionResponse[];
        totalItems: number;
    }>();

    Object.values(queries).forEach((query) => {
        const data = query?.data;
        const originalArgs = query?.originalArgs;
        if (!isTransactionsPagedData(data) || !isTransactionQueryArgs(originalArgs)) {
            return;
        }
        if (!isUnfilteredPeriodCoveringQuery(originalArgs, period)) {
            return;
        }

        const key = makeTransactionCacheKey(originalArgs);
        const group = groups.get(key) ?? {
            ids: new Set<number>(),
            transactions: [],
            totalItems: data.metadata.totalItems,
        };
        group.totalItems = Math.max(group.totalItems, data.metadata.totalItems);
        data.data.forEach((transaction) => {
            if (!group.ids.has(transaction.id)) {
                group.ids.add(transaction.id);
                group.transactions.push(transaction);
            }
        });
        groups.set(key, group);
    });

    const completeGroups = Array.from(groups.values())
        .filter((group) => group.totalItems === 0 || group.ids.size >= group.totalItems)
        .sort((left, right) => left.totalItems - right.totalItems);

    return completeGroups[0]?.transactions ?? null;
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
    const [addOpen, setAddOpen] = React.useState(false);
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [view, setView] = React.useState<CategoriesViewMode>("tree");
    const [expandedId, setExpandedId] = React.useState<number | null>(null);
    const [createError, setCreateError] = React.useState<string | null>(null);
    const period = useCurrentPeriod();

    const {
        data: categories = [],
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useGetCategoriesQuery("ALL");
    const cachedTransactions = useAppSelector((state) =>
        selectCachedTransactions(state.transactionsApi.queries, period),
    );
    const exchangeRates = useAppSelector((state) => state.rates.items);
    const cachedBudgets = useAppSelector((state) => {
        const currentMonthBudgets = budgetsApi.endpoints.getBudgets.select(period)(state).data;
        if (currentMonthBudgets !== undefined) {
            return currentMonthBudgets;
        }
        const legacyBudgets = state.budgets.items as BudgetDetails[];
        return legacyBudgets.filter((budget) =>
            budget.year === period.year && budget.month === period.month,
        );
    });

    React.useEffect(() => {
        if (expandedId != null && !categories.some((category) => category.id === expandedId)) {
            setExpandedId(null);
        }
    }, [categories, expandedId]);

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

    const categoryStats = React.useMemo(
        () =>
            computeCategorySpendStats({
                categories,
                transactions: cachedTransactions,
                exchangeRates,
                now: new Date(period.year, period.month - 1, 1),
            }),
        [cachedTransactions, categories, exchangeRates, period.month, period.year],
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
        () => buildBudgetCategoryIndex(cachedBudgets, categoryStats.period),
        [cachedBudgets, categoryStats.period],
    );

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

    const rows = view === "tree" ? treeRows : bySpendRows;
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

    const renderRows = (items: typeof rows) =>
        items.map(({ category, depth, hasChildren }) => {
            const expanded = expandedId === category.id;
            return (
                <React.Fragment key={category.id}>
                    <CategoryRow
                        category={category}
                        depth={depth}
                        hasChildren={hasChildren || hasChildCategories(category, categories)}
                        expanded={expanded}
                        paletteColor={categoryPaletteColor(category, categories)}
                        periodLabel={periodLabel}
                        stats={categoryStats.byCategoryId.get(category.id)}
                        statsAvailable={categoryStats.available}
                        budget={budgetByCategoryId.get(category.id)}
                        currency={categoryStats.currency}
                        onToggle={() => setExpandedId(expanded ? null : category.id)}
                    />
                    {expanded ? (
                        <CategoryInlineEdit
                            category={category}
                            allCategories={categories}
                            stats={categoryStats.byCategoryId.get(category.id)}
                            statsAvailable={categoryStats.available}
                            budget={budgetByCategoryId.get(category.id)}
                            currency={categoryStats.currency}
                            periodLabel={periodLabel}
                            onClose={() => setExpandedId(null)}
                        />
                    ) : null}
                </React.Fragment>
            );
        });

    return (
        <React.Fragment>
            <InExDrawer
                title={t("categories.addDrawerTitle")}
                subtitle={t("categories.addDrawerSubtitle")}
                open={addOpen}
                onClose={() => {
                    setAddOpen(false);
                    setCreateError(null);
                }}
            >
                {createError ? (
                    <Alert
                        className="categories-alert"
                        type="error"
                        showIcon
                        message={createError}
                    />
                ) : null}
                <CategoryCreateForm
                    onCreated={() => {
                        setAddOpen(false);
                        setCreateError(null);
                    }}
                    onError={() => setCreateError(t("categories.formErrors.createFailed"))}
                />
            </InExDrawer>
            <BasicPage
                title={t("categories.title")}
                subtitle={t("categories.subtitle")}
            >
                <div className="categories-workspace">
                    {!showFirstUseEmpty && !showFullError ? (
                        <React.Fragment>
                            <CategoriesHero
                                categories={categories}
                                loading={showInitialLoading}
                                periodLabel={periodLabel}
                                stats={categoryStats}
                            />
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
                                onAdd={() => setAddOpen(true)}
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
                            description={t("categories.emptyState.description")}
                            actions={
                                <InExButton
                                    kind="primary"
                                    icon={<Plus size={16} aria-hidden="true" />}
                                    onClick={() => setAddOpen(true)}
                                >
                                    {t("categories.emptyState.addManually")}
                                </InExButton>
                            }
                        />
                    ) : null}
                    {!showFullError && !showFirstUseEmpty ? (
                        <section className="categories-list">
                            <div className="categories-list__header">
                                <span>{t("categories.category")}</span>
                                <span>{t("categories.activity.title")}</span>
                                <span>{t("categories.snapshot.spend")}</span>
                                <span />
                            </div>
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
                                <FilterEmpty
                                    title={t("categories.filterEmpty.title")}
                                    description={t("categories.filterEmpty.description")}
                                    onClear={clearFilters}
                                />
                            ) : null}
                            {!showInitialLoading && !showFilterEmpty && !showRowsEmpty ? renderRows(rows) : null}
                        </section>
                    ) : null}
                </div>
            </BasicPage>
        </React.Fragment>
    );
};

export default Categories;
