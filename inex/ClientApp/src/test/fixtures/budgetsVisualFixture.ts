import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import type { BudgetReportResponse } from "../../model/Report/BudgetReport";
import type { CategoryExchangeRate } from "../../pages/Categories/categories.utils";
import type { CategoryResponse } from "../../store/categories/categories-api";

interface BudgetsVisualFixtureRate extends CategoryExchangeRate {
  id: number;
  date: string;
  isTemporary: boolean;
}

export const budgetsVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Budgets mockup parity",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedBaseCurrency: "USD",
  expectedBudgetCount: 5,
  expectedCategoryCount: 9,
  rowInteraction: "expand-inline-edit",
} as const;

export const budgetsVisualFixtureCurrencies = [
  { id: 1, key: "USD", name: "USD" },
  { id: 2, key: "PLN", name: "PLN" },
  { id: 3, key: "UZS", name: "UZS" },
] as const;

export const budgetsVisualFixtureRates: BudgetsVisualFixtureRate[] = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "UZS", date: "2026-04-30", rate: 12000, isTemporary: false },
];

export const budgetsVisualFixtureCategories: CategoryResponse[] = [
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
    key: "transfer",
    name: "Transfer",
    description: "Internal movement",
    parentId: null,
    isEnabled: true,
    isSystem: true,
    systemCode: "TRANSFER",
  },
];

export const budgetsVisualFixtureBudgets: BudgetDetails[] = [
  {
    id: 801,
    key: "groceries-apr-2026",
    name: "Groceries cap",
    description: "April food budget",
    value: 420,
    categoryIds: [402],
    year: 2026,
    month: 4,
  },
  {
    id: 802,
    key: "rent-apr-2026",
    name: "Rent envelope",
    description: "Apartment rent",
    value: 1450,
    categoryIds: [405],
    year: 2026,
    month: 4,
  },
  {
    id: 803,
    key: "transport-apr-2026",
    name: "Transport buffer",
    description: "Transit and taxi",
    value: 120,
    categoryIds: [403],
    year: 2026,
    month: 4,
  },
  {
    id: 804,
    key: "utilities-apr-2026",
    name: "Utilities reserve",
    description: "Power, internet, and shared bills",
    value: 220,
    categoryIds: [406],
    year: 2026,
    month: 4,
  },
  {
    id: 805,
    key: "dining-apr-2026",
    name: "Dining out",
    description: "Restaurants and cafes",
    value: 180,
    categoryIds: [407],
    year: 2026,
    month: 4,
  },
];

export const budgetsVisualFixtureReport: BudgetReportResponse = {
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
