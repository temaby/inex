import path from "node:path";

import {
  buildCommonChecks,
  clickButtonByTextExpression,
  createApiFixtureHandler,
  evaluate,
  fixedDateInitScript,
  jsonResponse,
  loadFixture,
  playwrightInstalled,
  problemResponse,
  resolveVisualQaPaths,
  runBrowserState,
  runVisualQaScript,
  wait,
  waitFor,
} from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/accounts");
const fixturePath = path.join(clientRoot, "src/test/fixtures/accountsVisualFixture.ts");

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const defaultViewportHeight = 900;

const states = [
  {
    name: "populated-1440",
    screenshot: "populated-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
  },
  {
    name: "populated-flat-1024",
    screenshot: "populated-flat-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "select-flat-view",
  },
  {
    name: "populated-390",
    screenshot: "populated-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
  },
  {
    name: "populated-360",
    screenshot: "populated-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
  },
  {
    name: "filter-empty-390",
    screenshot: "filter-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "search-no-match",
  },
  {
    name: "first-use-empty-390",
    screenshot: "first-use-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "empty",
  },
  {
    name: "drawer-open-390",
    screenshot: "drawer-open-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-drawer",
  },
  {
    name: "drawer-open-360",
    screenshot: "drawer-open-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-drawer",
  },
  {
    name: "expanded-row-1440",
    screenshot: "expanded-row-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "expand-first-row",
  },
  {
    name: "expanded-row-390",
    screenshot: "expanded-row-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "expand-first-row",
  },
  {
    name: "collapsed-group-1440",
    screenshot: "collapsed-group-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "collapse-fixture-group",
  },
  {
    name: "collapsed-group-390",
    screenshot: "collapsed-group-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "collapse-fixture-group",
  },
  {
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "accounts-error",
  },
];

function withCurrencyNames(currencies) {
  return currencies.map((currency) => ({
    ...currency,
    name: currency.key,
  }));
}

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  const currencies = withCurrencyNames(fixture.accountsVisualFixtureCurrencies);

  return createApiFixtureHandler({
    requestLog,
    unhandledApiRequests,
    scenarioRef,
    handleRequest: ({ url, method, scenario }) => {
      if (url.pathname === "/api/auth/refresh" && method === "POST") {
        return jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
      }
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return jsonResponse(authUser);
      }
      if (url.pathname === "/api/currencies" && method === "GET") {
        return jsonResponse(currencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.accountsVisualFixtureRates });
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        if (scenario === "accounts-error") {
          return problemResponse("Accounts fixture failure", "Controlled Accounts load failure.", 500);
        }
        return jsonResponse({
          data: scenario === "empty" ? [] : fixture.accountsVisualFixtureAccounts,
        });
      }
      if (url.pathname === "/api/accounts/details" && method === "GET") {
        return jsonResponse({
          data: scenario === "empty" ? [] : fixture.accountsVisualFixtureSummaries,
        });
      }
      return null;
    },
  });
}

