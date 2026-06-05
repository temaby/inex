import { Dayjs } from "dayjs";

import { BudgetDetails } from "../../model/Budget/BudgetDetails";
import { BudgetComparisonDTO } from "../../model/Report/BudgetReport";

export const BUDGET_REPORT_CURRENCY = "USD";
export const BUDGET_MIN_YEAR = 2020;
export const BUDGET_MAX_YEAR = 2030;

export interface BudgetCurrencyOption {
    id: number;
    key: string;
}

export type ReportMetricsState = "loading" | "error" | "unavailable" | "ready";

export interface ReportMetricsStateInput {
    isLoading: boolean;
    isFetching: boolean;
    hasReportData: boolean;
    hasError?: boolean;
}

export type BudgetUsageStatus = "unavailable" | "idle" | "ok" | "near" | "atLimit" | "over";

export type BudgetPaceStatus = "idle" | "under" | "onPace" | "ahead" | "overBudget";

export interface BudgetPaceMetrics {
    dayOfMonth: number;
    daysInMonth: number;
    elapsedPercent: number;
    expectedSpentToDate: number;
    dailyAverageSpent: number;
    paceDelta: number;
    paceDeltaPercent: number;
    paceStatus: BudgetPaceStatus;
}

export interface BudgetEditSnapshot {
    budgetedAmount: number;
    spentAmount: number;
    remainingAmount: number;
    dailyAverageLeft: number;
}

const MONEY_EPSILON = 0.005;
const PERCENT_EPSILON = 0.001;

export const getBudgetDisplayCurrency = (metadataCurrency?: string | null) => {
    const normalizedCurrency = metadataCurrency?.trim();
    return normalizedCurrency ? normalizedCurrency : BUDGET_REPORT_CURRENCY;
};

export const getBudgetReportCurrency = (
    currencies: BudgetCurrencyOption[],
    userCurrencyId?: number,
) => {
    const profileCurrency = currencies.find((currency) => currency.id === userCurrencyId)?.key.trim();
    return profileCurrency || BUDGET_REPORT_CURRENCY;
};

export const getReportMetricsState = ({
    isLoading,
    isFetching,
    hasReportData,
    hasError = false,
}: ReportMetricsStateInput): ReportMetricsState => {
    if (hasReportData) return "ready";
    if (hasError) return "error";
    if ((isLoading || isFetching) && !hasReportData) return "loading";
    return "unavailable";
};

export const getBudgetReportForBudget = (
    budget: BudgetDetails,
    reportItems: BudgetComparisonDTO[],
) => {
    if (budget.categoryIds.length === 0) {
        return {
            categoryName: budget.name,
            categoryIds: [],
            budgetedAmount: budget.value,
            spentAmount: 0,
            remainingAmount: budget.value,
            percentageUsed: 0,
        };
    }

    const matchingItems = reportItems.filter((reportItem) =>
        reportItem.categoryIds.some((categoryId) => budget.categoryIds.includes(categoryId)),
    );
    if (matchingItems.length === 0) return undefined;

    const spentAmount = matchingItems.reduce((sum, item) => sum + item.spentAmount, 0);
    const remainingAmount = budget.value - spentAmount;

    return {
        ...matchingItems[0],
        budgetedAmount: budget.value,
        spentAmount,
        remainingAmount,
        percentageUsed: budget.value > 0 ? (spentAmount / budget.value) * 100 : 0,
    };
};

