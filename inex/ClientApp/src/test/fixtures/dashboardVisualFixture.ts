import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import type { CategoryReportResponse } from "../../store/report/report-api";
import type { ExchangeRateItem } from "../../store/rates/rates-slice";
import type { TransactionSummaryResult } from "../../store/transactions/transactions-api";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";

export const dashboardVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Dashboard compact aligned top cards",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedBaseCurrency: "USD",
  expectedPanelCount: 4,
  expectedPanelOrder: [
    "dashboard-position",
    "dashboard-cash-flow",
    "dashboard-expense-categories",
    "dashboard-income-categories",
  ],
  expectedVisibleAccountCount: 7,
  expectedCollapsedDesktopAccountCount: 5,
  expectedCollapsedMobileAccountCount: 3,
  expectedChartCount: 3,
  nonApplicableStates: ["drawer-open", "expanded-row", "budget-summary", "net-worth-history"],
} as const;

export const dashboardVisualFixtureAccounts: AccountResponse[] = [
  { id: 11, key: "daily", name: "Daily account", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "USD" },
  { id: 12, key: "savings", name: "Savings", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "USD" },
  { id: 13, key: "travel", name: "Travel card", description: null, isEnabled: true, isFavourite: true, currencyId: 2, currency: "PLN" },
  { id: 14, key: "reserve", name: "Hidden reserve", description: null, isEnabled: true, isFavourite: false, currencyId: 1, currency: "USD" },
  { id: 15, key: "closed", name: "Closed account", description: null, isEnabled: false, isFavourite: true, currencyId: 1, currency: "USD" },
  { id: 16, key: "family", name: "Family everyday account with a deliberately long label", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "USD" },
  { id: 17, key: "cash", name: "Cash", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "USD" },
  { id: 18, key: "emergency", name: "Emergency fund", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "USD" },
  { id: 19, key: "brokerage", name: "Brokerage", description: null, isEnabled: true, isFavourite: true, currencyId: 1, currency: "USD" },
];

export const dashboardVisualFixtureAccountSummaries: AccountSummary[] = [
  { ...dashboardVisualFixtureAccounts[0], value: 2380, thisMonthNet: 420 },
  { ...dashboardVisualFixtureAccounts[1], value: 12400, thisMonthNet: 700 },
  { ...dashboardVisualFixtureAccounts[2], value: -3200, thisMonthNet: -480 },
  { ...dashboardVisualFixtureAccounts[3], value: 9600, thisMonthNet: 0 },
  { ...dashboardVisualFixtureAccounts[5], value: 875, thisMonthNet: -125 },
  { ...dashboardVisualFixtureAccounts[6], value: 210, thisMonthNet: 10 },
  { ...dashboardVisualFixtureAccounts[7], value: 5400, thisMonthNet: 250 },
  { ...dashboardVisualFixtureAccounts[8], value: 1800, thisMonthNet: 90 },
];

const parent = (id: number, name: string): CategoryResponse => ({
  id,
  key: name.toLowerCase().replace(/ /g, "-"),
  name,
  description: "",
  parentId: null,
  isEnabled: true,
  isSystem: false,
  systemCode: null,
});

const child = (id: number, parentId: number, name: string): CategoryResponse => ({
  ...parent(id, name),
  parentId,
});

export const dashboardVisualFixtureCategories: CategoryResponse[] = [
  parent(100, "Home"), child(101, 100, "Rent"), child(102, 100, "Utilities"),
  parent(110, "Food"), child(111, 110, "Groceries"), child(112, 110, "Dining out"),
  parent(120, "Transport"), child(121, 120, "Public transport"),
  parent(130, "Health"), child(131, 130, "Pharmacy"),
  parent(140, "Family"), child(141, 140, "Children"),
  parent(150, "Leisure"), child(151, 150, "Subscriptions"),
  parent(160, "Shopping"), child(161, 160, "Clothes"),
  parent(170, "Education"), child(171, 170, "Courses"),
  parent(180, "Travel"), child(181, 180, "Hotels"),
  parent(190, "Gifts"), child(191, 190, "Presents"),
  parent(200, "Salary"), child(201, 200, "Main job"),
  parent(210, "Freelance"), child(211, 210, "Consulting"),
  parent(220, "Interest"), child(221, 220, "Savings interest"),
  parent(230, "Refunds"), child(231, 230, "Purchase refunds"),
  parent(240, "Benefits"), child(241, 240, "Family benefit"),
  parent(250, "Other income"), child(251, 250, "Cashback"),
];

