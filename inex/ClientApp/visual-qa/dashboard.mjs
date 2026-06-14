import path from "node:path";

import {
  buildCommonChecks,
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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/dashboard");
const fixturePath = path.join(clientRoot, "src/test/fixtures/dashboardVisualFixture.ts");

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
    name: "populated-1024",
    screenshot: "populated-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
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
    name: "first-use-empty-390",
    screenshot: "first-use-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "empty",
  },
  {
    name: "summary-error-390",
    screenshot: "summary-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "summary-error",
  },
  {
    name: "net-worth-error-390",
    screenshot: "net-worth-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "net-worth-error",
  },
  {
    name: "heatmap-error-390",
    screenshot: "heatmap-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "heatmap-error",
  },
];

function budgetReportForMonth(fixture, month) {
  if (month === "3") {
    return fixture.dashboardVisualFixturePreviousBudgetReport;
  }
  return fixture.dashboardVisualFixtureCurrentBudgetReport;
}

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
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
        return jsonResponse(fixture.dashboardVisualFixtureCurrencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.dashboardVisualFixtureRates });
      }
      if (url.pathname === "/api/reports/budget/comparison" && method === "GET") {
        if (scenario === "summary-error") {
          return problemResponse("Dashboard summary fixture failure", "Controlled Dashboard summary failure.", 500);
        }
        if (scenario === "empty") {
          return jsonResponse(fixture.dashboardVisualFixtureEmptyBudgetReport);
        }
        return jsonResponse(budgetReportForMonth(fixture, url.searchParams.get("month")));
      }
      if (url.pathname === "/api/reports/net-worth" && method === "GET") {
        if (scenario === "net-worth-error") {
          return problemResponse("Dashboard net worth fixture failure", "Controlled Dashboard net worth failure.", 500);
        }
        return jsonResponse(scenario === "empty"
          ? { data: [] }
          : fixture.dashboardVisualFixtureNetWorthHistory);
      }
      if (url.pathname === "/api/reports/spending-heatmap" && method === "GET") {
        if (scenario === "heatmap-error") {
          return problemResponse("Dashboard heatmap fixture failure", "Controlled Dashboard heatmap failure.", 500);
        }
        return jsonResponse(scenario === "empty"
          ? fixture.dashboardVisualFixtureEmptyHeatmapReport
          : fixture.dashboardVisualFixtureHeatmapReport);
      }
      return null;
    },
  });
}

async function applyInteraction() {
  return;
}

async function waitForDashboardReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Dashboard')");

  if (state.scenario === "summary-error") {
    await waitFor(client, "document.body.innerText.includes('Failed to load month summary')");
    return;
  }
  if (state.scenario === "net-worth-error") {
    await waitFor(client, "document.body.innerText.includes('Failed to load net worth history')");
    return;
  }
  if (state.scenario === "heatmap-error") {
    await waitFor(client, "document.body.innerText.includes('Failed to load spending heatmap')");
    return;
  }
  if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No current month activity') && document.body.innerText.includes('No heatmap data available') && document.body.innerText.includes('No net worth history available')");
    return;
  }

  await waitFor(client, "document.body.innerText.includes('TOTAL INCOME') && document.body.innerText.includes('Net worth data summary') && document.body.innerText.includes('Spending heatmap data summary')");
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
    const content = document.querySelector(".dashboard-workspace, .dashboard-panel-grid, .dashboard-summary-grid");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const summaryCards = Array.from(document.querySelectorAll(".dashboard-card"));
    const topCardSelectors = Array.from(document.querySelectorAll('[data-qa="dashboard-top-card"]'));
    const dashboardPanels = Array.from(document.querySelectorAll(".dashboard-panel"));
    const alerts = Array.from(document.querySelectorAll(".dashboard-alert, .ant-alert"));
    const chartSurfaces = Array.from(document.querySelectorAll(".recharts-surface"));
    const accessibleSummaries = Array.from(document.querySelectorAll(".report-accessible-summary, .spending-heatmap__summary"));
    const heatmapCells = Array.from(document.querySelectorAll(".spending-heatmap rect"));
    const dashboardTopText = topCardSelectors.map((card) => card.textContent.trim().replace(/\\s+/g, " ")).join(" | ");

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
      summaryCardCount: summaryCards.length,
      dashboardTopCardSelectorCount: topCardSelectors.length,
      dashboardCardTitleSelectorCount: document.querySelectorAll('[data-qa="dashboard-card-title"]').length,
      dashboardCardValueSelectorCount: document.querySelectorAll('[data-qa="dashboard-card-value"]').length,
      dashboardCardCurrencySelectorCount: document.querySelectorAll('[data-qa="dashboard-card-currency"]').length,
      dashboardCardDeltaSelectorCount: document.querySelectorAll('[data-qa="dashboard-card-delta"]').length,
      dashboardTopText,
      dashboardPanelCount: dashboardPanels.length,
      alertCount: alerts.length,
      chartSurfaceCount: chartSurfaces.length,
      accessibleSummaryCount: accessibleSummaries.length,
      heatmapCellCount: heatmapCells.length,
      netWorthSummaryVisible: document.body.innerText.includes("Net worth data summary"),
      heatmapSummaryVisible: document.body.innerText.includes("Spending heatmap data summary"),
      firstUseEmptyVisible: document.body.innerText.includes("No current month activity") && document.body.innerText.includes("No heatmap data available") && document.body.innerText.includes("No net worth history available"),
      summaryErrorVisible: document.body.innerText.includes("Failed to load month summary"),
      netWorthErrorVisible: document.body.innerText.includes("Failed to load net worth history"),
      heatmapErrorVisible: document.body.innerText.includes("Failed to load spending heatmap"),
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

