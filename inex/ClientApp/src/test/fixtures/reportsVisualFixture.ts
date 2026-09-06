import type { BudgetReportResponse } from "../../model/Report/BudgetReport";
import type { SpendingHeatmapResponse } from "../../model/Report/SpendingHeatmap";
import type { CategoryExchangeRate } from "../../pages/Categories/categories.utils";
import type { CategoryResponse } from "../../store/categories/categories-api";
import type { AccountResponse } from "../../store/accounts/accounts-api";
import type { CategoryReportResponse, HistoryReportResponse } from "../../store/report/report-api";

interface ReportsVisualFixtureRate extends CategoryExchangeRate {
  id: number;
  date: string;
  isTemporary: boolean;
}

export const reportsVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Reports mockup parity",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedBaseCurrency: "USD",
  expectedReportCardCount: 4,
  expectedCategoryReportRows: 3,
  expectedBudgetReportRows: 5,
  expectedHistoryMonths: 12,
  expectedHeatmapDays: 30,
  nonApplicableStates: ["filter-empty", "drawer-open", "expanded-row"],
} as const;

export const reportsVisualFixtureCurrencies = [
  { id: 1, key: "USD", name: "USD" },
  { id: 2, key: "PLN", name: "PLN" },
  { id: 3, key: "UZS", name: "UZS" },
] as const;

export const reportsVisualFixtureAccounts: AccountResponse[] = [
  {
    id: 101,
    key: "daily-usd",
    name: "Daily USD",
    description: "Primary spending account",
    isEnabled: true,
    isFavourite: true,
    currencyId: 1,
    currency: "USD",
  },
  {
    id: 102,
    key: "savings-pln",
    name: "Savings PLN",
    description: "Savings account",
    isEnabled: true,
    isFavourite: true,
    currencyId: 2,
    currency: "PLN",
  },
];

export const reportsVisualFixtureRates: ReportsVisualFixtureRate[] = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "UZS", date: "2026-04-30", rate: 12000, isTemporary: false },
];

export const reportsVisualFixtureCategories: CategoryResponse[] = [
  {
    id: 401,
    key: "living",
    name: "Living",
    description: "Daily life",
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 402,
    key: "groceries",
    name: "Groceries",
    description: "Food and household",
    parentId: 401,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 403,
    key: "transport",
    name: "Transport",
    description: "Transit and fuel",
    parentId: 401,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 404,
    key: "home",
    name: "Home",
    description: "Rent and utilities",
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 405,
    key: "rent",
    name: "Rent",
    description: "Apartment rent",
    parentId: 404,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 406,
    key: "utilities",
    name: "Utilities",
    description: "Power and internet",
    parentId: 404,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 407,
    key: "dining",
    name: "Dining out",
    description: "Restaurants and cafes",
    parentId: 401,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 408,
    key: "income",
    name: "Income",
    description: "Money in",
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 409,
    key: "internal-transfer",
    name: "Internal transfer",
    description: "Transfer from another household member",
    parentId: null,
    isEnabled: true,
    isSystem: true,
    systemCode: "internal-transfer",
  },
];

export const reportsVisualFixtureCategoryReport: CategoryReportResponse = {
  data: [
    {
      id: 402,
      key: "groceries",
      name: "Groceries",
      description: "Food and household",
      parentId: 401,
      isSystem: false,
      value: -505,
      children: [],
    },
    {
      id: 403,
      key: "transport",
      name: "Transport",
      description: "Transit and fuel",
      parentId: 401,
      isSystem: false,
      value: -56,
      children: [],
    },
    {
      id: 407,
      key: "dining",
      name: "Dining out",
      description: "Restaurants and cafes",
      parentId: 401,
      isSystem: false,
      value: -14,
      children: [],
    },
    {
      id: 405,
      key: "rent",
      name: "Rent",
      description: "Apartment rent",
      parentId: 404,
      isSystem: false,
      value: -1450,
      children: [],
    },
    {
      id: 406,
      key: "utilities",
      name: "Utilities",
      description: "Power and internet",
      parentId: 404,
      isSystem: false,
      value: -80,
      children: [],
    },
    {
      id: 408,
      key: "income",
      name: "Income",
      description: "Money in",
      parentId: 408,
      isSystem: false,
      value: 3200,
      children: [],
    },
  ],
  metadata: {
    name: "April 2026 category report",
    currency: "USD",
    internalTransfers: {
      amountReceived: 740,
      amountSent: 280,
      netChange: 460,
      transactionCount: 3,
    },
  },
};

export const reportsVisualFixtureBudgetReport: BudgetReportResponse = {
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
    {
      categoryName: "Utilities",
      categoryIds: [406],
      budgetedAmount: 220,
      spentAmount: 80,
      remainingAmount: 140,
      percentageUsed: 36.36,
    },
    {
      categoryName: "Dining out",
      categoryIds: [407],
      budgetedAmount: 180,
      spentAmount: 14,
      remainingAmount: 166,
      percentageUsed: 7.78,
    },
  ],
  metadata: {
    name: "April 2026 budget comparison",
    currency: "USD",
    start: "2026-04-01T00:00:00.000Z",
    end: "2026-04-30T23:59:59.999Z",
    totalIncome: 3200,
    totalOutcome: 2105,
  },
};

export const reportsVisualFixtureHistoryReport: HistoryReportResponse = {
  data: [
    { month: 1, monthName: "Jan", income: 3050, expense: 2320, savings: 730 },
    { month: 2, monthName: "Feb", income: 3080, expense: 2390, savings: 690 },
    { month: 3, monthName: "Mar", income: 3100, expense: 2550, savings: 550 },
    { month: 4, monthName: "Apr", income: 3200, expense: 2105, savings: 1095 },
    { month: 5, monthName: "May", income: 3180, expense: 2680, savings: 500 },
    { month: 6, monthName: "Jun", income: 3250, expense: 2790, savings: 460 },
    { month: 7, monthName: "Jul", income: 3300, expense: 2870, savings: 430 },
    { month: 8, monthName: "Aug", income: 3320, expense: 2925, savings: 395 },
    { month: 9, monthName: "Sep", income: 3350, expense: 3010, savings: 340 },
    { month: 10, monthName: "Oct", income: 3380, expense: 2860, savings: 520 },
    { month: 11, monthName: "Nov", income: 3400, expense: 2760, savings: 640 },
    { month: 12, monthName: "Dec", income: 3450, expense: 3120, savings: 330 },
  ],
};

export const reportsVisualFixtureHeatmapReport: SpendingHeatmapResponse = {
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