export const dashboardVisualFixtureCategoryReport: CategoryReportResponse = {
  data: [
    { id: 101, key: "rent", name: "Rent", description: "", parentId: 100, isSystem: false, value: -1450, children: [] },
    { id: 102, key: "utilities", name: "Utilities", description: "", parentId: 100, isSystem: false, value: -215, children: [] },
    { id: 111, key: "groceries", name: "Groceries", description: "", parentId: 110, isSystem: false, value: -620, children: [] },
    { id: 112, key: "dining", name: "Dining out", description: "", parentId: 110, isSystem: false, value: -260, children: [] },
    { id: 121, key: "public-transport", name: "Public transport", description: "", parentId: 120, isSystem: false, value: -185, children: [] },
    { id: 131, key: "pharmacy", name: "Pharmacy", description: "", parentId: 130, isSystem: false, value: -142, children: [] },
    { id: 141, key: "children", name: "Children", description: "", parentId: 140, isSystem: false, value: -128, children: [] },
    { id: 151, key: "subscriptions", name: "Subscriptions", description: "", parentId: 150, isSystem: false, value: -96, children: [] },
    { id: 161, key: "clothes", name: "Clothes", description: "", parentId: 160, isSystem: false, value: -84, children: [] },
    { id: 171, key: "courses", name: "Courses", description: "", parentId: 170, isSystem: false, value: -72, children: [] },
    { id: 181, key: "hotels", name: "Hotels", description: "", parentId: 180, isSystem: false, value: -65, children: [] },
    { id: 191, key: "presents", name: "Presents", description: "", parentId: 190, isSystem: false, value: -48, children: [] },
    { id: 201, key: "main-job", name: "Main job", description: "", parentId: 200, isSystem: false, value: 4300, children: [] },
    { id: 211, key: "consulting", name: "Consulting", description: "", parentId: 210, isSystem: false, value: 780, children: [] },
    { id: 221, key: "savings-interest", name: "Savings interest", description: "", parentId: 220, isSystem: false, value: 115, children: [] },
    { id: 231, key: "purchase-refunds", name: "Purchase refunds", description: "", parentId: 230, isSystem: false, value: 94, children: [] },
    { id: 241, key: "family-benefit", name: "Family benefit", description: "", parentId: 240, isSystem: false, value: 76, children: [] },
    { id: 251, key: "cashback", name: "Cashback", description: "", parentId: 250, isSystem: false, value: 38, children: [] },
  ],
  metadata: {
    name: "April 2026 category report",
    currency: "USD",
    internalTransfers: { amountReceived: 0, amountSent: 0, netChange: 0, transactionCount: 0 },
  },
};

export const dashboardVisualFixtureTransactions: TransactionResponse[] = [
  ...dashboardVisualFixtureCategoryReport.data.map((row, index) => ({
    id: index + 1,
    accountId: index === 4 ? 13 : index % 2 === 0 ? 11 : 12,
    categoryId: row.id,
    created: `2026-04-${String((index % 27) + 1).padStart(2, "0")}T12:00:00`,
    amount: index === 4 ? -740 : row.value,
    comment: null,
    tags: [],
    refs: [],
    accountCurrency: index === 4 ? "PLN" : "USD",
  })),
  {
    id: 99,
    accountId: 11,
    categoryId: 111,
    created: "2026-04-30T22:45:00",
    amount: 50,
    comment: "Mixed-flow category regression fixture",
    tags: [],
    refs: [],
    accountCurrency: "USD",
  },
];

const counts = { all: 34, income: 8, expense: 26, transfer: 0, internalTransfer: 0 };

export const dashboardVisualFixtureTransactionSummary: TransactionSummaryResult = {
  totalCount: 34,
  typeCounts: counts,
  viewTypeCounts: counts,
  currencySummaries: [
    { currency: "USD", income: 5150, expense: -3220, net: 1930 },
    { currency: "PLN", income: 1000, expense: -720, net: 280 },
  ],
  baseCurrency: "USD",
  currentScope: {
    totalCount: 34,
    typeCounts: counts,
    period: { startDate: "2026-04-01", endDate: "2026-04-30" },
    cashFlowBuckets: [
      { date: "2026-04-03", currency: "USD", income: 4300, expense: -1450, recordCount: 3 },
      { date: "2026-04-15", currency: "USD", income: 850, expense: -1770, recordCount: 27 },
      { date: "2026-04-20", currency: "PLN", income: 1000, expense: -720, recordCount: 4 },
    ],
  },
  previousScope: null,
};

export const dashboardVisualFixtureRates: ExchangeRateItem[] = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-03", rate: 4, isTemporary: false },
  { id: 5, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-05", rate: 4, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-15", rate: 4, isTemporary: false },
  { id: 3, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-20", rate: 4, isTemporary: false },
  { id: 4, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
];

export const dashboardVisualFixtureEmptyTransactionSummary: TransactionSummaryResult = {
  ...dashboardVisualFixtureTransactionSummary,
  totalCount: 0,
  typeCounts: { all: 0, income: 0, expense: 0, transfer: 0, internalTransfer: 0 },
  viewTypeCounts: { all: 0, income: 0, expense: 0, transfer: 0, internalTransfer: 0 },
  currencySummaries: [],
  currentScope: {
    ...dashboardVisualFixtureTransactionSummary.currentScope,
    totalCount: 0,
    typeCounts: { all: 0, income: 0, expense: 0, transfer: 0, internalTransfer: 0 },
    cashFlowBuckets: [],
  },
};
