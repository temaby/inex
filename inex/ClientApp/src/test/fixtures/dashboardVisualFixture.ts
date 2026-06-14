import type { BudgetReportResponse } from "../../model/Report/BudgetReport";
import type { NetWorthHistoryResponse } from "../../model/Report/NetWorthHistory";
import type { SpendingHeatmapResponse } from "../../model/Report/SpendingHeatmap";
import type { CategoryExchangeRate } from "../../pages/Categories/categories.utils";

interface DashboardVisualFixtureRate extends CategoryExchangeRate {
  id: number;
  date: string;
  isTemporary: boolean;
}

export const dashboardVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Dashboard mockup parity",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedBaseCurrency: "USD",
  expectedSummaryCardCount: 4,
  expectedPanelCount: 2,
  expectedNetWorthMonths: 12,
  expectedHeatmapDays: 30,
  nonApplicableStates: ["filter-empty", "drawer-open", "expanded-row"],
} as const;

export const dashboardVisualFixtureCurrencies = [
  { id: 1, key: "USD", name: "USD" },
  { id: 2, key: "PLN", name: "PLN" },
  { id: 3, key: "UZS", name: "UZS" },
] as const;

export const dashboardVisualFixtureRates: DashboardVisualFixtureRate[] = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "UZS", date: "2026-04-30", rate: 12000, isTemporary: false },
];

export const dashboardVisualFixtureCurrentBudgetReport: BudgetReportResponse = {
  data: [
    {
      categoryName: "Groceries",
      categoryIds: [402],
      budgetedAmount: 420,
      spentAmount: 505,
      remainingAmount: -85,
      percentageUsed: 120.24,
    },
    {
      categoryName: "Rent",
      categoryIds: [405],
      budgetedAmount: 1450,
      spentAmount: 1450,
      remainingAmount: 0,
      percentageUsed: 100,
    },
    {
      categoryName: "Transport",
      categoryIds: [403],
      budgetedAmount: 120,
      spentAmount: 56,
      remainingAmount: 64,
      percentageUsed: 46.67,
    },
  ],
  metadata: {
    name: "April 2026 dashboard summary",
    currency: "USD",
    start: "2026-04-01T00:00:00.000Z",
    end: "2026-04-30T23:59:59.999Z",
    totalIncome: 3200,
    totalOutcome: 2105,
  },
};

export const dashboardVisualFixturePreviousBudgetReport: BudgetReportResponse = {
  data: [
    {
      categoryName: "Groceries",
      categoryIds: [402],
      budgetedAmount: 390,
      spentAmount: 450,
      remainingAmount: -60,
      percentageUsed: 115.38,
    },
    {
      categoryName: "Rent",
      categoryIds: [405],
      budgetedAmount: 1450,
      spentAmount: 1450,
      remainingAmount: 0,
      percentageUsed: 100,
    },
  ],
  metadata: {
    name: "March 2026 dashboard summary",
    currency: "USD",
    start: "2026-03-01T00:00:00.000Z",
    end: "2026-03-31T23:59:59.999Z",
    totalIncome: 3100,
    totalOutcome: 2550,
  },
};

export const dashboardVisualFixtureEmptyBudgetReport: BudgetReportResponse = {
  data: [],
  metadata: {
    name: "Empty dashboard summary",
    currency: "USD",
    start: "2026-04-01T00:00:00.000Z",
    end: "2026-04-30T23:59:59.999Z",
    totalIncome: 0,
    totalOutcome: 0,
  },
};

export const dashboardVisualFixtureNetWorthHistory: NetWorthHistoryResponse = {
  data: [
    { month: "2025-05", monthEnd: "2025-05-31", netWorth: 18500, currency: "USD" },
    { month: "2025-06", monthEnd: "2025-06-30", netWorth: 19120, currency: "USD" },
    { month: "2025-07", monthEnd: "2025-07-31", netWorth: 19860, currency: "USD" },
    { month: "2025-08", monthEnd: "2025-08-31", netWorth: 20420, currency: "USD" },
    { month: "2025-09", monthEnd: "2025-09-30", netWorth: 21100, currency: "USD" },
    { month: "2025-10", monthEnd: "2025-10-31", netWorth: 21950, currency: "USD" },
    { month: "2025-11", monthEnd: "2025-11-30", netWorth: 22680, currency: "USD" },
    { month: "2025-12", monthEnd: "2025-12-31", netWorth: 23240, currency: "USD" },
    { month: "2026-01", monthEnd: "2026-01-31", netWorth: 24110, currency: "USD" },
    { month: "2026-02", monthEnd: "2026-02-28", netWorth: 24780, currency: "USD" },
    { month: "2026-03", monthEnd: "2026-03-31", netWorth: 25330, currency: "USD" },
    { month: "2026-04", monthEnd: "2026-04-30", netWorth: 26425, currency: "USD" },
  ],
};

export const dashboardVisualFixtureHeatmapReport: SpendingHeatmapResponse = {
  metadata: {
    currency: "USD",
    start: "2026-04-01",
    end: "2026-04-30",
  },
  data: Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const spendPattern = [0, 18, 44, 0, 84, 122, 0, 12, 0, 64];

    return {
      date: `2026-04-${day.toString().padStart(2, "0")}`,
      totalSpend: spendPattern[index % spendPattern.length] + (day % 6 === 0 ? 38 : 0),
      currency: "USD",
    };
  }),
};

export const dashboardVisualFixtureEmptyHeatmapReport: SpendingHeatmapResponse = {
  metadata: {
    currency: "USD",
    start: "2026-04-01",
    end: "2026-04-30",
  },
  data: [],
};
