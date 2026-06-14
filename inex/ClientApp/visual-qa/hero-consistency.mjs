import path from "node:path";

import {
  buildCommonChecks,
  createApiFixtureHandler,
  evaluate,
  fixedDateInitScript,
  jsonResponse,
  loadFixture,
  localeInitScript,
  playwrightInstalled,
  problemResponse,
  resolveVisualQaPaths,
  runBrowserState,
  runVisualQa,
  wait,
  waitFor,
} from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/hero-consistency");

const fixtures = {
  transactions: loadFixture(
    path.join(clientRoot, "src/test/fixtures/transactionsVisualFixture.ts"),
    "Transactions fixture is missing.",
  ),
  accounts: loadFixture(
    path.join(clientRoot, "src/test/fixtures/accountsVisualFixture.ts"),
    "Accounts fixture is missing.",
  ),
  categories: loadFixture(
    path.join(clientRoot, "src/test/fixtures/categoriesVisualFixture.ts"),
    "Categories fixture is missing.",
  ),
  budgets: loadFixture(
    path.join(clientRoot, "src/test/fixtures/budgetsVisualFixture.ts"),
    "Budgets fixture is missing.",
  ),
};

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const states = [
  { page: "transactions", name: "transactions-1440", screenshot: "transactions-hero-1440.png", viewport: { width: 1440, height: 1000 }, routePath: "/transactions" },
  { page: "accounts", name: "accounts-1440", screenshot: "accounts-hero-1440.png", viewport: { width: 1440, height: 1000 }, routePath: "/accounts" },
  { page: "categories", name: "categories-1440", screenshot: "categories-hero-1440.png", viewport: { width: 1440, height: 1000 }, routePath: "/categories" },
  { page: "budgets", name: "budgets-1440", screenshot: "budgets-hero-1440.png", viewport: { width: 1440, height: 1000 }, routePath: "/budgets?year=2026&month=4" },
  { page: "transactions", name: "transactions-390", screenshot: "transactions-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/transactions" },
  { page: "accounts", name: "accounts-390", screenshot: "accounts-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/accounts" },
  { page: "categories", name: "categories-390", screenshot: "categories-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/categories" },
  { page: "budgets", name: "budgets-390", screenshot: "budgets-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/budgets?year=2026&month=4" },
];

function withCurrencyNames(currencies) {
  return currencies.map((currency) => ({ ...currency, name: currency.name ?? currency.key }));
}

function fixtureFor(page) {
  return fixtures[page];
}

