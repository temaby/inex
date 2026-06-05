import type { CategoryResponse } from "../../store/categories/categories-api";
import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";

export type CategoryNode = CategoryResponse & {
    children: CategoryNode[];
};

export interface FlattenedCategoryNode {
    category: CategoryNode;
    depth: number;
    hasChildren: boolean;
}

export interface CategoryPeriod {
    year: number;
    month: number;
}

export interface CategoryExchangeRate {
    currencyFrom: string;
    currencyTo: string;
    rate: number;
}

export interface CategorySpendStat {
    categoryId: number;
    transactionCount: number;
    totalSpend: number;
    lastActiveDate: string | null;
}

export interface CategoryDistributionItem {
    key: string;
    label: string;
    value: number;
    share: number;
}

export interface CategorySpendStats {
    available: boolean;
    byCategoryId: Map<number, CategorySpendStat>;
    currency: string;
    distribution: CategoryDistributionItem[];
    period: CategoryPeriod;
    totalSpend: number;
    topParent: CategoryResponse | null;
    topParentSpend: number;
}

interface ComputeCategorySpendStatsArgs {
    categories: CategoryResponse[];
    transactions: TransactionResponse[] | null;
    exchangeRates: CategoryExchangeRate[];
    now?: string | Date;
}

const PALETTE = [
    "#1D4ED8",
    "#0F766E",
    "#9333EA",
    "#DB2777",
    "#EA580C",
    "#65A30D",
    "#475569",
    "#7C3AED",
];

export const isSystemCategory = (category: CategoryResponse): boolean =>
    category.isSystem || Boolean(category.systemCode);

export const buildCategoriesTree = (items: CategoryResponse[]): CategoryNode[] => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const attached = new Set<number>();
    const attach = (item: CategoryResponse, trail: Set<number>): CategoryNode => {
        if (trail.has(item.id)) {
            return { ...item, children: [] };
        }

        const nextTrail = new Set(trail);
        nextTrail.add(item.id);
        attached.add(item.id);

        return {
            ...item,
            children: items
                .filter((child) => child.parentId === item.id && child.id !== item.id)
                .map((child) => attach(child, nextTrail)),
        };
    };

    const rootItems = items.filter(
        (item) => item.parentId == null || !byId.has(item.parentId) || item.parentId === item.id,
    );
    const roots = rootItems.map((item) => attach(item, new Set<number>()));

    items.forEach((item) => {
        if (!attached.has(item.id)) {
            roots.push(attach(item, new Set<number>()));
        }
    });

    const userRoots = roots.filter((root) => !isSystemCategory(root));
    const systemRoots = roots.filter((root) => isSystemCategory(root));

    return [...userRoots, ...systemRoots];
};

export const flattenCategoryTree = (
    nodes: CategoryNode[],
    depth = 0,
): FlattenedCategoryNode[] =>
    nodes.flatMap((node) => [
        {
            category: node,
            depth,
            hasChildren: node.children.length > 0,
        },
        ...flattenCategoryTree(node.children, depth + 1),
    ]);

export const includeAncestorCategories = (
    matched: CategoryResponse[],
    all: CategoryResponse[],
): CategoryResponse[] => {
    const byId = new Map(all.map((category) => [category.id, category]));
    const resultIds = new Set(matched.map((category) => category.id));

    matched.forEach((item) => {
        let current: CategoryResponse | undefined = item;
        while (current?.parentId != null) {
            current = byId.get(current.parentId);
            if (!current || resultIds.has(current.id)) {
                break;
            }
            resultIds.add(current.id);
        }
    });

    return all.filter((category) => resultIds.has(category.id));
};

export const categoryPaletteColor = (
    category: CategoryResponse,
    allItems: CategoryResponse[],
): string => {
    const rootId = findRootCategory(category, allItems).id;
    const roots = allItems.filter(
        (item) => item.parentId == null && !isSystemCategory(item),
    );
    const index = roots.findIndex((root) => root.id === rootId);
    return PALETTE[Math.max(0, index) % PALETTE.length];
};

export const findRootCategory = (
    category: CategoryResponse,
    allItems: CategoryResponse[],
): CategoryResponse => {
    const byId = new Map(allItems.map((item) => [item.id, item]));
    let current = category;

    while (current.parentId != null && byId.has(current.parentId)) {
        current = byId.get(current.parentId) ?? current;
    }

    return current;
};

export const hasChildCategories = (
    category: CategoryResponse,
    allItems: CategoryResponse[],
): boolean => allItems.some((item) => item.parentId === category.id);

const getBaseCurrency = (exchangeRates: CategoryExchangeRate[]): string =>
    exchangeRates[0]?.currencyFrom || "USD";

const sameCurrency = (left: string, right: string): boolean =>
    left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;

const toBaseCurrencyAmount = (
    amount: number,
    accountCurrency: string,
    exchangeRates: CategoryExchangeRate[],
): number | null => {
    const baseCurrency = getBaseCurrency(exchangeRates);

    if (sameCurrency(accountCurrency, baseCurrency)) {
        return amount;
    }

    const rate = exchangeRates.find((item) =>
        sameCurrency(item.currencyFrom, baseCurrency) && sameCurrency(item.currencyTo, accountCurrency),
    );
    if (!rate || !Number.isFinite(rate.rate) || rate.rate <= 0) {
        return null;
    }

    return amount / rate.rate;
};

const getCurrentPeriod = (now: string | Date = new Date()): CategoryPeriod => {
    const date = new Date(now);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
    };
};

const isInPeriod = (value: string, period: CategoryPeriod): boolean => {
    const date = new Date(value);
    return date.getFullYear() === period.year && date.getMonth() + 1 === period.month;
};

