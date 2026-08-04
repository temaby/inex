import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";
import type { CategoryResponse } from "../../store/categories/categories-api";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import type { ExchangeRateLike } from "../../pages/Transactions/transaction-ledger-utils";

interface TransactionsVisualFixtureRate extends ExchangeRateLike {
  id: number;
  date: string;
  isTemporary: boolean;
}

export const transactionsVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Transactions mockup parity",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedBaseCurrency: "USD",
  expectedTransactionCount: 6,
  rowInteraction: "open-edit-drawer",
} as const;

export const transactionsVisualFixtureAccounts: AccountResponse[] = [
  {
    id: 301,
    key: "usd-operating",
    name: "USD operating",
    description: "Primary account",
    isEnabled: true,
    currencyId: 1,
    currency: "USD",
  },
  {
    id: 302,
    key: "pln-card",
    name: "PLN card",
    description: "Daily card",
    isEnabled: true,
    currencyId: 2,
    currency: "PLN",
  },
  {
    id: 303,
    key: "uzs-cash",
    name: "UZS cash",
    description: "Travel cash",
    isEnabled: true,
    currencyId: 3,
    currency: "UZS",
  },
  {
    id: 304,
    key: "usd-archive",
    name: "USD archive",
    description: "Disabled account",
    isEnabled: false,
    currencyId: 1,
    currency: "USD",
  },
  {
    id: 305,
    key: "long-label-zero-balance",
    name: "Emergency reserve for long-term household commitments",
    description: "Long-label zero-balance fixture",
    isEnabled: true,
    currencyId: 2,
    currency: "PLN",
  },
];

export const transactionsVisualFixtureAccountSummaries: AccountSummary[] = [
  { ...transactionsVisualFixtureAccounts[0], value: 2668, thisMonthNet: 0 },
  { ...transactionsVisualFixtureAccounts[1], value: 253.2, thisMonthNet: 0 },
  { ...transactionsVisualFixtureAccounts[2], value: 144000, thisMonthNet: 0 },
  { ...transactionsVisualFixtureAccounts[4], value: 0, thisMonthNet: 0 },
];

export const transactionsVisualFixtureCategories: CategoryResponse[] = [
  {
    id: 401,
    key: "income",
    name: "Income",
    description: "Money in",
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 402,
    key: "salary",
    name: "Salary",
    description: "Monthly salary",
    parentId: 401,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 403,
    key: "living",
    name: "Living",
    description: "Daily life",
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 404,
    key: "groceries",
    name: "Groceries",
    description: "Food and household",
    parentId: 403,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 405,
    key: "transport",
    name: "Transport",
    description: "Transit and fuel",
    parentId: 403,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 406,
    key: "transfer",
    name: "Transfer",
    description: "Internal movement",
    parentId: null,
    isEnabled: true,
    isSystem: true,
    systemCode: "TRANSFER",
  },
];

export const transactionsVisualFixtureRates: TransactionsVisualFixtureRate[] = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-27", rate: 4, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
  { id: 3, currencyFrom: "USD", currencyTo: "UZS", date: "2026-04-29", rate: 12000, isTemporary: false },
];

export const transactionsVisualFixtureTransactions: TransactionResponse[] = [
  {
    id: 501,
    accountId: 302,
    categoryId: 404,
    created: "2026-04-30T09:15:00.000Z",
    amount: -84.5,
    comment: "BIEDRONKA groceries #food @receipt-1042",
    tags: ["food"],
    refs: ["receipt-1042"],
    accountCurrency: "PLN",
  },
  {
    id: 502,
    accountId: 301,
    categoryId: 402,
    created: "2026-04-30T08:00:00.000Z",
    amount: 3200,
    comment: "April salary #payroll",
    tags: ["payroll"],
    refs: [],
    accountCurrency: "USD",
  },
  {
    id: 503,
    accountId: 301,
    categoryId: 406,
    created: "2026-04-29T17:45:00.000Z",
    amount: -1234567890.12,
    comment: "Transfer to Emergency reserve for long-term household commitments #inter-account-transfer-with-a-long-audit-token @reconciliation-reference-with-a-long-identifier",
    tags: ["inter-account-transfer-with-a-long-audit-token"],
    refs: ["reconciliation-reference-with-a-long-identifier"],
    accountCurrency: "USD",
  },
  {
    id: 504,
    accountId: 303,
    categoryId: 405,
    created: "2026-04-29T12:30:00.000Z",
    amount: -96000,
    comment: "Taxi across town #transport",
    tags: ["transport"],
    refs: [],
    accountCurrency: "UZS",
  },
  {
    id: 505,
    accountId: 302,
    categoryId: 404,
    created: "2026-04-27T18:20:00.000Z",
    amount: -142.3,
    comment: "Weekend market #food",
    tags: ["food"],
    refs: [],
    accountCurrency: "PLN",
  },
  {
    id: 506,
    accountId: 301,
    categoryId: 405,
    created: "2026-04-26T10:10:00.000Z",
    amount: -32,
    comment: "Airport train #transport",
    tags: ["transport"],
    refs: [],
    accountCurrency: "USD",
  },
];
