import { describe, expect, it } from "vitest";

import type { AccountResponse, AccountSummary } from "../../store/accounts/accounts-api";
import {
  buildDisplayAccounts,
  makeCurrencyGroups,
  sortAccountsByBaseValue,
  toBaseCurrencyAmount,
} from "./accounts-utils";

const accounts: AccountResponse[] = [
  {
    id: 1,
    key: "cash-usd",
    name: "Cash USD",
    description: null,
    isEnabled: true,
    currencyId: 1,
    currency: "USD",
  },
  {
    id: 2,
    key: "bank-pln",
    name: "Bank PLN",
    description: null,
    isEnabled: true,
    currencyId: 2,
    currency: "PLN",
  },
  {
    id: 3,
    key: "reserve-eur",
    name: "Reserve EUR",
    description: null,
    isEnabled: true,
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

describe("accounts value helpers", () => {
  it("returns base equivalents only when existing rate data supports them", () => {
    expect(toBaseCurrencyAmount(100, "USD", "USD", rates)).toBe(100);
    expect(toBaseCurrencyAmount(800, "PLN", "USD", rates)).toBe(200);
    expect(toBaseCurrencyAmount(20, "EUR", "USD", rates)).toBeNull();
    expect(toBaseCurrencyAmount(800, "PLN", "USD", [{ ...rates[0], rate: -4 }])).toBeNull();
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

  it("sorts currency groups by absolute base value while preserving native subtotals", () => {
    const displayAccounts = buildDisplayAccounts(accounts, summaries, "USD", rates);
    const groups = makeCurrencyGroups(displayAccounts, 300);

    expect(groups.map((group) => group.currency)).toEqual(["PLN", "USD", "EUR"]);
    expect(groups[0]).toMatchObject({
      currency: "PLN",
      subtotal: 800,
      baseSubtotal: 200,
      share: 66.66666666666666,
    });
    expect(groups[2].baseSubtotal).toBeNull();
  });

  it("does not calculate group base totals from partial summary data", () => {
    const displayAccounts = buildDisplayAccounts(accounts, summaries.slice(0, 2), "USD", rates);
    const groups = makeCurrencyGroups(displayAccounts, 300);

    expect(groups.find((group) => group.currency === "EUR")?.baseSubtotal).toBeNull();
    expect(groups.find((group) => group.currency === "EUR")?.share).toBeNull();
  });

  it("shows zero share instead of unavailable when all known base balances are zero", () => {
    const zeroSummaries = summaries.map((summary) => ({
      ...summary,
      value: 0,
      thisMonthNet: 0,
    }));
    const displayAccounts = buildDisplayAccounts(accounts.slice(0, 2), zeroSummaries.slice(0, 2), "USD", rates);
    const groups = makeCurrencyGroups(displayAccounts, 0);

    expect(groups.every((group) => group.baseSubtotal === 0)).toBe(true);
    expect(groups.every((group) => group.share === 0)).toBe(true);
  });
});