function createApiHandler(_fixture, requestLog, unhandledApiRequests, scenarioRef) {
  return createApiFixtureHandler({
    requestLog,
    unhandledApiRequests,
    scenarioRef,
    handleRequest: ({ url, method, scenario }) => {
      const page = scenario;
      const fixture = fixtureFor(page);

      if (url.pathname === "/api/auth/refresh" && method === "POST") {
        return jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
      }
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return jsonResponse(authUser);
      }
      if (url.pathname === "/api/currencies" && method === "GET") {
        if (page === "accounts") return jsonResponse(withCurrencyNames(fixture.accountsVisualFixtureCurrencies));
        if (page === "categories") return jsonResponse(fixture.categoriesVisualFixtureCurrencies);
        if (page === "budgets") return jsonResponse(fixture.budgetsVisualFixtureCurrencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        if (page === "transactions") return jsonResponse({ data: fixture.transactionsVisualFixtureRates });
        if (page === "accounts") return jsonResponse({ data: fixture.accountsVisualFixtureRates });
        if (page === "categories") return jsonResponse({ data: fixture.categoriesVisualFixtureRates });
        if (page === "budgets") return jsonResponse({ data: fixture.budgetsVisualFixtureRates });
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        if (page === "transactions") return jsonResponse({ data: fixture.transactionsVisualFixtureAccounts });
        if (page === "accounts") return jsonResponse({ data: fixture.accountsVisualFixtureAccounts });
      }
      if (url.pathname === "/api/accounts/details" && method === "GET" && page === "accounts") {
        return jsonResponse({ data: fixture.accountsVisualFixtureSummaries });
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        if (page === "transactions") return jsonResponse({ data: fixture.transactionsVisualFixtureCategories });
        if (page === "categories") return jsonResponse({ data: fixture.categoriesVisualFixtureCategories });
        if (page === "budgets") return jsonResponse({ data: fixture.budgetsVisualFixtureCategories });
      }
      if (url.pathname === "/api/transactions" && method === "GET") {
        if (page === "transactions") {
          return jsonResponse({
            data: fixture.transactionsVisualFixtureTransactions,
            metadata: { totalItems: fixture.transactionsVisualFixtureTransactions.length },
          });
        }
        if (page === "categories") {
          return jsonResponse({
            data: fixture.categoriesVisualFixtureTransactions,
            metadata: { totalItems: fixture.categoriesVisualFixtureTransactions.length },
          });
        }
      }
      if (url.pathname === "/api/budgets" && method === "GET") {
        if (page === "categories") return jsonResponse({ data: fixture.categoriesVisualFixtureBudgets });
        if (page === "budgets") return jsonResponse({ data: fixture.budgetsVisualFixtureBudgets });
      }
      if (url.pathname === "/api/reports/budget/comparison" && method === "GET" && page === "budgets") {
        return jsonResponse(fixture.budgetsVisualFixtureReport);
      }

      return null;
    },
  });
}

async function applyInteraction() {}

async function waitForHeroReady(client, state) {
  const pageTitle = {
    transactions: "Transactions",
    accounts: "Accounts",
    categories: "Categories",
    budgets: "Budgets",
  }[state.page];

  await waitFor(client, `document.body.innerText.includes(${JSON.stringify(pageTitle)})`);
  await waitFor(client, "Boolean(document.querySelector('[data-qa=\"hero-card\"]'))");
  await waitFor(client, "Boolean(document.querySelector('[data-qa=\"hero-primary-value\"]'))");
}

function initScriptForPage(page) {
  if (page === "transactions") return fixedDateInitScript(fixtures.transactions.transactionsVisualFixtureMeta.fixedNow, "en");
  if (page === "categories") return fixedDateInitScript(fixtures.categories.categoriesVisualFixtureMeta.fixedNow, "en");
  if (page === "budgets") return fixedDateInitScript(fixtures.budgets.budgetsVisualFixtureMeta.fixedNow, "en");
  return localeInitScript("en");
}

