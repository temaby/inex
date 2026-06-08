import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";

export interface ExchangeRateLike {
  currencyFrom: string;
  currencyTo: string;
  rate: number;
}

export interface AccountDisplay extends AccountResponse {
  value?: number;
  thisMonthNet?: number;
  baseValue: number | null;
  thisMonthNetBase: number | null;
}

export interface CurrencyGroup {
  currency: string;
  accounts: AccountDisplay[];
  subtotal: number;
  baseSubtotal: number | null;
  share: number | null;
  sortValue: number;
}

export const toFixedMoney = (value: number): number => Math.round(value * 100) / 100;

export const normalizeAccountSearch = (value: string): string => value.trim().toLowerCase();

export const getAccountDisplayDescription = (
  name: string,
  description: string | null,
): string | null => {
  const trimmedDescription = description?.trim();
  if (!trimmedDescription) return null;

  return normalizeAccountSearch(trimmedDescription) === normalizeAccountSearch(name)
    ? null
    : trimmedDescription;
};

export const getBaseCurrency = (
  exchangeRates: ExchangeRateLike[],
  profileCurrency?: string | null,
): string | null => profileCurrency?.trim() || exchangeRates[0]?.currencyFrom || null;

export const toBaseCurrencyAmount = (
  value: number,
  currency: string,
  baseCurrency: string | null,
  exchangeRates: ExchangeRateLike[],
): number | null => {
  if (!baseCurrency) return null;
  if (currency === baseCurrency) return value;

  const rate = exchangeRates.find((item) =>
    item.currencyFrom === baseCurrency && item.currencyTo === currency,
  );

  if (!rate || !Number.isFinite(rate.rate) || rate.rate <= 0) return null;

  return value / rate.rate;
};

export const buildDisplayAccounts = (
  accounts: AccountResponse[],
  summaries: AccountSummary[],
  baseCurrency: string | null,
  exchangeRates: ExchangeRateLike[],
): AccountDisplay[] => {
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));

  return accounts.map((account) => {
    const summary = summaryById.get(account.id);
    const baseValue = summary
      ? toBaseCurrencyAmount(summary.value, summary.currency, baseCurrency, exchangeRates)
      : null;
    const thisMonthNetBase = summary
      ? toBaseCurrencyAmount(summary.thisMonthNet, summary.currency, baseCurrency, exchangeRates)
      : null;

    return {
      ...account,
      value: summary?.value,
      thisMonthNet: summary?.thisMonthNet,
      baseValue,
      thisMonthNetBase,
    };
  });
};

const compareNames = (a: AccountDisplay, b: AccountDisplay): number => {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  if (byName !== 0) return byName;

  const byCurrency = a.currency.localeCompare(b.currency);
  if (byCurrency !== 0) return byCurrency;

  return a.id - b.id;
};

export const sortAccountsByBaseValue = (accounts: AccountDisplay[]): AccountDisplay[] =>
  [...accounts].sort((a, b) => {
    const aKnown = a.baseValue !== null;
    const bKnown = b.baseValue !== null;

    if (aKnown !== bKnown) return aKnown ? -1 : 1;

    if (aKnown && bKnown) {
      const byBaseValue = Math.abs(b.baseValue ?? 0) - Math.abs(a.baseValue ?? 0);
      if (byBaseValue !== 0) return byBaseValue;
    }

    return compareNames(a, b);
  });

export const getTotalBaseValue = (accounts: AccountDisplay[]): number =>
  accounts.reduce((sum, account) => sum + (account.baseValue ?? 0), 0);

export const getTotalAbsBaseValue = (accounts: AccountDisplay[]): number =>
  accounts.reduce((sum, account) => sum + Math.abs(account.baseValue ?? 0), 0);

export const hasBaseValues = (accounts: AccountDisplay[]): boolean =>
  accounts.some((account) => account.baseValue !== null);

export const makeCurrencyGroups = (
  items: AccountDisplay[],
  totalAbsBaseValue: number | null,
): CurrencyGroup[] => {
  const byCurrency = new Map<string, AccountDisplay[]>();
  for (const account of items) {
    byCurrency.set(account.currency, [...(byCurrency.get(account.currency) ?? []), account]);
  }

  return Array.from(byCurrency.entries())
    .map(([currency, groupAccounts]) => {
      const sortedAccounts = sortAccountsByBaseValue(groupAccounts);
      const hasCompleteBaseValues = groupAccounts.length > 0
        && groupAccounts.every((account) => account.value !== undefined && account.baseValue !== null);
      const subtotal = groupAccounts.reduce((sum, account) => sum + (account.value ?? 0), 0);
      const baseSubtotal = hasCompleteBaseValues
        ? groupAccounts.reduce((sum, account) => sum + (account.baseValue ?? 0), 0)
        : null;
      const sortValue = baseSubtotal === null
        ? 0
        : groupAccounts.reduce((sum, account) => sum + Math.abs(account.baseValue ?? 0), 0);
      const share = baseSubtotal !== null && totalAbsBaseValue !== null
        ? totalAbsBaseValue > 0
          ? (sortValue / totalAbsBaseValue) * 100
          : 0
        : null;

      return {
        currency,
        accounts: sortedAccounts,
        subtotal,
        baseSubtotal,
        share,
        sortValue,
      };
    })
    .sort((a, b) => {
      const aKnown = a.baseSubtotal !== null;
      const bKnown = b.baseSubtotal !== null;

      if (aKnown !== bKnown) return aKnown ? -1 : 1;

      const byBaseValue = b.sortValue - a.sortValue;
      if (byBaseValue !== 0) return byBaseValue;

      return a.currency.localeCompare(b.currency);
    });
};
