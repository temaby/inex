import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";
import { buildTopDistribution } from "../../utils/distribution";

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
  accountCount: number;
  subtotal: number | null;
  baseSubtotal: number | null;
  share: number | null;
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
  if (!baseCurrency || !Number.isFinite(value)) return null;
  if (value === 0 || currency === baseCurrency) return value;

  const rate = exchangeRates.find((item) =>
    item.currencyFrom === baseCurrency && item.currencyTo === currency,
  );

  if (!rate || !Number.isFinite(rate.rate) || rate.rate <= 0) return null;

  const converted = value / rate.rate;
  return Number.isFinite(converted) ? converted : null;
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
    const value = summary && Number.isFinite(summary.value) ? summary.value : undefined;
    const thisMonthNet = summary && Number.isFinite(summary.thisMonthNet) ? summary.thisMonthNet : undefined;

    return {
      ...account,
      value,
      thisMonthNet,
      baseValue: summary && value !== undefined
        ? toBaseCurrencyAmount(value, summary.currency, baseCurrency, exchangeRates)
        : null,
      thisMonthNetBase: summary && thisMonthNet !== undefined
        ? toBaseCurrencyAmount(thisMonthNet, summary.currency, baseCurrency, exchangeRates)
        : null,
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

const sumKnownAmounts = (
  accounts: AccountDisplay[],
  getAmount: (account: AccountDisplay) => number | null | undefined,
): number | null => {
  let total = 0;
  for (const account of accounts) {
    const amount = getAmount(account);
    if (amount == null) return null;
    total += amount;
  }
  return Number.isFinite(total) ? total : null;
};

export const buildAccountOverview = (accounts: AccountDisplay[], otherLabel: string) => {
  const totalBaseValue = accounts.length > 0 ? sumKnownAmounts(accounts, (account) => account.baseValue) : null;
  const thisMonthNet = sumKnownAmounts(accounts, (account) => account.thisMonthNetBase);
  // Individual account rows retain their signed share of the absolute account balances.
  const totalAbsBaseValue = totalBaseValue === null ? null : sumKnownAmounts(accounts, (account) =>
    account.baseValue === null ? null : Math.abs(account.baseValue),
  );
  const byCurrency = new Map<string, AccountDisplay[]>();
  for (const account of accounts) {
    const group = byCurrency.get(account.currency);
    if (group) group.push(account);
    else byCurrency.set(account.currency, [account]);
  }

  const currencyTotals = Array.from(byCurrency.entries())
    .map(([currency, groupAccounts]) => {
      const subtotal = sumKnownAmounts(groupAccounts, (account) => account.value);
      const baseSubtotal = sumKnownAmounts(groupAccounts, (account) => account.baseValue);
      const sortValue = baseSubtotal === null
        ? 0
        : groupAccounts.reduce((sum, account) => sum + Math.abs(account.baseValue ?? 0), 0);
      const share = baseSubtotal !== null && totalBaseValue
        ? (baseSubtotal / totalBaseValue) * 100
        : null;

      return {
        currency,
        accounts: sortAccountsByBaseValue(groupAccounts),
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

  const hasUnavailableBalances = currencyTotals.some((group) => group.subtotal === null);
  const hasUnavailableRates = accounts.some((account) => account.value !== undefined && account.baseValue === null);
  const hasInvalidTotals = accounts.length > 0 && (totalBaseValue === null || totalAbsBaseValue === null
    || currencyTotals.some((group) => group.baseSubtotal === null || (group.share !== null && !Number.isFinite(group.share))));
  const distributionUnavailable = hasUnavailableBalances ? "balancesUnavailable"
    : hasUnavailableRates ? "ratesUnavailable"
      : hasInvalidTotals ? "valuesUnavailable"
        : totalBaseValue === 0 && totalAbsBaseValue !== 0 ? "netZero"
          : null;

  const groups: CurrencyGroup[] = currencyTotals.map((group) => ({
    currency: group.currency,
    accounts: group.accounts,
    accountCount: group.accounts.length,
    subtotal: group.subtotal,
    baseSubtotal: group.baseSubtotal,
    share: distributionUnavailable ? null : group.share,
  }));
  const distributionItems = groups.flatMap(({ currency, baseSubtotal, share }) =>
    baseSubtotal === null || baseSubtotal === 0 || share === null ? [] : [{
      key: currency,
      label: currency,
      value: Math.abs(baseSubtotal),
      payload: { baseSubtotal },
    }],
  ).sort((a, b) => b.value - a.value);
  const hasMixedSigns = distributionItems.some(({ payload }) => payload.baseSubtotal < 0)
    && distributionItems.some(({ payload }) => payload.baseSubtotal > 0);
  // Keep opposing balances visible instead of letting them cancel inside "Other".
  const distribution = totalBaseValue ? buildTopDistribution(distributionItems, {
    maxItems: hasMixedSigns ? distributionItems.length : undefined,
    otherLabel,
  }).map((item) => {
    const baseSubtotal = item.payload?.baseSubtotal ?? Math.sign(totalBaseValue) * item.value;
    return {
      key: item.key,
      label: item.label,
      baseSubtotal,
      share: (baseSubtotal / totalBaseValue) * 100,
      // The stacked bar uses magnitudes, since signed shares can be negative or above 100%.
      widthPercent: item.share * 100,
    };
  }) : [];

  return { totalBaseValue, totalAbsBaseValue, thisMonthNet, groups, distribution, distributionUnavailable, hasMixedSigns };
};