function runState(args) {
  return runBrowserState({
    ...args,
    routePath: "/dashboard",
    initScript: fixedDateInitScript(args.fixture.dashboardVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForDashboardReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const fixture = fixtureExports;
  const failures = [];

  for (const state of stateResults) {
    if (state.scenario !== "populated") continue;

    if (state.summaryCardCount !== fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount} summary cards, found ${state.summaryCardCount}`);
    }
    if (state.dashboardTopCardSelectorCount !== fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount} Dashboard top card selectors, found ${state.dashboardTopCardSelectorCount}`);
    }
    if (state.dashboardCardTitleSelectorCount !== fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount} Dashboard card title selectors, found ${state.dashboardCardTitleSelectorCount}`);
    }
    if (state.dashboardCardValueSelectorCount !== fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount} Dashboard card value selectors, found ${state.dashboardCardValueSelectorCount}`);
    }
    if (state.dashboardCardCurrencySelectorCount < 3) {
      failures.push(`${state.name}: expected Dashboard currency selectors on the money cards`);
    }
    if (state.dashboardCardDeltaSelectorCount !== fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount} Dashboard secondary delta selectors, found ${state.dashboardCardDeltaSelectorCount}`);
    }
    if (state.dashboardPanelCount !== fixture.dashboardVisualFixtureMeta.expectedPanelCount) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedPanelCount} dashboard panels, found ${state.dashboardPanelCount}`);
    }
    if (state.chartSurfaceCount < 2) {
      failures.push(`${state.name}: expected heatmap and net-worth chart surfaces, found ${state.chartSurfaceCount}`);
    }
  }

  for (const state of stateResults) {
    if (/Quick month status lives here\. Use Reports when you need deeper analysis and drill-downs\./.test(state.textSample)) {
      failures.push(`${state.name}: removed Dashboard subtitle copy is still visible`);
    }
    if (/Current month/.test(state.dashboardTopText)) {
      failures.push(`${state.name}: Dashboard top card still contains Current month`);
    }
  }

  return failures;
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "dashboard",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.dashboardVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/dashboardVisualFixture.ts",
      baseline: fixture.dashboardVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.dashboardVisualFixtureMeta.expectedBaseCurrency,
      expectedSummaryCardCount: fixture.dashboardVisualFixtureMeta.expectedSummaryCardCount,
      expectedPanelCount: fixture.dashboardVisualFixtureMeta.expectedPanelCount,
      expectedNetWorthMonths: fixture.dashboardVisualFixtureMeta.expectedNetWorthMonths,
      expectedHeatmapDays: fixture.dashboardVisualFixtureMeta.expectedHeatmapDays,
      nonApplicableStates: fixture.dashboardVisualFixtureMeta.nonApplicableStates,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Dashboard fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5204,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Dashboard",
  userDataPrefix: "inex-dashboard-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
