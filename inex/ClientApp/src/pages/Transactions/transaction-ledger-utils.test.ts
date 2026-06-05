import { describe, expect, it } from "vitest";

import type { CategoryResponse } from "../../store/categories/categories-api";
import type { TransactionResponse } from "../../model/Transaction/TransactionResponse";
import {
  getBaseCurrencyEquivalent,
  getCategoryPathLabel,
  getFriendlyTransactionDayLabel,
  getLedgerTypeCounts,
  toBaseCurrencyAmount,
} from "./transaction-ledger-utils";

const categories: CategoryResponse[] = [
  {
    id: 10,
    key: "food",
    name: "Food & Drink",
    description: null,
    parentId: null,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 11,
    key: "groceries",
    name: "Groceries",
    description: null,
    parentId: 10,
    isEnabled: true,
    isSystem: false,
    systemCode: null,
  },
  {
    id: 20,
    key: "transfer",
    name: "Transfer",
    description: null,
    parentId: null,
    isEnabled: true,
    isSystem: true,
    systemCode: "transfer",
  },
];

const categoryMap = new Map(categories.map((category) => [category.id, category]));

const transaction = (id: number, categoryId: number, amount: number): TransactionResponse => ({
  id,
  accountId: 1,
  categoryId,
  created: "2026-06-05T09:00:00Z",
  amount,
  comment: null,
  tags: [],
  refs: [],
  accountCurrency: "PLN",
});

describe("transaction ledger helpers", () => {
  it("uses localized friendly labels for today and yesterday", () => {
    const labels = { today: "Today", yesterday: "Yesterday" };
    const now = "2026-06-05T12:00:00Z";

    expect(getFriendlyTransactionDayLabel("2026-06-05T08:00:00Z", labels, now)).toBe("Today");
    expect(getFriendlyTransactionDayLabel("2026-06-04T20:00:00Z", labels, now)).toBe("Yesterday");
    expect(getFriendlyTransactionDayLabel("2026-06-01T08:00:00Z", labels, now)).toContain("Jun");
  });

  it("renders parent category paths while leaving system categories neutral", () => {
    expect(getCategoryPathLabel(categories[1], categoryMap)).toBe("Food & Drink > Groceries");
    expect(getCategoryPathLabel(categories[2], categoryMap)).toBe("Transfer");
  });

  it("returns base-currency equivalents only when matching rate data exists", () => {
    const rates = [
      { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-06-05", rate: 4, isTemporary: false },
    ];

    expect(getBaseCurrencyEquivalent(-80, "PLN", rates)).toEqual({ currency: "USD", value: -20 });
    expect(getBaseCurrencyEquivalent(-80, "USD", rates)).toBeNull();
    expect(getBaseCurrencyEquivalent(-80, "EUR", rates)).toBeNull();
    expect(toBaseCurrencyAmount(-80, "USD", rates)).toBe(-80);
    expect(toBaseCurrencyAmount(-80, "PLN", rates)).toBe(-20);
    expect(toBaseCurrencyAmount(-80, "EUR", rates)).toBeNull();
  });

  it("counts ledger types from category semantics", () => {
    expect(getLedgerTypeCounts([
      transaction(1, 11, 120),
      transaction(2, 11, -45),
      transaction(3, 20, -25),
    ], categoryMap)).toEqual({
      all: 3,
      income: 1,
      expense: 1,
      transfer: 1,
    });
  });
});
