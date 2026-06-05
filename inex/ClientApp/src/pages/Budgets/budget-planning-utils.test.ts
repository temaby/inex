import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { createBudgetDetails } from "../../model/Budget/BudgetDetails";
import { BudgetComparisonDTO } from "../../model/Report/BudgetReport";
import {
    BUDGET_REPORT_CURRENCY,
    getBudgetDisplayCurrency,
    getBudgetEditSnapshot,
    getBudgetPaceMetrics,
    getBudgetReportForBudget,
    getBudgetUsageStatus,
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

    it("keeps one visible period value while preserving submitted year and month fields", () => {
        expect(getPeriodPayload(dayjs("2026-06-01"))).toEqual({ year: 2026, month: 6 });
    });
});
