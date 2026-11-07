import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { createCategoryDetails } from "../../model/Category/CategoryDetails";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import { TransactionType } from "../../model/Transaction/TransactionType";
import { rankRecentCategories } from "./recent-categories";

const today = dayjs("2026-11-07");
const category = (id: number) => createCategoryDetails({ id, name: `Category ${id}`, isEnabled: true });
const posting = (categoryId: number, created = "2026-11-07", amount = -10): TransactionResponse => ({
    id: categoryId, categoryId, created, amount, accountId: 1, accountCurrency: "PLN", comment: null, tags: [], refs: [],
});

describe("recent category ranking", () => {
    it("ranks frequency before recency, breaks ties by ID, and returns at most three", () => {
        const result = rankRecentCategories([1, 2, 3, 4].map(category), [
            posting(1, "2026-10-20"), posting(1, "2026-10-20"),
            posting(2, "2026-11-07"), posting(3, "2026-11-07"), posting(4, "2026-11-06"),
        ], TransactionType.EXPENSE, today);
        expect(result.map(item => item.id)).toEqual([1, 2, 3]);
    });

    it("uses separate expense and income histories without recommending zero amounts", () => {
        const categories = [category(1), category(2), category(3)];
        const history = [posting(1), posting(2, undefined, 10), posting(3, undefined, 0)];
        expect(rankRecentCategories(categories, history, TransactionType.EXPENSE, today).map(item => item.id)).toEqual([1]);
        expect(rankRecentCategories(categories, history, TransactionType.INCOME, today).map(item => item.id)).toEqual([2]);
        expect(rankRecentCategories(categories, history, TransactionType.TRANSFER, today)).toEqual([]);
        expect(rankRecentCategories(categories, history, TransactionType.CORRECTION, today)).toEqual([]);
        expect(rankRecentCategories(categories, history, TransactionType.INTERNAL_TRANSFER, today)).toEqual([]);
    });

    it("includes today and the preceding 29 dates, excluding older, future and malformed dates", () => {
        const result = rankRecentCategories([1, 2, 3, 4, 5].map(category), [
            posting(1, "2026-10-09"), posting(2, "2026-11-07T23:59:59"),
            posting(3, "2026-10-08"), posting(4, "2026-11-08"), posting(5, "invalid"),
        ], TransactionType.EXPENSE, today);
        expect(result.map(item => item.id)).toEqual([2, 1]);
    });

    it("recommends enabled ordinary leaves and excludes unavailable categories and branches", () => {
        const categories = [
            { ...category(1), children: [category(2)] },
            { ...category(3), isEnabled: false },
            { ...category(4), isSystem: true },
            { ...category(5), isEnabled: false, children: [category(6)] },
        ];
        const result = rankRecentCategories(categories, [1, 2, 3, 4, 5, 6, 999].map(id => posting(id)), TransactionType.EXPENSE, today);
        expect(result).toEqual([categories[0].children[0]]);
    });

    it("returns an empty recommendation set without eligible history", () => {
        expect(rankRecentCategories([category(1)], [], TransactionType.EXPENSE, today)).toEqual([]);
        expect(rankRecentCategories([], [posting(1)], TransactionType.EXPENSE, today)).toEqual([]);
    });
});
