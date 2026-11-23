import { describe, expect, it } from "vitest";

import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";
import {
  buildAccountOverview,
  buildDisplayAccounts,
  getAccountDisplayDescription,
  getBaseCurrency,
  sortAccountsByBaseValue,
  toFixedMoney,
  toBaseCurrencyAmount,
} from "./accounts-utils";
import {
  accountsVisualFixtureAccounts,
  accountsVisualFixtureMeta,
  accountsVisualFixtureRates,
  accountsVisualFixtureSummaries,
} from "../../test/fixtures/accountsVisualFixture";

const accounts: AccountResponse[] = [
  {
    id: 1,
    key: "cash-usd",
    name: "Cash USD",
    description: null,
    isEnabled: true,
    isFavourite: true,
    currencyId: 1,
    currency: "USD",
  },
  {
    id: 2,
    key: "bank-pln",
    name: "Bank PLN",
    description: null,
    isEnabled: true,
    isFavourite: true,
    currencyId: 2,
    currency: "PLN",
  },
  {
    id: 3,
    key: "reserve-eur",
    name: "Reserve EUR",
    description: null,
    isEnabled: true,
    isFavourite: true,
    currencyId: 3,
    currency: "EUR",
  },
];

const summaries: AccountSummary[] = [
  { ...accounts[0], value: 100, thisMonthNet: 10 },
  { ...accounts[1], value: 800, thisMonthNet: -80 },
  { ...accounts[2], value: 20, thisMonthNet: 0 },
];

const rates = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-06-05", rate: 4, isTemporary: false },
];

const getOverview = (accountSummaries: AccountSummary[], exchangeRates = rates) =>
  buildAccountOverview(buildDisplayAccounts(accounts, accountSummaries, "USD", exchangeRates), "Other");

