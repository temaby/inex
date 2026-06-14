import type { AuthUser } from "../../store/auth/auth-slice";

export const authVisualFixtureMeta = {
  dataMode: "fixture",
  locale: "en",
  baseline: "Auth mockup parity",
  fixedNow: "2026-04-30T12:00:00.000Z",
  expectedFeatureCount: 3,
  expectedLoginFormCount: 1,
  expectedRegisterFormCount: 1,
  expectedCurrencyCount: 3,
  nonApplicableStates: ["filter-empty", "first-use-empty", "drawer-open", "expanded-row", "collapsed-group", "mobile-bottom-nav"],
} as const;

export const authVisualFixtureUser: AuthUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 2,
  languageCode: "en",
};

export const authVisualFixtureCurrencies = [
  { id: 1, key: "USD", name: "US Dollar" },
  { id: 2, key: "EUR", name: "Euro" },
  { id: 3, key: "PLN", name: "Polish Zloty" },
] as const;
