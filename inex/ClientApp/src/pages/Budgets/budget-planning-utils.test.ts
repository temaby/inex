import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { createBudgetDetails } from "../../model/Budget/BudgetDetails";
import { BudgetComparisonDTO } from "../../model/Report/BudgetReport";
import {
    BUDGET_MAX_YEAR,
    BUDGET_MIN_YEAR,
    BUDGET_REPORT_CURRENCY,
    getBudgetDisplayCurrency,
    getBudgetReportCurrency,
    getBudgetEditSnapshot,
    getBudgetPaceMetrics,
    getBudgetReportForBudget,
    getSortedBudgets,
    getBudgetUsageStatus,
    getSupportedBudgetMonthFromParams,
    isBudgetPeriodDisabled,
    getPeriodPayload,
    getReportMetricsState,
} from "./budget-planning-utils";

const reportItem = (data: Partial<BudgetComparisonDTO>): BudgetComparisonDTO => ({
    categoryName: "",
    categoryIds: [],
    budgetedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    percentageUsed: 0,
    ...data,
});

describe("budget planning helpers", () => {
    it("uses the explicit report currency fallback and report metadata when available", () => {
        expect(BUDGET_REPORT_CURRENCY).toBe("USD");
        expect(getBudgetDisplayCurrency()).toBe("USD");
        expect(getBudgetDisplayCurrency("EUR")).toBe("EUR");
        expect(getBudgetReportCurrency([{ id: 2, key: "PLN" }], 2)).toBe("PLN");
        expect(getBudgetReportCurrency([{ id: 2, key: "PLN" }], 9)).toBeNull();
        expect(getBudgetReportCurrency([], 2)).toBeNull();
    });

    it("classifies report metric availability without hiding editable budget data", () => {
        expect(getReportMetricsState({ isLoading: true, isFetching: false, hasReportData: false })).toBe("loading");
        expect(getReportMetricsState({ isLoading: false, isFetching: false, hasReportData: false })).toBe("unavailable");
        expect(getReportMetricsState({ isLoading: false, isFetching: false, hasReportData: true })).toBe("ready");
        expect(getReportMetricsState({ isLoading: false, isFetching: true, hasReportData: true })).toBe("ready");
        expect(getReportMetricsState({ isLoading: false, isFetching: false, hasReportData: true, hasError: true })).toBe("ready");
        expect(getReportMetricsState({ isLoading: false, isFetching: false, hasReportData: false, hasError: true })).toBe("error");
    });

    it("aggregates report metrics across all categories assigned to a budget", () => {
        const budget = createBudgetDetails({ value: 300, categoryIds: [1, 2] });
        const result = getBudgetReportForBudget(budget, [
            reportItem({ categoryIds: [1], spentAmount: 70 }),
            reportItem({ categoryIds: [2], spentAmount: 30 }),
            reportItem({ categoryIds: [3], spentAmount: 500 }),
        ]);

        expect(result?.budgetedAmount).toBe(300);
        expect(result?.spentAmount).toBe(100);
        expect(result?.remainingAmount).toBe(200);
        expect(result?.percentageUsed).toBeCloseTo(33.33, 1);
    });

    it("uses the parent budget report row without double-counting separate child rows", () => {
        const budget = createBudgetDetails({ value: 400, categoryIds: [1] });
        const result = getBudgetReportForBudget(budget, [
            reportItem({ categoryIds: [1], spentAmount: 200 }),
            reportItem({ categoryIds: [2], spentAmount: 125 }),
        ]);

        expect(result?.budgetedAmount).toBe(400);
        expect(result?.spentAmount).toBe(200);
        expect(result?.remainingAmount).toBe(200);
        expect(result?.percentageUsed).toBe(50);
    });

    it("keeps categoryless budgets scannable with zero-spend report metrics", () => {
        const budget = createBudgetDetails({ name: "Savings", value: 150, categoryIds: [] });
        const result = getBudgetReportForBudget(budget, []);

        expect(result).toMatchObject({
            categoryName: "Savings",
            categoryIds: [],
            budgetedAmount: 150,
            spentAmount: 0,
            remainingAmount: 150,
            percentageUsed: 0,
        });
    });

    it("keeps categorized budgets scannable when the report has no matching spend item", () => {
        const budget = createBudgetDetails({ name: "Food", value: 500, categoryIds: [1, 2] });
        const result = getBudgetReportForBudget(budget, []);

        expect(result).toMatchObject({
            categoryName: "Food",
            categoryIds: [1, 2],
            budgetedAmount: 500,
            spentAmount: 0,
            remainingAmount: 500,
            percentageUsed: 0,
        });
    });

    it("treats exact-limit budgets as at-limit instead of over budget", () => {
        expect(getBudgetUsageStatus(reportItem({ budgetedAmount: 100, spentAmount: 99.99, remainingAmount: 0.01, percentageUsed: 99.99 }))).toBe("near");
        expect(getBudgetUsageStatus(reportItem({ budgetedAmount: 100, spentAmount: 100, remainingAmount: 0, percentageUsed: 100 }))).toBe("atLimit");
        expect(getBudgetUsageStatus(reportItem({ budgetedAmount: 100, spentAmount: 100.01, remainingAmount: -0.01, percentageUsed: 100.01 }))).toBe("over");
    });

    it("calculates daily pace and snapshot daily average from the selected period", () => {
        const selectedMonth = dayjs("2026-04-01");
        const today = dayjs("2026-04-23");
        const metrics = getBudgetPaceMetrics({
            budgetedAmount: 3000,
            spentAmount: 2500,
            selectedMonth,
            today,
        });
        const snapshot = getBudgetEditSnapshot({
            budgetedAmount: 3000,
            spentAmount: 2500,
            remainingAmount: 500,
            selectedMonth,
            today,
        });

        expect(metrics.dayOfMonth).toBe(23);
        expect(metrics.daysInMonth).toBe(30);
        expect(metrics.dailyAverageSpent).toBeCloseTo(108.7, 1);
        expect(metrics.paceDelta).toBe(200);
        expect(metrics.paceStatus).toBe("ahead");
        expect(snapshot.dailyAverageLeft).toBeCloseTo(71.4, 1);
    });

    it("does not treat future budget months as partially elapsed", () => {
        const selectedMonth = dayjs("2026-08-01");
        const today = dayjs("2026-06-05");
        const metrics = getBudgetPaceMetrics({
            budgetedAmount: 3100,
            spentAmount: 0,
            selectedMonth,
            today,
        });
        const snapshot = getBudgetEditSnapshot({
            budgetedAmount: 3100,
            spentAmount: 0,
            remainingAmount: 3100,
            selectedMonth,
            today,
        });

        expect(metrics.dayOfMonth).toBe(0);
        expect(metrics.elapsedPercent).toBe(0);
        expect(metrics.expectedSpentToDate).toBe(0);
        expect(metrics.paceStatus).toBe("idle");
        expect(snapshot.dailyAverageLeft).toBe(100);
    });

    it("does not invent a remaining day for completed months", () => {
        const snapshot = getBudgetEditSnapshot({
            budgetedAmount: 3000,
            spentAmount: 2000,
            remainingAmount: 1000,
            selectedMonth: dayjs("2026-05-01"),
            today: dayjs("2026-06-05"),
        });

        expect(snapshot.dailyAverageLeft).toBe(0);
    });

    it("keeps one visible period value while preserving submitted year and month fields", () => {
        expect(getPeriodPayload(dayjs("2026-06-01"))).toEqual({ year: 2026, month: 6 });
    });

    it("guards budget period years to the supported backend range", () => {
        expect(BUDGET_MIN_YEAR).toBe(2020);
        expect(BUDGET_MAX_YEAR).toBe(2030);
        expect(isBudgetPeriodDisabled(dayjs("2019-12-01"))).toBe(true);
        expect(isBudgetPeriodDisabled(dayjs("2020-01-01"))).toBe(false);
        expect(isBudgetPeriodDisabled(dayjs("2030-12-01"))).toBe(false);
        expect(isBudgetPeriodDisabled(dayjs("2031-01-01"))).toBe(true);
    });

    it("falls back from invalid URL period params before queries are built", () => {
        const fallback = dayjs("2026-06-15T12:00:00");

        expect(getSupportedBudgetMonthFromParams("2026", "7", fallback).format("YYYY-MM-DD")).toBe("2026-07-01");
        expect(getSupportedBudgetMonthFromParams("2026", "13", fallback).format("YYYY-MM-DD")).toBe("2026-06-01");
        expect(getSupportedBudgetMonthFromParams("2031", "1", fallback).format("YYYY-MM-DD")).toBe("2026-06-01");
        expect(getSupportedBudgetMonthFromParams("abc", "6", fallback).format("YYYY-MM-DD")).toBe("2026-06-01");
    });

    it("sorts visible budgets by mockup toolbar modes without changing API data", () => {
        const groceries = createBudgetDetails({ id: 1, name: "Groceries", value: 500, categoryIds: [1] });
        const rent = createBudgetDetails({ id: 2, name: "Rent", value: 1200, categoryIds: [2] });
        const cafes = createBudgetDetails({ id: 3, name: "Cafes", value: 200, categoryIds: [3] });
        const budgets = [groceries, rent, cafes];
        const reportItems = [
            reportItem({ categoryIds: [1], spentAmount: 450, remainingAmount: 50, percentageUsed: 90 }),
            reportItem({ categoryIds: [2], spentAmount: 700, remainingAmount: 500, percentageUsed: 58.3 }),
            reportItem({ categoryIds: [3], spentAmount: 260, remainingAmount: -60, percentageUsed: 130 }),
        ];

        expect(getSortedBudgets(budgets, reportItems, "burnRate").map((budget) => budget.name))
            .toEqual(["Cafes", "Groceries", "Rent"]);
        expect(getSortedBudgets(budgets, reportItems, "remaining").map((budget) => budget.name))
            .toEqual(["Cafes", "Groceries", "Rent"]);
        expect(getSortedBudgets(budgets, reportItems, "amount").map((budget) => budget.name))
            .toEqual(["Rent", "Groceries", "Cafes"]);
        expect(getSortedBudgets(budgets, reportItems, "name").map((budget) => budget.name))
            .toEqual(["Cafes", "Groceries", "Rent"]);
        expect(budgets.map((budget) => budget.name)).toEqual(["Groceries", "Rent", "Cafes"]);
    });
});