const isExpenseTransaction = (
    transaction: TransactionResponse,
    category: CategoryResponse | undefined,
): boolean => {
    if (!category || isSystemCategory(category)) {
        return false;
    }

    return transaction.amount < 0;
};

const createEmptySpendStat = (categoryId: number): CategorySpendStat => ({
    categoryId,
    transactionCount: 0,
    totalSpend: 0,
    lastActiveDate: null,
});

const addSpendToCategory = (
    stat: CategorySpendStat,
    spend: number,
    transactionDate: string,
): CategorySpendStat => ({
    ...stat,
    transactionCount: stat.transactionCount + 1,
    totalSpend: stat.totalSpend + spend,
    lastActiveDate:
        stat.lastActiveDate == null || new Date(transactionDate) > new Date(stat.lastActiveDate)
            ? transactionDate
            : stat.lastActiveDate,
});

export const computeCategorySpendStats = ({
    categories,
    transactions,
    exchangeRates,
    now,
}: ComputeCategorySpendStatsArgs): CategorySpendStats => {
    const period = getCurrentPeriod(now);
    const byCategoryId = new Map(
        categories.map((category) => [category.id, createEmptySpendStat(category.id)]),
    );
    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const currency = getBaseCurrency(exchangeRates);

    if (transactions == null) {
        return {
            available: false,
            byCategoryId,
            currency,
            distribution: [],
            period,
            totalSpend: 0,
            topParent: null,
            topParentSpend: 0,
        };
    }

    let hasConversionMiss = false;

    transactions.forEach((transaction) => {
        const category = categoriesById.get(transaction.categoryId);

        if (!isInPeriod(transaction.created, period) || !isExpenseTransaction(transaction, category)) {
            return;
        }

        const baseAmount = toBaseCurrencyAmount(
            transaction.amount,
            transaction.accountCurrency,
            exchangeRates,
        );

        if (baseAmount == null) {
            hasConversionMiss = true;
            return;
        }

        const spend = Math.abs(baseAmount);
        let current = category;
        const visited = new Set<number>();

        while (current && !visited.has(current.id)) {
            const existing = byCategoryId.get(current.id) ?? createEmptySpendStat(current.id);
            byCategoryId.set(current.id, addSpendToCategory(existing, spend, transaction.created));
            visited.add(current.id);
            current = current.parentId == null ? undefined : categoriesById.get(current.parentId);
        }
    });

    if (hasConversionMiss) {
        return {
            available: false,
            byCategoryId,
            currency,
            distribution: [],
            period,
            totalSpend: 0,
            topParent: null,
            topParentSpend: 0,
        };
    }

    const parentCategories = categories.filter(
        (category) => category.parentId == null && !isSystemCategory(category),
    );
    const sortedParents = parentCategories
        .map((category, index) => ({
            category,
            index,
            spend: byCategoryId.get(category.id)?.totalSpend ?? 0,
        }))
        .filter((item) => item.spend > 0)
        .sort((left, right) => right.spend - left.spend || left.index - right.index);
    const totalSpend = sortedParents.reduce((sum, item) => sum + item.spend, 0);
    const topFive = sortedParents.slice(0, 5);
    const otherSpend = sortedParents.slice(5).reduce((sum, item) => sum + item.spend, 0);
    const distribution: CategoryDistributionItem[] = topFive.map((item) => ({
        key: String(item.category.id),
        label: item.category.name,
        value: item.spend,
        share: totalSpend > 0 ? item.spend / totalSpend : 0,
    }));

    if (otherSpend > 0) {
        distribution.push({
            key: "other",
            label: "Other",
            value: otherSpend,
            share: totalSpend > 0 ? otherSpend / totalSpend : 0,
        });
    }

    return {
        available: true,
        byCategoryId,
        currency,
        distribution,
        period,
        totalSpend,
        topParent: sortedParents[0]?.category ?? null,
        topParentSpend: sortedParents[0]?.spend ?? 0,
    };
};

export const sortLeafCategoriesBySpend = (
    items: CategoryResponse[],
    allItems: CategoryResponse[],
    stats: CategorySpendStats,
): CategoryResponse[] => {
    const childParentIds = new Set(
        allItems
            .map((category) => category.parentId)
            .filter((parentId): parentId is number => parentId != null),
    );

    return items
        .filter((category) => !isSystemCategory(category) && !childParentIds.has(category.id))
        .map((category, index) => ({
            category,
            index,
            spend: stats.byCategoryId.get(category.id)?.totalSpend ?? 0,
        }))
        .sort((left, right) => right.spend - left.spend || left.index - right.index)
        .map((item) => item.category);
};

export const buildBudgetCategoryIndex = (
    budgets: BudgetDetails[],
    period: CategoryPeriod,
    categories: CategoryResponse[] = [],
): Map<number, BudgetDetails> => {
    const directIndex = new Map<number, BudgetDetails>();
    const inheritedIndex = new Map<number, BudgetDetails>();
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    const currentBudgets = budgets.filter(
        (budget) => budget.year === period.year && budget.month === period.month,
    );

    currentBudgets.forEach((budget) => {
        budget.categoryIds.forEach((categoryId) => {
            directIndex.set(categoryId, budget);
        });
    });

    categories.forEach((category) => {
        if (directIndex.has(category.id)) return;

        const visited = new Set<number>([category.id]);
        let parentId = category.parentId;
        while (parentId != null && !visited.has(parentId)) {
            const parentBudget = directIndex.get(parentId);
            if (parentBudget) {
                inheritedIndex.set(category.id, parentBudget);
                break;
            }

            visited.add(parentId);
            parentId = categoriesById.get(parentId)?.parentId ?? null;
        }
    });

    return new Map([...inheritedIndex, ...directIndex]);
};