async function applyInteraction(client, state, fixture) {
  switch (state.interaction) {
    case "select-flat-view":
      await evaluate(client, clickButtonByTextExpression("Flat list"));
      await waitFor(client, "document.body.innerText.includes('UZS main wallet')");
      return;
    case "search-no-match":
      await evaluate(client, `(() => {
        const input = document.querySelector("input[type='search'][aria-label='Search accounts']");
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "zzzz-no-match");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('No accounts match')");
      return;
    case "open-drawer":
      await evaluate(client, clickButtonByTextExpression("Add account"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open'))");
      return;
    case "expand-first-row":
      await evaluate(client, `(() => {
        const row = document.querySelector(".accounts-row");
        if (!row) return false;
        row.click();
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('SNAPSHOT')");
      return;
    case "collapse-fixture-group":
      await evaluate(client, `(() => {
        const currency = ${JSON.stringify(fixture.accountsVisualFixtureMeta.collapsedStateCurrency)};
        const button = Array.from(document.querySelectorAll(".accounts-group__head"))
          .find((item) => item.textContent && item.textContent.includes(currency));
        if (!button) return false;
        button.click();
        return true;
      })()`);
      await waitFor(client, `(() => {
        const currency = ${JSON.stringify(fixture.accountsVisualFixtureMeta.collapsedStateCurrency)};
        const button = Array.from(document.querySelectorAll(".accounts-group__head"))
          .find((item) => item.textContent && item.textContent.includes(currency));
        return button && button.getAttribute("aria-expanded") === "false";
      })()`);
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function waitForAccountsReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Accounts') || document.body.innerText.includes('No accounts yet')");

  if (state.scenario === "accounts-error") {
    await waitFor(client, "document.body.innerText.includes('Accounts could not be loaded')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No accounts yet')");
  } else {
    await waitFor(client, "document.body.innerText.includes('UZS main wallet')");
  }
}

async function collectMetrics(client, state, apiRequestCount) {
  await evaluate(client, "window.scrollTo(0, document.documentElement.scrollHeight)");
  await wait(150);

  const metrics = await evaluate(client, `(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const bottomNav = document.querySelector(".r-bottom-nav");
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    const bottomNavVisible = Boolean(bottomNav && bottomNavStyle && bottomNavStyle.display !== "none" && bottomNav.getBoundingClientRect().height > 0);
    const bottomNavRect = bottomNavVisible ? bottomNav.getBoundingClientRect() : null;
    const content = document.querySelector(".accounts-workspace, .accounts-first-empty, .accounts-card");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const rows = Array.from(document.querySelectorAll(".accounts-row"));
    const groupButtons = Array.from(document.querySelectorAll(".accounts-group__head"));
    const groupShareBars = Array.from(document.querySelectorAll(".accounts-group__bar"));
    const hero = document.querySelector('[data-qa="hero-card"]');
    const heroSummary = document.querySelector(".accounts-hero__net");
    const distribution = document.querySelector(".accounts-distribution");
    const distributionEyebrow = document.querySelector('[data-qa="hero-distribution-eyebrow"]');
    const distributionSegments = Array.from(document.querySelectorAll(".accounts-distribution__segment"));
    const legendItems = Array.from(document.querySelectorAll(".accounts-distribution__item"));
    const legendMarkers = legendItems.map((item) => item.querySelector(".accounts-currency-dot"));
    const search = document.querySelector("input[type='search'][aria-label='Search accounts']")?.parentElement;
    const toolbarFilters = document.querySelector(".accounts-toolbar__filters");
    const colorOf = (element) => element ? window.getComputedStyle(element).backgroundColor : null;
    const geometry = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    };
    const styleSample = (element) => {
      if (!element) return null;
      const style = window.getComputedStyle(element);
      return {
        text: element.textContent.trim().replace(/\\s+/g, " "),
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
      };
    };
    const heroRect = geometry(hero);
    const heroSummaryRect = geometry(heroSummary);
    const heroStyle = hero ? window.getComputedStyle(hero) : null;
    const heroContentLeft = heroRect && heroStyle
      ? heroRect.left + Number.parseFloat(heroStyle.borderLeftWidth || "0")
      : null;
    const toolbarRect = geometry(toolbarFilters);
    const searchRect = geometry(search);
    const toolbarStyle = toolbarFilters ? window.getComputedStyle(toolbarFilters) : null;
    const toolbarContentRight = toolbarRect && toolbarStyle
      ? toolbarRect.right - Number.parseFloat(toolbarStyle.paddingRight || "0")
      : null;
    const collapsedGroups = groupButtons
      .filter((button) => button.getAttribute("aria-expanded") === "false")
      .map((button) => button.textContent.trim().replace(/\\s+/g, " ").slice(0, 80));

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
      drawerOpen: Boolean(drawer),
      drawerWithinViewport: drawerRect ? drawerRect.left >= 0 && drawerRect.right <= window.innerWidth : null,
      drawerBounds: drawerRect ? { left: drawerRect.left, right: drawerRect.right, width: drawerRect.width } : null,
      rowCount: rows.length,
      heroSummaryWidth: heroSummaryRect ? heroSummaryRect.width : null,
      heroDividerOffset: heroContentLeft !== null && heroSummaryRect ? heroSummaryRect.right - heroContentLeft : null,
      distributionEyebrow: styleSample(distributionEyebrow),
      toolbarSearchWidth: searchRect ? searchRect.width : null,
      toolbarSearchRightOffset: toolbarContentRight !== null && searchRect ? toolbarContentRight - searchRect.right : null,
      groupShareBarCount: groupShareBars.length,
      heroDistributionBarCount: document.querySelectorAll('[data-qa="hero-distribution-bar"]').length,
      distributionSegmentCount: distributionSegments.length,
      distributionLegendItemCount: legendItems.length,
      distributionSegmentColors: distributionSegments.map(colorOf),
      distributionLegendMarkerColors: legendMarkers.map(colorOf),
      distributionLegendLabels: legendItems.map((item) => {
        const label = item.querySelector(".accounts-distribution__copy strong");
        return label ? label.textContent.trim() : "";
      }),
      heroDistributionText: distribution ? distribution.innerText.replace(/\\s+/g, " ").trim() : "",
      momVisible: /\\bMoM\\b/.test(document.body.innerText),
      previousMonthVisible: document.body.innerText.includes(${JSON.stringify("from May 2026")}),
      usdEquivalentVisibleInHeroDistribution: distribution ? distribution.innerText.includes("USD equivalent") : false,
      byCurrentBalanceVisibleInHeroDistribution: distribution ? distribution.innerText.includes("By current balance") : false,
      maxRowHeight: rows.length ? Math.max(...rows.map((row) => row.getBoundingClientRect().height)) : null,
      collapsedGroups,
      loadErrorVisible: document.body.innerText.includes("Accounts could not be loaded"),
      filterEmptyVisible: document.body.innerText.includes("No accounts match"),
      firstUseEmptyVisible: document.body.innerText.includes("No accounts yet"),
      dataModeLabel: ${JSON.stringify("fixture")},
      apiRequestCount: ${apiRequestCount},
      textSample: document.body.innerText.replace(/\\s+/g, " ").trim().slice(0, 1400),
    };
  })()`);

  return {
    name: state.name,
    dataMode: "fixture",
    screenshot: state.screenshot,
    viewport: state.viewport,
    scenario: state.scenario,
    interaction: state.interaction ?? null,
    ...metrics,
  };
}

function collectAdditionalFailures(stateResults) {
  const failures = [];

  for (const state of stateResults) {
    const groupedPopulatedState = state.scenario === "populated" && state.interaction !== "select-flat-view";
    if (groupedPopulatedState && state.groupShareBarCount > 0) {
      failures.push(`${state.name}: currency groups still render per-group share bars`);
    }
    if (groupedPopulatedState && state.name.startsWith("populated") && state.heroDistributionBarCount < 1) {
      failures.push(`${state.name}: missing Accounts hero distribution bar`);
    }
    if (groupedPopulatedState && state.distributionSegmentCount !== state.distributionLegendItemCount) {
      failures.push(`${state.name}: Accounts distribution segment count ${state.distributionSegmentCount} does not match legend item count ${state.distributionLegendItemCount}`);
    }
    if (groupedPopulatedState && new Set(state.distributionSegmentColors).size !== state.distributionSegmentColors.length) {
      failures.push(`${state.name}: Accounts distribution segment colors are not unique`);
    }
    if (groupedPopulatedState && state.distributionSegmentColors.some((color, index) => color !== state.distributionLegendMarkerColors[index])) {
      failures.push(`${state.name}: Accounts legend marker colors do not match bar segment colors`);
    }
    if (groupedPopulatedState && state.momVisible) {
      failures.push(`${state.name}: Accounts hero still shows MoM`);
    }
    if (groupedPopulatedState && !state.previousMonthVisible) {
      failures.push(`${state.name}: Accounts hero is missing "from May 2026"`);
    }
    if (groupedPopulatedState && state.usdEquivalentVisibleInHeroDistribution) {
      failures.push(`${state.name}: Accounts hero distribution still shows visible USD equivalent label`);
    }
    if (groupedPopulatedState && state.byCurrentBalanceVisibleInHeroDistribution) {
      failures.push(`${state.name}: Accounts hero distribution still shows visible By current balance label`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && state.heroSummaryWidth !== 320) {
      failures.push(`${state.name}: Accounts hero summary column width ${state.heroSummaryWidth} does not match 320px`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && state.heroDividerOffset !== 320) {
      failures.push(`${state.name}: Accounts hero divider offset ${state.heroDividerOffset} does not match 320px`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && state.toolbarSearchWidth !== 260) {
      failures.push(`${state.name}: Accounts search width ${state.toolbarSearchWidth} does not match 260px`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && !nearZero(state.toolbarSearchRightOffset)) {
      failures.push(`${state.name}: Accounts search right offset ${state.toolbarSearchRightOffset} is not aligned to the toolbar edge`);
    }
    if (groupedPopulatedState && state.name.startsWith("populated")) {
      const expectedOrder = fixtureExports.accountsVisualFixtureMeta.expectedDistributionOrder;
      if (JSON.stringify(state.distributionLegendLabels) !== JSON.stringify(expectedOrder)) {
        failures.push(`${state.name}: Accounts distribution legend order ${JSON.stringify(state.distributionLegendLabels)} does not match ${JSON.stringify(expectedOrder)}`);
      }
    }
  }

  return failures;
}

function nearZero(value, tolerance = 2) {
  return typeof value === "number" && Math.abs(value) <= tolerance;
}

function runState(args) {
  return runBrowserState({
    ...args,
    routePath: "/accounts",
    initScript: fixedDateInitScript(args.fixture.accountsVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForAccountsReady,
    applyInteraction,
    collectMetrics,
  });
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "accounts",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/accountsVisualFixture.ts",
      baseline: fixture.accountsVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.accountsVisualFixtureMeta.expectedBaseCurrency,
      expectedNetWorth: fixture.accountsVisualFixtureMeta.expectedNetWorth,
      expectedDistributionOrder: fixture.accountsVisualFixtureMeta.expectedDistributionOrder,
      fixedNow: fixture.accountsVisualFixtureMeta.fixedNow,
      expectedPreviousMonthLabel: fixture.accountsVisualFixtureMeta.expectedPreviousMonthLabel,
      collapsedStateCurrency: fixture.accountsVisualFixtureMeta.collapsedStateCurrency,
    },
    assertions: [
      "distribution bar segment count equals legend item count",
      "displayed currency segment colors are unique",
      "legend marker colors match corresponding bar segment colors",
      "MoM is absent",
      "from May 2026 appears for the fixed visual QA date",
      "visible USD equivalent label is absent from Accounts hero distribution",
      "visible By current balance label is absent from Accounts hero distribution",
      "desktop hero summary column and divider are 320px from the hero card edge",
      "desktop search control is 260px wide and right-aligned in the toolbar",
    ],
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Accounts fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5198,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Accounts",
  userDataPrefix: "inex-accounts-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