export const getBudgetUsageStatus = (
    reportItem: BudgetComparisonDTO | undefined,
): BudgetUsageStatus => {
    if (!reportItem) return "unavailable";

    const spentAmount = reportItem.spentAmount;
    const budgetedAmount = reportItem.budgetedAmount;
    const remainingAmount = reportItem.remainingAmount;
    const percentageUsed = reportItem.percentageUsed;

    if (budgetedAmount <= MONEY_EPSILON && spentAmount <= MONEY_EPSILON) return "idle";
    if (
        spentAmount - budgetedAmount > MONEY_EPSILON ||
        remainingAmount < -MONEY_EPSILON ||
        percentageUsed - 100 > PERCENT_EPSILON
    ) {
        return "over";
    }
    if (
        Math.abs(spentAmount - budgetedAmount) <= MONEY_EPSILON ||
        Math.abs(remainingAmount) <= MONEY_EPSILON ||
        Math.abs(percentageUsed - 100) <= PERCENT_EPSILON
    ) {
        return "atLimit";
    }
    if (percentageUsed >= 90) return "near";
    if (percentageUsed < 3) return "idle";
    return "ok";
};

const getSelectedMonthDay = (selectedMonth: Dayjs, today: Dayjs) => {
    const daysInMonth = selectedMonth.daysInMonth();
    if (selectedMonth.isSame(today, "month")) {
        return Math.max(1, Math.min(today.date(), daysInMonth));
    }
    if (selectedMonth.isBefore(today, "month")) {
        return daysInMonth;
    }
    return 0;
};

export const getBudgetPaceMetrics = ({
    budgetedAmount,
    spentAmount,
    selectedMonth,
    today,
}: {
    budgetedAmount: number;
    spentAmount: number;
    selectedMonth: Dayjs;
    today: Dayjs;
}): BudgetPaceMetrics => {
    const daysInMonth = selectedMonth.daysInMonth();
    const dayOfMonth = getSelectedMonthDay(selectedMonth, today);
    const elapsedPercent = (dayOfMonth / daysInMonth) * 100;
    const expectedSpentToDate = budgetedAmount * (dayOfMonth / daysInMonth);
    const dailyAverageSpent = dayOfMonth > 0 ? spentAmount / dayOfMonth : 0;
    const paceDelta = spentAmount - expectedSpentToDate;
    const paceDeltaPercent = expectedSpentToDate > 0 ? (paceDelta / expectedSpentToDate) * 100 : 0;
    const absolutePaceDeltaPercent = Math.abs(paceDeltaPercent);

    let paceStatus: BudgetPaceStatus = "idle";
    if (spentAmount > budgetedAmount && budgetedAmount > MONEY_EPSILON) {
        paceStatus = "overBudget";
    } else if (expectedSpentToDate <= MONEY_EPSILON) {
        paceStatus = spentAmount > MONEY_EPSILON ? "ahead" : "idle";
    } else if (spentAmount > MONEY_EPSILON && absolutePaceDeltaPercent < 5) {
        paceStatus = "onPace";
    } else if (spentAmount > MONEY_EPSILON && paceDelta > 0) {
        paceStatus = "ahead";
    } else if (spentAmount > MONEY_EPSILON) {
        paceStatus = "under";
    }

    return {
        dayOfMonth,
        daysInMonth,
        elapsedPercent,
        expectedSpentToDate,
        dailyAverageSpent,
        paceDelta,
        paceDeltaPercent,
        paceStatus,
    };
};

export const getBudgetEditSnapshot = ({
    budgetedAmount,
    spentAmount,
    remainingAmount,
    selectedMonth,
    today,
}: {
    budgetedAmount: number;
    spentAmount: number;
    remainingAmount: number;
    selectedMonth: Dayjs;
    today: Dayjs;
}): BudgetEditSnapshot => {
    const dayOfMonth = getSelectedMonthDay(selectedMonth, today);
    const remainingDays = selectedMonth.daysInMonth() - dayOfMonth;

    return {
        budgetedAmount,
        spentAmount,
        remainingAmount,
        dailyAverageLeft: remainingDays > 0
            ? Math.max(remainingAmount, 0) / remainingDays
            : 0,
    };
};

export const getPeriodPayload = (period: Dayjs) => ({
    year: period.year(),
    month: period.month() + 1,
});

export const isBudgetPeriodDisabled = (period: Dayjs) =>
    period.year() < BUDGET_MIN_YEAR || period.year() > BUDGET_MAX_YEAR;