describe("accounts value helpers", () => {
  it("does not invent USD when no profile or rate base is available", () => {
    expect(getBaseCurrency([], null)).toBeNull();
    expect(toBaseCurrencyAmount(100, "USD", null, [])).toBeNull();
  });

  it("returns base equivalents only when existing rate data supports them", () => {
    expect(toBaseCurrencyAmount(100, "USD", "USD", rates)).toBe(100);
    expect(toBaseCurrencyAmount(800, "PLN", "USD", rates)).toBe(200);
    expect(toBaseCurrencyAmount(20, "EUR", "USD", rates)).toBeNull();
    expect(toBaseCurrencyAmount(0, "EUR", "USD", rates)).toBe(0);
    expect(toBaseCurrencyAmount(800, "PLN", "USD", [{ ...rates[0], rate: -4 }])).toBeNull();
    expect(toBaseCurrencyAmount(Infinity, "USD", "USD", rates)).toBeNull();
    expect(toBaseCurrencyAmount(800, "PLN", "USD", [{ ...rates[0], rate: Number.MIN_VALUE }])).toBeNull();
  });

  it("builds display accounts without faking unavailable base values", () => {
    const displayAccounts = buildDisplayAccounts(accounts, summaries, "USD", rates);

    expect(displayAccounts.find((account) => account.currency === "PLN")?.baseValue).toBe(200);
    expect(displayAccounts.find((account) => account.currency === "EUR")?.baseValue).toBeNull();
  });

  it("sorts known base values by absolute value and uses deterministic tie-breakers", () => {
    const displayAccounts = buildDisplayAccounts(accounts, summaries, "USD", rates);

    expect(sortAccountsByBaseValue(displayAccounts).map((account) => account.name)).toEqual([
      "Bank PLN",
      "Cash USD",
      "Reserve EUR",
    ]);
  });

  it("sums multiple accounts per currency once and uses the net total for signed group and legend shares", () => {
    const extraAccount = { ...accounts[0], id: 4 };
    const displayAccounts = buildDisplayAccounts([...accounts, extraAccount], [
      summaries[0],
      { ...summaries[1], value: -80 },
      { ...summaries[2], value: 0 },
      { ...extraAccount, value: 20, thisMonthNet: 0 },
    ], "USD", rates);
    const overview = buildAccountOverview(displayAccounts, "Other");

    expect(overview.totalBaseValue).toBe(100);
    expect(overview.totalAbsBaseValue).toBe(140);
    expect(overview.groups).toMatchObject([
      { currency: "USD", accountCount: 2, subtotal: 120, baseSubtotal: 120, share: 120 },
      { currency: "PLN", subtotal: -80, baseSubtotal: -20, share: -20 },
      { currency: "EUR", subtotal: 0, baseSubtotal: 0, share: 0 },
    ]);
    expect(overview.distribution).toMatchObject([{ key: "USD", share: 120 }, { key: "PLN", share: -20 }]);
    expect(overview.distribution.reduce((total, group) => total + group.widthPercent, 0)).toBeCloseTo(100);
    expect(overview.distribution.every((group) => group.widthPercent > 0)).toBe(true);
    expect(overview.hasMixedSigns).toBe(true);
  });

  it("withholds all percentages when a nonzero balance cannot be converted", () => {
    const overview = getOverview(summaries);

    expect(overview.totalBaseValue).toBeNull();
    expect(overview.distributionUnavailable).toBe("ratesUnavailable");
    expect(overview.distribution).toEqual([]);
    expect(overview.groups.every((group) => group.share === null)).toBe(true);
    expect(overview.groups.find((group) => group.currency === "EUR")).toMatchObject({ subtotal: 20, baseSubtotal: null });
  });

  it.each([undefined, NaN])("keeps missing or invalid account balances separate from zero (%s)", (value) => {
    const overview = getOverview(value === undefined ? summaries.slice(0, 2) : [
      ...summaries.slice(0, 2), { ...summaries[2], value },
    ]);

    expect(overview.totalBaseValue).toBeNull();
    expect(overview.distributionUnavailable).toBe("balancesUnavailable");
    expect(overview.distribution).toEqual([]);
    expect(overview.groups.find((group) => group.currency === "PLN")).toMatchObject({ baseSubtotal: 200, share: null });
    expect(overview.groups.find((group) => group.currency === "EUR")).toMatchObject({ subtotal: null, baseSubtotal: null, share: null });
  });

  it("allows true zero balances without rates and does not produce zero-width distribution items", () => {
    const overview = getOverview(summaries.map((summary) => ({ ...summary, value: 0, thisMonthNet: 0 })), []);

    expect(overview.totalBaseValue).toBe(0);
    expect(overview.distributionUnavailable).toBeNull();
    expect(overview.distribution).toEqual([]);
    expect(overview.groups.every((group) => group.subtotal === 0 && group.baseSubtotal === 0)).toBe(true);
  });

  it("keeps the net zero total when currencies offset, with no signed percentages", () => {
    const overview = getOverview([summaries[0], { ...summaries[1], value: -400 }, { ...summaries[2], value: 0 }]);

    expect(overview.totalBaseValue).toBe(0);
    expect(overview.totalAbsBaseValue).toBe(200);
    expect(overview.distributionUnavailable).toBe("netZero");
    expect(overview.distribution).toEqual([]);
    expect(overview.groups.every((group) => group.share === null)).toBe(true);
  });

  it("suppresses blank and duplicate descriptions for display only", () => {
    expect(getAccountDisplayDescription("Cash wallet", null)).toBeNull();
    expect(getAccountDisplayDescription("Cash wallet", "   ")).toBeNull();
    expect(getAccountDisplayDescription("Cash wallet", " cash WALLET ")).toBeNull();
    expect(getAccountDisplayDescription("Cash wallet", "Daily spending")).toBe("Daily spending");
  });

  it("keeps the Accounts visual QA fixture stable without production data fallbacks", () => {
    const activeFixtureAccounts = accountsVisualFixtureAccounts.filter((account) => account.isEnabled);
    const activeFixtureSummaries = accountsVisualFixtureSummaries.filter((summary) => summary.isEnabled);
    const displayAccounts = buildDisplayAccounts(
      activeFixtureAccounts,
      activeFixtureSummaries,
      accountsVisualFixtureMeta.expectedBaseCurrency,
      accountsVisualFixtureRates,
    );
    const overview = buildAccountOverview(displayAccounts, "Other");

    expect(toFixedMoney(overview.totalBaseValue!)).toBe(accountsVisualFixtureMeta.expectedNetWorth);
    expect(overview.distribution.map((item) => item.label))
      .toEqual(accountsVisualFixtureMeta.expectedDistributionOrder);
    expect(overview.distribution.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100);
    expect(accountsVisualFixtureMeta.defaultCollapsedCurrencies).toEqual([]);
    expect(accountsVisualFixtureMeta.comparisonPeriodLabel).toBe("Mar 2026");
  });
});