async function collectMetrics(client, state, apiRequestCount) {
  await wait(150);

  const topMetrics = await evaluate(client, `(() => {
    const styleSample = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        text: element.textContent.trim().replace(/\\s+/g, " "),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        bottom: Math.round(rect.bottom),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
        paddingLeft: style.paddingLeft,
        gap: style.gap,
        display: style.display,
        alignItems: style.alignItems,
      };
    };
    const first = (selector) => document.querySelector(selector);
    const all = (selector) => Array.from(document.querySelectorAll(selector)).map(styleSample);
    const hero = first('[data-qa="hero-card"]');
    const primaryValue = first('[data-qa="hero-primary-value"] [role="text"] > span') ?? first('[data-qa="hero-primary-value"]');
    const heroText = hero ? hero.textContent.trim().replace(/\\s+/g, " ") : "";
    const marker = first('[data-qa="hero-distribution-legend"] span');
    return {
      pageTitle: styleSample(first('[data-qa="page-title"]')),
      pageEyebrow: styleSample(first('[data-qa="page-eyebrow"]')),
      pagePrimaryAction: styleSample(first('[data-qa="page-primary-action"]')),
      heroCard: styleSample(hero),
      heroPrimaryLabel: styleSample(first('[data-qa="hero-primary-label"]')),
      heroPrimaryValue: styleSample(primaryValue),
      heroPrimaryCurrencies: all('[data-qa="hero-primary-currency"]'),
      heroSecondaryText: styleSample(first('[data-qa="hero-secondary-text"]')),
      heroDistributionBar: styleSample(first('[data-qa="hero-distribution-bar"]')),
      heroDistributionLegend: styleSample(first('[data-qa="hero-distribution-legend"]')),
      heroLegendMarker: styleSample(marker),
      heroText,
      bodyText: document.body.innerText.replace(/\\s+/g, " ").trim(),
    };
  })()`);

  await evaluate(client, "window.scrollTo(0, document.documentElement.scrollHeight)");
  await wait(150);

  const bottomMetrics = await evaluate(client, `(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const bottomNav = document.querySelector(".r-bottom-nav");
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    const bottomNavVisible = Boolean(bottomNav && bottomNavStyle && bottomNavStyle.display !== "none" && bottomNav.getBoundingClientRect().height > 0);
    const bottomNavRect = bottomNavVisible ? bottomNav.getBoundingClientRect() : null;
    const content = document.querySelector(".transactions-ledger, .accounts-workspace, .categories-workspace, .budgets-workspace");
    const contentRect = content ? content.getBoundingClientRect() : null;
    return {
      title: document.title,
      scrollWidth: documentElement.scrollWidth,
      clientWidth: documentElement.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      hasHorizontalOverflow: documentElement.scrollWidth > documentElement.clientWidth || body.scrollWidth > body.clientWidth,
      bottomNavVisible,
      bottomNavOccludesLastContent: Boolean(bottomNavVisible && contentRect && contentRect.bottom > bottomNavRect.top - 4),
      bottomNavTop: bottomNavRect ? bottomNavRect.top : null,
      lastContentBottom: contentRect ? contentRect.bottom : null,
    };
  })()`);

  return {
    name: state.name,
    page: state.page,
    dataMode: "fixture",
    screenshot: state.screenshot,
    viewport: state.viewport,
    scenario: state.page,
    interaction: null,
    drawerOpen: false,
    drawerWithinViewport: null,
    apiRequestCount,
    ...bottomMetrics,
    ...topMetrics,
  };
}

function runState(args) {
  return runBrowserState({
    ...args,
    routePath: args.state.routePath,
    initScript: initScriptForPage(args.state.page),
    waitForReady: waitForHeroReady,
    applyInteraction,
    collectMetrics,
  });
}

