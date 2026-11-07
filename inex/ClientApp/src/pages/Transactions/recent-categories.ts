import dayjs, { type Dayjs } from "dayjs";

import type { CategoryDetails } from "../../model/Category/CategoryDetails";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import { TransactionType } from "../../model/Transaction/TransactionType";

export const eligibleRecentCategories = (categories: CategoryDetails[]): CategoryDetails[] =>
    categories.flatMap(category => {
        if (!category.isEnabled || category.isSystem || category.id <= 0) return [];
        return category.children?.length ? eligibleRecentCategories(category.children) : [category];
    });

export const rankRecentCategories = (
    categories: CategoryDetails[],
    transactions: TransactionResponse[],
    mode: TransactionType,
    today: Dayjs = dayjs(),
): CategoryDetails[] => {
    if (mode !== TransactionType.EXPENSE && mode !== TransactionType.INCOME) return [];
    const eligible = new Map(eligibleRecentCategories(categories).map(category => [category.id, category]));
    const start = today.startOf("day").subtract(29, "day").valueOf();
    const end = today.endOf("day").valueOf();
    const usage = new Map<number, { count: number; latest: number }>();

    for (const transaction of transactions) {
        if (!eligible.has(transaction.categoryId)) continue;
        if (!Number.isFinite(transaction.amount)) continue;
        if (mode === TransactionType.EXPENSE ? transaction.amount >= 0 : transaction.amount <= 0) continue;
        const created = dayjs(transaction.created).valueOf();
        if (!Number.isFinite(created) || created < start || created > end) continue;
        const previous = usage.get(transaction.categoryId);
        usage.set(transaction.categoryId, {
            count: (previous?.count ?? 0) + 1,
            latest: Math.max(previous?.latest ?? created, created),
        });
    }

    return [...usage.entries()]
        .sort(([leftId, left], [rightId, right]) =>
            right.count - left.count || right.latest - left.latest || leftId - rightId)
        .slice(0, 3)
        .flatMap(([id]) => {
            const category = eligible.get(id);
            return category ? [category] : [];
        });
};
