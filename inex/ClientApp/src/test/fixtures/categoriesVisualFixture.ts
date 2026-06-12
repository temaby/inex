import type { BudgetDetails } from "../../model/Budget/BudgetDetails";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import type { CategoryExchangeRate } from "../../pages/Categories/categories.utils";
import type { CategoryResponse } from "../../store/categories/categories-api";

interface CategoriesVisualFixtureRate extends CategoryExchangeRate {
  id: number;
  date: string;
  isTemporary: boolean;
}

export const categoriesVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Categories mockup parity",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedBaseCurrency: "USD",
  expectedCategoryCount: 8,
  expectedTransactionCount: 6,
  rowInteraction: "open-inline-edit",
} as const;

export const categoriesVisualFixtureCurrencies = [
  { id: 1, key: "USD", name: "USD" },
  { id: 2, key: "PLN", name: "PLN" },
  { id: 3, key: "UZS", name: "UZS" },
] as const;

export const categoriesVisualFixtureRates: CategoriesVisualFixtureRate[] = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "UZS", date: "2026-04-30", rate: 12000, isTemporary: false },
];

export const categoriesVisualFixtureCategories: CategoryResponse[] = [
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
    key: "income",
    name: "Income",
    description: "Money in",
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 407,
    key: "archived",
    name: "Archived shopping",
    description: "Disabled legacy category",
    parentId: 401,
    isEnabled: false,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 408,
    key: "transfer",
    name: "Transfer",
    description: "Internal movement",
    parentId: null,
    isEnabled: true,
    isSystem: true,
    systemCode: "TRANSFER",
  },
];

export const categoriesVisualFixtureBudgets: BudgetDetails[] = [
  {
    id: 601,
    key: "groceries-apr-2026",
    name: "Groceries cap",
    description: "April food budget",
    value: 420,
    categoryIds: [402],
    year: 2026,
    month: 4,
  },
  {
    id: 602,
    key: "home-apr-2026",
    name: "Home essentials",
    description: "Rent and utilities",
    value: 1600,
    categoryIds: [404],
    year: 2026,
    month: 4,
  },
];

export const categoriesVisualFixtureTransactions: TransactionResponse[] = [
  {
    id: 701,
    accountId: 301,
    categoryId: 405,
    created: "2026-04-02T08:00:00.000Z",
    amount: -1450,
    comment: "April rent",
    tags: ["rent"],
    refs: [],
    accountCurrency: "USD",
  },
  {
    id: 702,
    accountId: 302,
    categoryId: 402,
    created: "2026-04-05T12:30:00.000Z",
    amount: -240,
    comment: "Weekly groceries",
    tags: ["food"],
    refs: ["receipt-2001"],
    accountCurrency: "PLN",
  },
  {
    id: 703,
    accountId: 302,
    categoryId: 402,
    created: "2026-04-18T17:45:00.000Z",
    amount: -330,
    comment: "Market run",
    tags: ["food"],
    refs: [],
    accountCurrency: "PLN",
  },
  {
    id: 704,
    accountId: 303,
    categoryId: 403,
    created: "2026-04-21T09:20:00.000Z",
    amount: -144000,
    comment: "Taxi across town",
    tags: ["transport"],
    refs: [],
    accountCurrency: "UZS",
  },
  {
    id: 705,
    accountId: 301,
    categoryId: 403,
    created: "2026-04-24T10:10:00.000Z",
    amount: -32,
    comment: "Airport train",
    tags: ["transport"],
    refs: [],
    accountCurrency: "USD",
  },
  {
    id: 706,
    accountId: 301,
    categoryId: 406,
    created: "2026-04-30T08:00:00.000Z",
    amount: 3200,
    comment: "April salary",
    tags: ["payroll"],
    refs: [],
    accountCurrency: "USD",
  },
];
