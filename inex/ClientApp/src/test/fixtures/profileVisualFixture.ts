import type { AuthUser } from "../../store/auth/auth-slice";

export const profileVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Profile & Settings mockup parity",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedTabCount: 2,
  expectedCardCount: 2,
  expectedFormCount: 2,
  expectedOverviewMetricCount: 3,
  expectedCurrencyCount: 3,
  nonApplicableStates: ["filter-empty", "first-use-empty", "drawer-open", "expanded-row", "collapsed-group"],
} as const;

export const profileVisualFixtureUser: AuthUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

export const profileVisualFixtureUpdatedUser: AuthUser = {
  ...profileVisualFixtureUser,
  username: "QA Visual",
  currencyId: 2,
};

export const profileVisualFixtureCurrencies = [
  { id: 1, key: "USD", name: "US Dollar" },
  { id: 2, key: "PLN", name: "Polish Zloty" },
  { id: 3, key: "UZS", name: "Uzbek Som" },
] as const;

export const profileVisualFixtureRates = [
  { id: 1, currencyFrom: "USD", currencyTo: "PLN", date: "2026-04-30", rate: 4, isTemporary: false },
  { id: 2, currencyFrom: "USD", currencyTo: "UZS", date: "2026-04-30", rate: 12000, isTemporary: false },
] as const;
