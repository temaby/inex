import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";
import type { ExchangeRateLike } from "../../pages/Accounts/accounts-utils";

interface AccountsVisualFixtureRate extends ExchangeRateLike {
  id: number;
  date: string;
  isTemporary: boolean;
}

export const accountsVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Accounts mockup parity",
  fixedNow: "2026-06-14T12:00:00.000Z",
  comparisonPeriodLabel: "Mar 2026",
  expectedBaseCurrency: "USD",
  expectedNetWorth: 33968.12,
  expectedDistributionOrder: ["UZS", "USD", "PLN", "RUB", "BYN", "Other"],
  expectedPreviousMonthLabel: "May 2026",
  defaultCollapsedCurrencies: [],
  collapsedStateCurrency: "UZS",
} as const;

export const accountsVisualFixtureCurrencies = [
  { id: 1, key: "USD" },
  { id: 2, key: "UZS" },
  { id: 3, key: "PLN" },
  { id: 4, key: "BYN" },
  { id: 5, key: "RUB" },
  { id: 6, key: "GEL" },
] as const;

export const accountsVisualFixtureRates: AccountsVisualFixtureRate[] = [
  { id: 1, currencyFrom: "USD", currencyTo: "UZS", date: "2026-04-30", rate: 12000, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
  { id: 3, currencyFrom: "USD", currencyTo: "BYN", date: "2026-04-30", rate: 3.1, isTemporary: false },
  { id: 4, currencyFrom: "USD", currencyTo: "RUB", date: "2026-04-30", rate: 92, isTemporary: false },
  { id: 5, currencyFrom: "USD", currencyTo: "GEL", date: "2026-04-30", rate: 2.95, isTemporary: false },
];

export const accountsVisualFixtureAccounts: AccountResponse[] = [
  {
    id: 201,
    key: "uzs-main",
    name: "UZS main wallet",
    description: "Cash reserves",
    isEnabled: true,
    isVisibleInTransactions: true,
    currencyId: 2,
    currency: "UZS",
  },
  {
    id: 202,
    key: "usd-operating",
    name: "USD operating",
    description: "Payroll and vendors",
    isEnabled: true,
    isVisibleInTransactions: true,
    currencyId: 1,
    currency: "USD",
  },
  {
    id: 203,
    key: "pln-card",
    name: "PLN card",
    description: "Poland expenses",
    isEnabled: true,
    isVisibleInTransactions: true,
    currencyId: 3,
    currency: "PLN",
  },
  {
    id: 204,
    key: "byn-reserve",
    name: "BYN reserve",
    description: "Belarus reserve",
    isEnabled: true,
    isVisibleInTransactions: true,
    currencyId: 4,
    currency: "BYN",
  },
  {
    id: 205,
    key: "rub-savings",
    name: "RUB savings",
    description: "RUB savings",
    isEnabled: true,
    isVisibleInTransactions: true,
    currencyId: 5,
    currency: "RUB",
  },
  {
    id: 206,
    key: "gel-travel",
    name: "GEL travel",
    description: "Travel buffer",
    isEnabled: true,
    isVisibleInTransactions: true,
    currencyId: 6,
    currency: "GEL",
  },
  {
    id: 207,
    key: "usd-closed",
    name: "USD closed card",
    description: "Disabled card",
    isEnabled: false,
    isVisibleInTransactions: true,
    currencyId: 1,
    currency: "USD",
  },
];

export const accountsVisualFixtureSummaries: AccountSummary[] = [
  { ...accountsVisualFixtureAccounts[0], value: 199093440, thisMonthNet: 1200000 },
  { ...accountsVisualFixtureAccounts[1], value: 9200, thisMonthNet: 140 },
  { ...accountsVisualFixtureAccounts[2], value: 14500, thisMonthNet: -180 },
  { ...accountsVisualFixtureAccounts[3], value: 4200, thisMonthNet: 0 },
  { ...accountsVisualFixtureAccounts[4], value: 240000, thisMonthNet: 9200 },
  { ...accountsVisualFixtureAccounts[5], value: 1735.96, thisMonthNet: 260 },
  { ...accountsVisualFixtureAccounts[6], value: 0, thisMonthNet: 0 },
];
