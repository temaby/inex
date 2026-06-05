import { describe, expect, it } from "vitest";

import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import type { CategoryResponse } from "../../store/categories/categories-api";
import {
    buildBudgetCategoryIndex,
    computeCategorySpendStats,
    sortLeafCategoriesBySpend,
} from "./categories.utils";

const category = (
    id: number,
    name: string,
    parentId: number | null = null,
    isSystem = false,
): CategoryResponse => ({
    id,
    key: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    description: null,
    parentId,
    isEnabled: true,
    isSystem,
    systemCode: isSystem ? "transfer" : null,
});

const transaction = (
    id: number,
    categoryId: number,
    amount: number,
    created: string,
    accountCurrency = "USD",
): TransactionResponse => ({
    id,
    accountId: 1,
    categoryId,
    created,
    amount,
    comment: null,
    tags: [],
    refs: [],
    accountCurrency,
});

describe("category spend utilities", () => {
    it("computes current-month expense stats and rolls child spend up to parents", () => {
        const categories = [
            category(1, "Food"),
            category(2, "Groceries", 1),
            category(3, "Restaurants", 1),
            category(4, "Home"),
            category(5, "Transfer", null, true),
        ];

        const stats = computeCategorySpendStats({
            categories,
            transactions: [
                transaction(101, 2, -40, "2026-06-02T08:00:00Z"),
                transaction(102, 3, -25, "2026-06-04T08:00:00Z"),
                transaction(103, 4, -10, "2026-06-03T08:00:00Z", "EUR"),
                transaction(104, 2, 100, "2026-06-03T08:00:00Z"),
                transaction(105, 5, -99, "2026-06-03T08:00:00Z"),
                transaction(106, 2, -80, "2026-05-20T08:00:00Z"),
            ],
            exchangeRates: [{ currencyFrom: "USD", currencyTo: "EUR", rate: 2 }],
            now: "2026-06-05T12:00:00Z",
        });

        expect(stats.available).toBe(true);
        expect(stats.totalSpend).toBe(70);
        expect(stats.currency).toBe("USD");
        expect(stats.byCategoryId.get(2)).toMatchObject({
            transactionCount: 1,
            totalSpend: 40,
            lastActiveDate: "2026-06-02T08:00:00Z",
        });
        expect(stats.byCategoryId.get(1)).toMatchObject({
            transactionCount: 2,
            totalSpend: 65,
            lastActiveDate: "2026-06-04T08:00:00Z",
        });
        expect(stats.topParent?.name).toBe("Food");
        expect(stats.topParentSpend).toBe(65);
    });

    it("builds top-five distribution plus Other from parent spend", () => {
        const categories = [
            category(1, "P1"),
            category(2, "P2"),
            category(3, "P3"),
            category(4, "P4"),
            category(5, "P5"),
            category(6, "P6"),
        ];
        const transactions = categories.map((item, index) =>
            transaction(index + 1, item.id, -(index + 1), "2026-06-01T08:00:00Z"),
        );

        const stats = computeCategorySpendStats({
            categories,
            transactions,
            exchangeRates: [],
            now: "2026-06-05T12:00:00Z",
        });

        expect(stats.distribution.map((item) => item.label)).toEqual([
            "P6",
            "P5",
            "P4",
            "P3",
            "P2",
            "Other",
        ]);
        expect(stats.distribution[stats.distribution.length - 1]?.value).toBe(1);
    });

    it("sorts leaf categories by spend while keeping zero-spend rows stable at the end", () => {
        const categories = [
            category(1, "Parent"),
            category(2, "Zero A", 1),
            category(3, "Spent B", 1),
            category(4, "Spent A", 1),
            category(5, "Zero B", 1),
        ];
        const stats = computeCategorySpendStats({
            categories,
            transactions: [
                transaction(1, 4, -20, "2026-06-01T08:00:00Z"),
                transaction(2, 3, -30, "2026-06-01T08:00:00Z"),
            ],
            exchangeRates: [],
            now: "2026-06-05T12:00:00Z",
        });

        expect(sortLeafCategoriesBySpend(categories.slice(1), categories, stats).map((item) => item.name)).toEqual([
            "Spent B",
            "Spent A",
            "Zero A",
            "Zero B",
        ]);
    });

    it("marks spend unavailable instead of undercounting when exchange rates are missing", () => {
        const categories = [category(1, "Travel")];

        const stats = computeCategorySpendStats({
            categories,
            transactions: [transaction(1, 1, -50, "2026-06-01T08:00:00Z", "EUR")],
            exchangeRates: [],
            now: "2026-06-05T12:00:00Z",
        });

        expect(stats.available).toBe(false);
        expect(stats.totalSpend).toBe(0);
        expect(stats.distribution).toEqual([]);
    });

    it("indexes only current-month budget links by category", () => {
        const budget = (
            id: number,
            month: number,
            categoryIds: number[],
        ): BudgetDetails => ({
            id,
            key: `budget-${id}`,
            name: `Budget ${id}`,
            description: "",
            value: 100,
            categoryIds,
            year: 2026,
            month,
        });

        const index = buildBudgetCategoryIndex(
            [budget(1, 6, [2, 3]), budget(2, 5, [4])],
            { year: 2026, month: 6 },
        );

        expect(index.get(2)?.name).toBe("Budget 1");
        expect(index.get(3)?.name).toBe("Budget 1");
        expect(index.has(4)).toBe(false);
    });

    it("inherits nearest parent budget links for descendants without overriding direct child budgets", () => {
        const categories = [
            category(1, "Food"),
            category(2, "Groceries", 1),
            category(3, "Dining", 1),
            category(4, "Snacks", 2),
        ];
        const budget = (
            id: number,
            categoryIds: number[],
        ): BudgetDetails => ({
            id,
            key: `budget-${id}`,
            name: `Budget ${id}`,
            description: "",
            value: 100,
            categoryIds,
            year: 2026,
            month: 6,
        });

        const index = buildBudgetCategoryIndex(
            [budget(1, [1]), budget(2, [2]), budget(3, [3])],
            { year: 2026, month: 6 },
            categories,
        );

        expect(index.get(1)?.name).toBe("Budget 1");
        expect(index.get(2)?.name).toBe("Budget 2");
        expect(index.get(3)?.name).toBe("Budget 3");
        expect(index.get(4)?.name).toBe("Budget 2");
    });
});
