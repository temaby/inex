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
  runVisualQaScript,
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
  dashboard: loadFixture(
    path.join(clientRoot, "src/test/fixtures/dashboardVisualFixture.ts"),
    "Dashboard fixture is missing.",
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
  { page: "dashboard", name: "dashboard-1440", screenshot: "dashboard-hero-1440.png", viewport: { width: 1440, height: 1000 }, routePath: "/dashboard" },
  { page: "transactions", name: "transactions-390", screenshot: "transactions-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/transactions" },
  { page: "accounts", name: "accounts-390", screenshot: "accounts-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/accounts" },
  { page: "categories", name: "categories-390", screenshot: "categories-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/categories" },
  { page: "budgets", name: "budgets-390", screenshot: "budgets-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/budgets?year=2026&month=4" },
  { page: "dashboard", name: "dashboard-390", screenshot: "dashboard-hero-390.png", viewport: { width: 390, height: 900 }, routePath: "/dashboard" },
];

function withCurrencyNames(currencies) {
  return currencies.map((currency) => ({ ...currency, name: currency.name ?? currency.key }));
}

function fixtureFor(page) {
  return fixtures[page];
}

function dashboardBudgetReportForMonth(fixture, month) {
  if (month === "3") {
    return fixture.dashboardVisualFixturePreviousBudgetReport;
  }
  return fixture.dashboardVisualFixtureCurrentBudgetReport;
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
        if (page === "dashboard") return jsonResponse(fixture.dashboardVisualFixtureCurrencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        if (page === "transactions") return jsonResponse({ data: fixture.transactionsVisualFixtureRates });
        if (page === "accounts") return jsonResponse({ data: fixture.accountsVisualFixtureRates });
        if (page === "categories") return jsonResponse({ data: fixture.categoriesVisualFixtureRates });
        if (page === "budgets") return jsonResponse({ data: fixture.budgetsVisualFixtureRates });
        if (page === "dashboard") return jsonResponse({ data: fixture.dashboardVisualFixtureRates });
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
      if (url.pathname === "/api/reports/budget/comparison" && method === "GET" && page === "dashboard") {
        return jsonResponse(dashboardBudgetReportForMonth(fixture, url.searchParams.get("month")));
      }
      if (url.pathname === "/api/reports/net-worth" && method === "GET" && page === "dashboard") {
        return jsonResponse(fixture.dashboardVisualFixtureNetWorthHistory);
      }
      if (url.pathname === "/api/reports/spending-heatmap" && method === "GET" && page === "dashboard") {
        return jsonResponse(fixture.dashboardVisualFixtureHeatmapReport);
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
    dashboard: "Dashboard",
  }[state.page];

  await waitFor(client, `document.body.innerText.includes(${JSON.stringify(pageTitle)})`);
  if (state.page === "dashboard") {
    await waitFor(client, "document.querySelectorAll('[data-qa=\"dashboard-top-card\"]').length === 4");
    await waitFor(client, "document.querySelectorAll('[data-qa=\"dashboard-card-currency\"]').length >= 3");
    return;
  }
  await waitFor(client, "Boolean(document.querySelector('[data-qa=\"hero-card\"]'))");
  await waitFor(client, "Boolean(document.querySelector('[data-qa=\"hero-primary-value\"]'))");
}

function initScriptForPage(page) {
  if (page === "transactions") return fixedDateInitScript(fixtures.transactions.transactionsVisualFixtureMeta.fixedNow, "en");
  if (page === "accounts") return fixedDateInitScript(fixtures.accounts.accountsVisualFixtureMeta.fixedNow, "en");
  if (page === "categories") return fixedDateInitScript(fixtures.categories.categoriesVisualFixtureMeta.fixedNow, "en");
  if (page === "budgets") return fixedDateInitScript(fixtures.budgets.budgetsVisualFixtureMeta.fixedNow, "en");
  if (page === "dashboard") return fixedDateInitScript(fixtures.dashboard.dashboardVisualFixtureMeta.fixedNow, "en");
  return localeInitScript("en");
}

async function collectMetrics(client, state, apiRequestCount) {
  await wait(150);

  const topMetrics = await evaluate(client, `(() => {
    const page = ${JSON.stringify(state.page)};
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
        letterSpacing: style.letterSpacing,
        color: style.color,
        textTransform: style.textTransform,
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
    const heroSummarySelector = {
      accounts: ".accounts-hero__net",
      categories: ".categories-hero__summary",
      budgets: ".budgets-hero__summary",
    }[page];
    const toolbarSelector = {
      accounts: ".accounts-toolbar__filters",
      categories: ".categories-list .inex-list-panel__filters",
      budgets: ".budgets-list .inex-list-panel__filters",
    }[page];
    const searchLabel = {
      accounts: "Search accounts",
      categories: "Search categories",
      budgets: "Search budgets",
    }[page];
    const hero = first('[data-qa="hero-card"]');
    const heroSummary = heroSummarySelector ? first(heroSummarySelector) : null;
    const toolbar = toolbarSelector ? first(toolbarSelector) : null;
    const searchControl = searchLabel
      ? first(\`input[type='search'][aria-label='\${searchLabel}']\`)?.parentElement
      : null;
    const controlLabelSelectors = {
      accounts: [
        ".accounts-toolbar__primary [role='group'] > span[id]",
        ".accounts-toolbar__filters [role='group'] > span[id]",
      ],
      categories: [
        ".categories-list .inex-list-panel__actions [role='group'] > span[id]",
        ".categories-list .inex-list-panel__filters [role='group'] > span[id]",
      ],
      budgets: [
        ".budgets-list .inex-list-panel__header [role='group'] > span[id]",
      ],
    }[page] ?? [];
    const toolbarLabels = controlLabelSelectors.map((selector) => styleSample(first(selector))).filter(Boolean);
    const accountsDeltaMain = first(".accounts-hero__delta-main");
    const accountsDeltaPeriod = first(".accounts-hero__delta-period");
    const budgetsHeader = first(".budgets-list .inex-list-panel__header");
    const budgetsSortGroup = first(".budgets-list .inex-list-panel__header [role='group']");
    const primaryValue = first('[data-qa="hero-primary-value"] [role="text"] > span') ?? first('[data-qa="hero-primary-value"]');
    const heroText = hero ? hero.textContent.trim().replace(/\\s+/g, " ") : "";
    const heroStyle = hero ? window.getComputedStyle(hero) : null;
    const heroContentLeft = hero && heroStyle
      ? hero.getBoundingClientRect().left + Number.parseFloat(heroStyle.borderLeftWidth || "0")
      : null;
    const toolbarStyle = toolbar ? window.getComputedStyle(toolbar) : null;
    const toolbarContentRight = toolbar && toolbarStyle
      ? toolbar.getBoundingClientRect().right - Number.parseFloat(toolbarStyle.paddingRight || "0")
      : null;
    const budgetsHeaderStyle = budgetsHeader ? window.getComputedStyle(budgetsHeader) : null;
    const budgetsHeaderContentRight = budgetsHeader && budgetsHeaderStyle
      ? budgetsHeader.getBoundingClientRect().right - Number.parseFloat(budgetsHeaderStyle.paddingRight || "0")
      : null;
    const marker = first('[data-qa="hero-distribution-legend"] span');
    const legendLabel = first('[data-qa="hero-distribution-legend"] strong');
    const legendAmount = first('[data-qa="hero-distribution-legend"] small, [data-qa="hero-distribution-legend"] .accounts-distribution__amount');
    const legendShare = first('[data-qa="hero-distribution-legend"] .accounts-distribution__share, [data-qa="hero-distribution-legend"] .categories-hero__legend-share');
    const dashboardTopCards = Array.from(document.querySelectorAll('[data-qa="dashboard-top-card"]'));
    const dashboardCardValues = dashboardTopCards.map((card) => {
      const value = card.querySelector('[data-qa="dashboard-card-value"]');
      return styleSample(value?.querySelector('[role="text"] > span') ?? value?.querySelector('span') ?? value);
    });
    const dashboardTopText = dashboardTopCards.map((card) => card.textContent.trim().replace(/\\s+/g, " ")).join(" | ");
    return {
      pageTitle: styleSample(first('[data-qa="page-title"]')),
      pageEyebrow: styleSample(first('[data-qa="page-eyebrow"]')),
      pagePrimaryAction: styleSample(first('[data-qa="page-primary-action"]')),
      heroCard: styleSample(hero),
      heroSummary: styleSample(heroSummary),
      heroDividerOffset: heroContentLeft !== null && heroSummary ? Math.round(heroSummary.getBoundingClientRect().right - heroContentLeft) : null,
      heroPrimaryLabel: styleSample(first('[data-qa="hero-primary-label"]')),
      heroPrimaryValue: styleSample(primaryValue),
      heroPrimaryValueText: primaryValue ? primaryValue.textContent.trim().replace(/\\s+/g, " ") : "",
      heroPrimaryValueHasDecimal: primaryValue ? /\\d[\\d,]*\\.\\d/.test(primaryValue.textContent) : null,
      heroPrimaryCurrencies: all('[data-qa="hero-primary-currency"]'),
      heroSecondaryText: styleSample(first('[data-qa="hero-secondary-text"]')),
      heroSecondaryTextHasDecimal: first('[data-qa="hero-secondary-text"]') ? /\\d[\\d,]*\\.\\d/.test(first('[data-qa="hero-secondary-text"]').textContent) : null,
      accountsDeltaPeriodOnOwnLine: Boolean(accountsDeltaMain && accountsDeltaPeriod && accountsDeltaPeriod.getBoundingClientRect().top >= accountsDeltaMain.getBoundingClientRect().bottom - 1),
      heroDistributionEyebrow: styleSample(first('[data-qa="hero-distribution-eyebrow"]')),
      heroDistributionBar: styleSample(first('[data-qa="hero-distribution-bar"]')),
      heroDistributionLegend: styleSample(first('[data-qa="hero-distribution-legend"]')),
      heroLegendMarker: styleSample(marker),
      heroLegendLabel: styleSample(legendLabel),
      heroLegendAmount: styleSample(legendAmount),
      heroLegendShare: styleSample(legendShare),
      toolbarSearch: styleSample(searchControl),
      toolbarSearchRightOffset: toolbarContentRight !== null && searchControl ? Math.round(toolbarContentRight - searchControl.getBoundingClientRect().right) : null,
      toolbarLabels,
      budgetsSortInHeader: Boolean(budgetsSortGroup && budgetsHeader && budgetsHeader.contains(budgetsSortGroup)),
      budgetsSearchInFilterRow: Boolean(searchControl && toolbar && toolbar.contains(searchControl)),
      budgetsSortRightOffset: budgetsHeaderContentRight !== null && budgetsSortGroup ? Math.round(budgetsHeaderContentRight - budgetsSortGroup.getBoundingClientRect().right) : null,
      budgetsSortAboveSearch: Boolean(budgetsSortGroup && searchControl && budgetsSortGroup.getBoundingClientRect().bottom <= searchControl.getBoundingClientRect().top),
      dashboardTopCards: dashboardTopCards.map(styleSample),
      dashboardCardTitles: all('[data-qa="dashboard-card-title"]'),
      dashboardCardValues,
      dashboardCardCurrencies: all('[data-qa="dashboard-card-currency"]'),
      dashboardCardDeltas: all('[data-qa="dashboard-card-delta"]'),
      dashboardTopText,
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
    const content = document.querySelector(".transactions-ledger, .accounts-workspace, .categories-workspace, .budgets-workspace, .dashboard-workspace");
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
  const expectedPages = ["transactions", "accounts", "categories", "budgets", "dashboard"];

  for (const width of [1440, 390]) {
    for (const page of expectedPages) {
      if (!stateResults.some((state) => state.page === page && state.viewport.width === width)) {
        failures.push(`${page}-${width}: missing from hero consistency states`);
      }
    }
  }

  for (const state of stateResults) {
    if (!state.pageTitle) failures.push(`${state.name}: missing page title selector`);
    if (!state.pageEyebrow) failures.push(`${state.name}: missing page eyebrow selector`);
    if (state.page !== "dashboard" && !state.pagePrimaryAction) failures.push(`${state.name}: missing page primary action selector`);

    if (state.page === "dashboard") {
      if (state.dashboardTopCards.length !== 4) failures.push(`${state.name}: expected 4 Dashboard top card selectors, found ${state.dashboardTopCards.length}`);
      if (state.dashboardCardTitles.length !== 4) failures.push(`${state.name}: expected 4 Dashboard card title selectors, found ${state.dashboardCardTitles.length}`);
      if (state.dashboardCardValues.length !== 4 || state.dashboardCardValues.some((value) => !value)) {
        failures.push(`${state.name}: expected 4 Dashboard card value selectors`);
      }
      if (state.dashboardCardCurrencies.length < 3) failures.push(`${state.name}: expected Dashboard currency selectors on the money cards`);
      if (state.dashboardCardDeltas.length !== 4) failures.push(`${state.name}: expected 4 Dashboard secondary delta selectors, found ${state.dashboardCardDeltas.length}`);
      if (/Quick month status lives here\. Use Reports when you need deeper analysis and drill-downs\./.test(state.bodyText)) {
        failures.push(`${state.name}: removed Dashboard subtitle copy is still visible`);
      }
      if (/Current month/.test(state.dashboardTopText)) {
        failures.push(`${state.name}: Dashboard top card still contains Current month`);
      }
    } else {
      if (!state.heroCard) failures.push(`${state.name}: missing hero card selector`);
      if (!state.heroPrimaryLabel) failures.push(`${state.name}: missing hero primary label selector`);
      if (!state.heroPrimaryValue) failures.push(`${state.name}: missing hero primary value selector`);
      if (!state.heroPrimaryCurrencies.length) failures.push(`${state.name}: missing hero primary currency selector`);
    }

    if (["accounts", "categories", "budgets"].includes(state.page) && state.heroPrimaryValueHasDecimal) {
      failures.push(`${state.name}: primary hero value still shows decimal digits: ${state.heroPrimaryValueText}`);
    }
    if (["accounts", "categories", "budgets"].includes(state.page) && state.heroSecondaryTextHasDecimal) {
      failures.push(`${state.name}: secondary hero value still shows decimal digits: ${state.heroSecondaryText?.text ?? ""}`);
    }

    if (state.page !== "transactions" && state.page !== "dashboard" && !state.heroDistributionBar) {
      failures.push(`${state.name}: missing distribution or burn bar selector`);
    }
    if (state.page !== "transactions" && state.page !== "dashboard" && !state.heroDistributionLegend) {
      failures.push(`${state.name}: missing distribution or burn legend selector`);
    }
    if (["accounts", "categories", "budgets"].includes(state.page) && !state.heroDistributionEyebrow) {
      failures.push(`${state.name}: missing distribution or burn-rate eyebrow selector`);
    }

    if (state.page === "accounts" && /\bMoM\b/.test(state.heroText)) {
      failures.push(`${state.name}: Accounts Net Worth still shows MoM`);
    }
    if (state.page === "accounts" && !state.heroText.includes("from May 2026")) {
      failures.push(`${state.name}: Accounts Net Worth is missing from May 2026`);
    }
    if (state.page === "accounts" && !state.accountsDeltaPeriodOnOwnLine) {
      failures.push(`${state.name}: Accounts period label is not on a separate line from the delta amount/percent`);
    }
    if (state.page === "accounts" && /USD equivalent/.test(state.heroText)) {
      failures.push(`${state.name}: Accounts hero still shows visible USD equivalent label`);
    }
    if (state.page === "accounts" && /By current balance/.test(state.heroText)) {
      failures.push(`${state.name}: Accounts hero still shows visible By current balance label`);
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
    if (state.page === "categories" && /\bMoM\b/.test(state.heroText)) {
      failures.push(`${state.name}: Categories hero still shows standalone MoM copy`);
    }
    if (state.page === "categories" && /\bChange from\b/.test(state.heroText)) {
      failures.push(`${state.name}: Categories hero still shows visible Change from period copy`);
    }
    if (state.page === "categories" && /USD equivalent/.test(state.heroText)) {
      failures.push(`${state.name}: Categories hero still shows visible USD equivalent label`);
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
    if (state.page === "budgets" && /\d[\d,]*\.\d{2}\s+[A-Z]{3}\s*\/\s*\d/.test(state.heroText)) {
      failures.push(`${state.name}: Budgets hero repeats currency before the rollup slash`);
    }
    if (state.page === "budgets") {
      if (state.heroDistributionEyebrow?.text !== "Burn rate") {
        failures.push(`${state.name}: Budgets burn-rate title is missing the distribution eyebrow selector`);
      }
      if (state.heroDistributionEyebrow?.textTransform !== "uppercase") {
        failures.push(`${state.name}: Budgets burn-rate title is not styled as an uppercase eyebrow`);
      }
      if (!state.budgetsSortInHeader) {
        failures.push(`${state.name}: Budgets Sort control is not in the top header row`);
      }
      if (!state.budgetsSearchInFilterRow) {
        failures.push(`${state.name}: Budgets search control is not in the filter row`);
      }
      if (!state.budgetsSortAboveSearch) {
        failures.push(`${state.name}: Budgets Sort control is not above the search control`);
      }
      if (state.viewport.width === 1440 && !near(state.budgetsSortRightOffset, 0, 2)) {
        failures.push(`${state.name}: Budgets Sort right alignment differs from the header edge`);
      }
    }
  }

  for (const width of [1440, 390]) {
    const widthStates = stateResults.filter((state) => state.viewport.width === width);
    const metricSizes = widthStates.filter((state) => state.page !== "dashboard").map((state) => ({
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

    const referenceState = widthStates.find((state) => state.page !== "dashboard" && state.heroPrimaryValue && state.heroPrimaryCurrencies.length > 0);
    const referenceWeight = widthStates.find((state) => state.page === "transactions")?.heroPrimaryValue?.fontWeight
      ?? widthStates.find((state) => state.page === "dashboard")?.dashboardCardValues.find(Boolean)?.fontWeight;
    if (referenceWeight) {
      for (const page of ["accounts", "categories", "budgets"]) {
        const state = widthStates.find((candidate) => candidate.page === page);
        if (state?.heroPrimaryValue?.fontWeight && state.heroPrimaryValue.fontWeight !== referenceWeight) {
          failures.push(`${state.name}: hero primary metric font weight differs from Dashboard/Transactions`);
        }
      }
    }
    const dashboardStates = widthStates.filter((state) => state.page === "dashboard");
    for (const dashboard of dashboardStates) {
      if (!referenceState) continue;

      for (const [index, title] of dashboard.dashboardCardTitles.entries()) {
        if (!near(numberFromPx(referenceState.heroPrimaryLabel?.fontSize), numberFromPx(title?.fontSize), 1)) {
          failures.push(`${dashboard.name}: Dashboard card title ${index + 1} font size differs from ${referenceState.name}`);
        }
        if (referenceState.heroPrimaryLabel?.fontWeight !== title?.fontWeight) {
          failures.push(`${dashboard.name}: Dashboard card title ${index + 1} font weight differs from ${referenceState.name}`);
        }
        if (referenceState.heroPrimaryLabel?.letterSpacing !== title?.letterSpacing) {
          failures.push(`${dashboard.name}: Dashboard card title ${index + 1} letter spacing differs from ${referenceState.name}`);
        }
      }

      for (const [index, value] of dashboard.dashboardCardValues.entries()) {
        if (!near(numberFromPx(referenceState.heroPrimaryValue?.fontSize), numberFromPx(value?.fontSize), width === 390 ? 4 : 3)) {
          failures.push(`${dashboard.name}: Dashboard card value ${index + 1} font size differs from ${referenceState.name}`);
        }
        if (!near(numberFromPx(referenceState.heroPrimaryValue?.lineHeight), numberFromPx(value?.lineHeight), width === 390 ? 6 : 4)) {
          failures.push(`${dashboard.name}: Dashboard card value ${index + 1} line height differs from ${referenceState.name}`);
        }
        if (referenceState.heroPrimaryValue?.fontWeight !== value?.fontWeight) {
          failures.push(`${dashboard.name}: Dashboard card value ${index + 1} font weight differs from ${referenceState.name}`);
        }
        if (referenceState.heroPrimaryValue?.fontFamily !== value?.fontFamily) {
          failures.push(`${dashboard.name}: Dashboard card value ${index + 1} font family differs from ${referenceState.name}`);
        }
      }

      const referenceCurrency = referenceState.heroPrimaryCurrencies[0];
      for (const [index, currency] of dashboard.dashboardCardCurrencies.entries()) {
        if (!near(numberFromPx(referenceCurrency?.fontSize), numberFromPx(currency?.fontSize), width === 390 ? 3 : 2)) {
          failures.push(`${dashboard.name}: Dashboard USD text ${index + 1} font size differs from ${referenceState.name}`);
        }
        if (referenceCurrency?.fontFamily !== currency?.fontFamily) {
          failures.push(`${dashboard.name}: Dashboard USD text ${index + 1} font family differs from ${referenceState.name}`);
        }
        if (referenceCurrency?.fontWeight !== currency?.fontWeight) {
          failures.push(`${dashboard.name}: Dashboard USD text ${index + 1} font weight differs from ${referenceState.name}`);
        }
      }
    }

    const accounts = widthStates.find((state) => state.page === "accounts");
    const categories = widthStates.find((state) => state.page === "categories");
    const budgets = widthStates.find((state) => state.page === "budgets");
    const accountsToolbarLabels = accounts?.toolbarLabels ?? [];
    const labelReference = accountsToolbarLabels.find((label) => label.text === "STATUS") ?? accountsToolbarLabels[0];
    if (labelReference) {
      for (const candidate of [
        ...(categories?.toolbarLabels ?? []),
        ...(budgets?.toolbarLabels ?? []),
      ]) {
        for (const property of ["fontSize", "fontWeight", "letterSpacing", "textTransform", "color"]) {
          if (labelReference[property] !== candidate[property]) {
            failures.push(`${candidate.text}-${width}: toolbar label ${property} differs from Accounts STATUS`);
          }
        }
      }
    }
    if (width === 1440) {
      const managementStates = [accounts, categories, budgets].filter(Boolean);
      const referenceSummary = accounts;
      for (const state of managementStates) {
        if (!near(referenceSummary?.heroSummary?.width, state.heroSummary?.width, 1)) {
          failures.push(`${state.name}: hero summary column width differs from ${referenceSummary?.name}`);
        }
        if (!near(referenceSummary?.heroDividerOffset, state.heroDividerOffset, 1)) {
          failures.push(`${state.name}: hero divider offset differs from ${referenceSummary?.name}`);
        }
        if (!near(referenceSummary?.toolbarSearch?.width, state.toolbarSearch?.width, 1)) {
          failures.push(`${state.name}: toolbar search width differs from ${referenceSummary?.name}`);
        }
        if (!near(referenceSummary?.toolbarSearchRightOffset, state.toolbarSearchRightOffset, 2)) {
          failures.push(`${state.name}: toolbar search right alignment differs from ${referenceSummary?.name}`);
        }
      }
    }
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
    const eyebrowStates = [accounts, categories, budgets].filter((state) => state?.heroDistributionEyebrow);
    const eyebrowReference = accounts;
    for (const candidate of eyebrowStates) {
      for (const property of ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform"]) {
        if (eyebrowReference?.heroDistributionEyebrow?.[property] !== candidate.heroDistributionEyebrow?.[property]) {
          failures.push(`${candidate.name}: distribution/burn-rate eyebrow ${property} differs from ${eyebrowReference?.name}`);
        }
      }
    }
    if (accounts?.heroDistributionLegend && categories?.heroDistributionLegend) {
      if (accounts.heroDistributionLegend.gap !== categories.heroDistributionLegend.gap) {
        failures.push(`accounts/categories-${width}: distribution legend gap differs`);
      }
    }
    for (const [metric, label] of [
      ["heroLegendLabel", "legend label"],
      ["heroLegendAmount", "legend amount"],
      ["heroLegendShare", "legend share"],
    ]) {
      if (accounts?.[metric] && categories?.[metric]) {
        for (const property of ["fontSize", "fontWeight", "fontFamily", "lineHeight"]) {
          if (accounts[metric][property] !== categories[metric][property]) {
            failures.push(`accounts/categories-${width}: distribution ${label} ${property} differs`);
          }
        }
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
      note: "Compares top-section selectors, typography including main metric weight, distribution treatment, accepted Budgets burn-rate legend placement, Dashboard summary-card treatment, Budgets rollup currency repetition, Categories previous-period copy, text removals, overflow, and bottom-nav clearance across Transactions, Accounts, Categories, Budgets, and Dashboard.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
    },
    acceptedDeviations: [
      {
        page: "budgets",
        deviation: "Burn-rate legend remains above the bars while the title uses the shared eyebrow treatment.",
        rationale: "Budgets is a burn-rate chart/list, not a category distribution summary.",
        date: "2026-06-14",
      },
    ],
    assertions: [
      "Accounts, Categories, and Budgets hero summary width and divider offset match at desktop width",
      "Accounts, Categories, and Budgets primary hero values are rounded with no visible decimal digits",
      "Accounts, Categories, and Budgets secondary hero summary values are rounded with no visible decimal digits",
      "Accounts hero period label is on a separate line from the delta amount/percent",
      "Categories hero does not show visible Change from period copy",
      "Accounts, Categories, and Budgets distribution/burn-rate eyebrow typography matches",
      "Accounts, Categories, and Budgets toolbar search width and right alignment match at desktop width",
      "Budgets Sort control is right-aligned in the top toolbar row above search",
      "Budgets search control remains in the filter row",
      "Budgets Sort, Categories Status, and Categories View label typography matches Accounts STATUS/VIEW",
      "Accounts and Categories distribution legend spacing matches",
      "Accounts and Categories legend marker dimensions match",
      "Accounts and Categories legend label, amount, and percentage typography matches",
      "Accounts hero does not show MoM, visible USD equivalent distribution label, or visible By current balance label",
      "Categories hero does not show visible USD equivalent distribution label",
      "Accounts hero shows from May 2026 for the fixed visual QA date",
    ],
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5205,
  fixture: fixtures,
  states: states.map((state) => ({ ...state, scenario: state.page, screenshotMode: "viewport" })),
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Hero consistency",
  userDataPrefix: "inex-hero-consistency-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