function numberFromPx(value) {
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function near(left, right, tolerance = 2) {
  if (left === null || right === null) return false;
  return Math.abs(left - right) <= tolerance;
}

function collectAdditionalFailures(stateResults) {
  const failures = [];

  for (const state of stateResults) {
    if (!state.pageTitle) failures.push(`${state.name}: missing page title selector`);
    if (!state.pageEyebrow) failures.push(`${state.name}: missing page eyebrow selector`);
    if (!state.pagePrimaryAction) failures.push(`${state.name}: missing page primary action selector`);
    if (!state.heroCard) failures.push(`${state.name}: missing hero card selector`);
    if (!state.heroPrimaryLabel) failures.push(`${state.name}: missing hero primary label selector`);
    if (!state.heroPrimaryValue) failures.push(`${state.name}: missing hero primary value selector`);
    if (!state.heroPrimaryCurrencies.length) failures.push(`${state.name}: missing hero primary currency selector`);
    if (state.page !== "transactions" && !state.heroDistributionBar) {
      failures.push(`${state.name}: missing distribution or burn bar selector`);
    }
    if (state.page !== "transactions" && !state.heroDistributionLegend) {
      failures.push(`${state.name}: missing distribution or burn legend selector`);
    }

    if (state.page === "accounts" && /MoM/.test(state.heroText) && /Change from previous month/.test(state.heroText)) {
      failures.push(`${state.name}: Accounts Net Worth duplicates MoM and Change from previous month`);
    }
    if (state.page === "accounts" && /\b\d+\s+active\b/.test(state.heroText)) {
      failures.push(`${state.name}: Accounts Net Worth still shows active-count pill`);
    }
    if (state.page === "accounts" && /\b\d+\s+currencies\b/.test(state.heroText)) {
      failures.push(`${state.name}: Accounts Net Worth still shows currency-count pill`);
    }
    if (state.page === "categories" && !/% of total/.test(state.heroText)) {
      failures.push(`${state.name}: Categories hero is missing percent-of-total label`);
    }
    if (state.page === "budgets" && /Month planning/.test(state.heroText)) {
      failures.push(`${state.name}: Budgets hero still shows Month planning`);
    }
    if (state.page === "budgets" && /Compare budgeted amounts, current spend, and remaining room/.test(state.heroText)) {
      failures.push(`${state.name}: Budgets hero still shows removed descriptive sentence`);
    }
    if (state.page === "budgets" && !/Apr 2026 budget/.test(state.heroText)) {
      failures.push(`${state.name}: Budgets hero does not show selected-month title`);
    }
  }

  for (const width of [1440, 390]) {
    const widthStates = stateResults.filter((state) => state.viewport.width === width);
    const metricSizes = widthStates.map((state) => ({
      name: state.name,
      size: numberFromPx(state.heroPrimaryValue?.fontSize),
      lineHeight: numberFromPx(state.heroPrimaryValue?.lineHeight),
    }));
    const baseMetric = metricSizes.find((item) => item.size !== null);
    for (const item of metricSizes) {
      if (baseMetric && !near(baseMetric.size, item.size, width === 390 ? 4 : 3)) {
        failures.push(`${item.name}: hero primary metric font size differs from ${baseMetric.name}`);
      }
      if (baseMetric && baseMetric.lineHeight !== null && item.lineHeight !== null && !near(baseMetric.lineHeight, item.lineHeight, width === 390 ? 6 : 4)) {
        failures.push(`${item.name}: hero primary metric line height differs from ${baseMetric.name}`);
      }
    }

    const accounts = widthStates.find((state) => state.page === "accounts");
    const categories = widthStates.find((state) => state.page === "categories");
    if (accounts?.heroDistributionBar && categories?.heroDistributionBar) {
      const accountsHeight = accounts.heroDistributionBar.height;
      const categoriesHeight = categories.heroDistributionBar.height;
      if (!near(accountsHeight, categoriesHeight, 1)) {
        failures.push(`accounts/categories-${width}: distribution bar heights differ`);
      }
      if (accounts.heroDistributionBar.borderRadius !== categories.heroDistributionBar.borderRadius) {
        failures.push(`accounts/categories-${width}: distribution bar radius differs`);
      }
    }
    if (accounts?.heroLegendMarker && categories?.heroLegendMarker) {
      if (!near(accounts.heroLegendMarker.width, categories.heroLegendMarker.width, 1) ||
        !near(accounts.heroLegendMarker.height, categories.heroLegendMarker.height, 1)) {
        failures.push(`accounts/categories-${width}: legend marker size differs`);
      }
    }
  }

  return failures;
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  return {
    generatedAt: new Date().toISOString(),
    page: "hero-consistency",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Compares top-section selectors, typography, distribution treatment, accepted Budgets burn-rate legend placement, text removals, overflow, and bottom-nav clearance across Transactions, Accounts, Categories, and Budgets.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
    },
    acceptedDeviations: [
      {
        page: "budgets",
        deviation: "Burn-rate legend remains above the bars.",
        rationale: "Budgets is a burn-rate chart/list, not a distribution summary.",
        date: "2026-06-14",
      },
    ],
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

runVisualQa({
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5205,
  fixture: fixtures,
  states: states.map((state) => ({ ...state, scenario: state.page })),
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Hero consistency",
  userDataPrefix: "inex-hero-consistency-visual-qa",
}).catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
