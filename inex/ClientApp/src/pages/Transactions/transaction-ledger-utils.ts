import dayjs from "dayjs";

import type { CategoryResponse } from "../../store/categories/categories-api";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";

export type LedgerTypeFilter = "all" | "income" | "expense" | "transfer";
export type LedgerTransactionKind = Exclude<LedgerTypeFilter, "all">;

export interface LedgerUiFilter {
  type: LedgerTypeFilter;
  search: string;
  minAmount: string;
  maxAmount: string;
}

export interface LedgerSummary {
  income: number;
  expense: number;
  net: number;
}

export interface LedgerTypeCounts {
  all: number;
  income: number;
  expense: number;
  transfer: number;
}

export interface LedgerMetrics extends LedgerSummary {
  visibleCount: number;
  totalCount: number;
  typeCounts: LedgerTypeCounts;
}

export interface ExchangeRateLike {
  currencyFrom: string;
  currencyTo: string;
  rate: number;
}

export interface BaseCurrencyEquivalent {
  currency: string;
  value: number;
}

export const emptyLedgerFilter: LedgerUiFilter = {
  type: "all",
  search: "",
  minAmount: "",
  maxAmount: "",
};

export const emptyLedgerMetrics: LedgerMetrics = {
  income: 0,
  expense: 0,
  net: 0,
  visibleCount: 0,
  totalCount: 0,
  typeCounts: {
    all: 0,
    income: 0,
    expense: 0,
    transfer: 0,
  },
};

const sameCurrency = (left: string, right: string): boolean =>
  left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;

export const getBaseCurrencyCode = (exchangeRates: ExchangeRateLike[]): string =>
  exchangeRates[0]?.currencyFrom || "USD";

export const getBaseCurrencyEquivalent = (
  amount: number,
  accountCurrency: string,
  exchangeRates: ExchangeRateLike[],
): BaseCurrencyEquivalent | null => {
  const baseCurrency = getBaseCurrencyCode(exchangeRates);

  if (!baseCurrency || sameCurrency(accountCurrency, baseCurrency)) return null;

  const rate = exchangeRates.find((item) => sameCurrency(item.currencyTo, accountCurrency));
  if (!rate || rate.rate <= 0) return null;

  return {
    currency: baseCurrency,
    value: amount / rate.rate,
  };
};

export const toBaseCurrencyAmount = (
  amount: number,
  accountCurrency: string,
  exchangeRates: ExchangeRateLike[],
): number | null => {
  const baseCurrency = getBaseCurrencyCode(exchangeRates);

  if (sameCurrency(accountCurrency, baseCurrency)) return amount;

  return getBaseCurrencyEquivalent(amount, accountCurrency, exchangeRates)?.value ?? null;
};

export const getTransactionKind = (
  transaction: TransactionResponse,
  category?: CategoryResponse,
): LedgerTransactionKind => {
  if (category?.isSystem) return "transfer";
  return transaction.amount >= 0 ? "income" : "expense";
};

export const getLedgerTypeCounts = (
  transactions: TransactionResponse[],
  categoriesById: Map<number, CategoryResponse>,
): LedgerTypeCounts => {
  const counts: LedgerTypeCounts = {
    all: transactions.length,
    income: 0,
    expense: 0,
    transfer: 0,
  };

  for (const transaction of transactions) {
    const kind = getTransactionKind(transaction, categoriesById.get(transaction.categoryId));
    counts[kind] += 1;
  }

  return counts;
};

export const getCategoryPathLabel = (
  category: CategoryResponse | undefined,
  categoriesById: Map<number, CategoryResponse>,
): string | undefined => {
  if (!category) return undefined;
  if (category.isSystem) return category.name;

  const path: string[] = [];
  const visited = new Set<number>();
  let current: CategoryResponse | undefined = category;

  while (current && !visited.has(current.id)) {
    path.unshift(current.name);
    visited.add(current.id);
    current = current.parentId ? categoriesById.get(current.parentId) : undefined;
  }

  return path.join(" > ");
};

export const getFriendlyTransactionDayLabel = (
  date: string,
  labels: { today: string; yesterday: string },
  now: string | Date = new Date(),
): string => {
  const parsed = dayjs(date);
  const current = dayjs(now);

  if (parsed.isSame(current, "day")) return labels.today;
  if (parsed.isSame(current.subtract(1, "day"), "day")) return labels.yesterday;

  return parsed.year() === current.year()
    ? parsed.format("dddd, D MMM")
    : parsed.format("dddd, D MMM YYYY");
};

export const formatTransactionPeriodLabel = (range: number[], fallback: string): string => {
  if (range.length !== 2 || range[0] <= 0 || range[1] <= 0) {
    return fallback;
  }

  return `${dayjs.unix(range[0]).format("D MMM YYYY")} - ${dayjs.unix(range[1]).format("D MMM YYYY")}`;
};
