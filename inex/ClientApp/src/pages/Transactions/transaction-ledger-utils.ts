import dayjs from "dayjs";

import type { CategoryResponse } from "../../store/categories/categories-api";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";

export type LedgerTypeFilter = "all" | "income" | "expense" | "transfer";
export type LedgerTransactionKind = Exclude<LedgerTypeFilter, "all">;
export type TransactionNavigationMode = "progressive" | "pagination";

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

export interface LedgerCurrencySummary {
  currency: string;
  income: number;
  expense: number;
  net: number;
}

export interface LedgerSummarySource {
  totalCount: number;
  typeCounts: LedgerTypeCounts;
  currencySummaries: LedgerCurrencySummary[];
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

export type TransactionMonthRange = [number, number];

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

export const getLedgerMetricsFromSummary = (
  summary: LedgerSummarySource,
  exchangeRates: ExchangeRateLike[],
): LedgerMetrics => {
  let income = 0;
  let expense = 0;

  for (const currencySummary of summary.currencySummaries) {
    const convertedIncome = toBaseCurrencyAmount(currencySummary.income, currencySummary.currency, exchangeRates);
    const convertedExpense = toBaseCurrencyAmount(currencySummary.expense, currencySummary.currency, exchangeRates);

    if (convertedIncome !== null) income += convertedIncome;
    if (convertedExpense !== null) expense += convertedExpense;
  }

  return {
    income,
    expense,
    net: income + expense,
    visibleCount: summary.totalCount,
    totalCount: summary.totalCount,
    typeCounts: summary.typeCounts,
  };
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

export const getTransactionMonthRange = (month: dayjs.ConfigType = new Date()): TransactionMonthRange => {
  const parsedMonth = dayjs(month);
  return [parsedMonth.startOf("month").unix(), parsedMonth.endOf("month").unix()];
};

export const getCurrentTransactionMonthRange = (now: dayjs.ConfigType = new Date()): TransactionMonthRange =>
  getTransactionMonthRange(now);

const getMonthAnchor = (range: number[]): dayjs.Dayjs =>
  range.length === 2 && range[0] > 0 ? dayjs.unix(range[0]) : dayjs();

export const shiftTransactionMonthRange = (range: number[], monthDelta: number): TransactionMonthRange =>
  getTransactionMonthRange(getMonthAnchor(range).add(monthDelta, "month"));

export const isWholeTransactionMonthRange = (range: number[]): boolean => {
  if (range.length !== 2 || range[0] <= 0 || range[1] <= 0) return false;

  const start = dayjs.unix(range[0]);
  const end = dayjs.unix(range[1]);
  return start.isSame(start.startOf("month"), "second") && end.isSame(start.endOf("month"), "second");
};

export const isCurrentOrFutureTransactionMonth = (
  range: number[],
  now: dayjs.ConfigType = new Date(),
): boolean =>
  getMonthAnchor(range).startOf("month").isSame(dayjs(now).startOf("month")) ||
  getMonthAnchor(range).startOf("month").isAfter(dayjs(now).startOf("month"));

export const formatTransactionMonthLabel = (range: number[], fallback: string): string => {
  if (range.length !== 2 || range[0] <= 0) return fallback;

  return dayjs.unix(range[0]).format("MMMM YYYY");
};

export const getTransactionNavigationMode = (range: number[]): TransactionNavigationMode => {
  if (range.length !== 2 || range[0] <= 0 || range[1] < range[0]) return "progressive";

  return dayjs.unix(range[1]).isAfter(dayjs.unix(range[0]).add(1, "month"))
    ? "pagination"
    : "progressive";
};

export interface ProgressivePageAccumulator<T> {
  key: string;
  nextPage: number;
  total: number;
  items: T[];
}

export const createProgressivePageAccumulator = <T>(key: string): ProgressivePageAccumulator<T> => ({
  key,
  nextPage: 1,
  total: 0,
  items: [],
});

export const appendSequentialPage = <T extends { id: number }>(
  accumulator: ProgressivePageAccumulator<T>,
  key: string,
  page: number,
  total: number,
  items: T[],
): ProgressivePageAccumulator<T> => {
  if (accumulator.key !== key || page !== accumulator.nextPage) return accumulator;

  const existingIds = new Set(accumulator.items.map((item) => item.id));
  return {
    key,
    nextPage: page + 1,
    total,
    items: [...accumulator.items, ...items.filter((item) => !existingIds.has(item.id))],
  };
};

export const getProgressivePageDisplay = <T>(
  accumulator: ProgressivePageAccumulator<T>,
  requestKey: string,
  initialPage: { total: number; items: T[] } | undefined,
): { total: number; items: T[] } => {
  if (accumulator.key === requestKey && accumulator.nextPage > 1) {
    return { total: accumulator.total, items: accumulator.items };
  }

  return initialPage ?? { total: 0, items: [] };
};
