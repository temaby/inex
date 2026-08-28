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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/reports");
const fixturePath = path.join(clientRoot, "src/test/fixtures/reportsVisualFixture.ts");

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
    name: "hub-populated-1440",
    screenshot: "hub-populated-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-populated-1024",
    screenshot: "hub-populated-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-populated-390",
    screenshot: "hub-populated-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-populated-360",
    screenshot: "hub-populated-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-configure-1440",
    screenshot: "hub-configure-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports",
    interaction: "open-monthly-pdf-configuration",
  },
  {
    name: "hub-configure-390",
    screenshot: "hub-configure-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
    interaction: "open-monthly-pdf-configuration",
  },
  {
    name: "hub-configure-single-account-export-1440",
    screenshot: "hub-configure-single-account-export-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports",
    interaction: "export-single-configured-account",
  },
  {
    name: "category-report-1440",
    screenshot: "category-report-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports/category?interval=2026-04",
  },
  {
    name: "category-empty-390",
    screenshot: "category-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "empty",
    routePath: "/reports/category?interval=2026-04",
  },
  {
    name: "budget-report-390",
    screenshot: "budget-report-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports/budget?interval=2026-04",
  },
  {
    name: "budget-error-390",
    screenshot: "budget-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "budget-error",
    routePath: "/reports/budget?interval=2026-04",
  },
  {
    name: "history-report-1440",
    screenshot: "history-report-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports/history?year=2026",
  },
  {
    name: "heatmap-report-390",
    screenshot: "heatmap-report-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports/heatmap?interval=2026-04",
  },
  {
    name: "heatmap-error-390",
    screenshot: "heatmap-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "heatmap-error",
    routePath: "/reports/heatmap?interval=2026-04",
  },
];

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
        return jsonResponse(fixture.reportsVisualFixtureCurrencies);
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        return jsonResponse({ data: fixture.reportsVisualFixtureAccounts });
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.reportsVisualFixtureRates });
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        return jsonResponse({ data: fixture.reportsVisualFixtureCategories });
      }
      if (url.pathname === "/api/reports/category" && method === "GET") {
        return jsonResponse({
          ...fixture.reportsVisualFixtureCategoryReport,
          data: scenario === "empty" ? [] : fixture.reportsVisualFixtureCategoryReport.data,
        });
      }
      if (url.pathname === "/api/reports/budget/comparison" && method === "GET") {
        if (scenario === "budget-error") {
          return problemResponse("Budget report fixture failure", "Controlled Reports budget failure.", 500);
        }
        return jsonResponse(fixture.reportsVisualFixtureBudgetReport);
      }
      if (url.pathname.startsWith("/api/reports/history/") && method === "GET") {
        return jsonResponse(fixture.reportsVisualFixtureHistoryReport);
      }
      if (url.pathname === "/api/reports/spending-heatmap" && method === "GET") {
        if (scenario === "heatmap-error") {
          return problemResponse("Heatmap fixture failure", "Controlled Reports heatmap failure.", 500);
        }
        return jsonResponse(fixture.reportsVisualFixtureHeatmapReport);
      }
      if (url.pathname === "/api/reports/monthly-pdf" && method === "GET") {
        return jsonResponse({ generated: true });
      }
      return null;
    },
  });
}

async function applyInteraction(client, state) {
  if (state.interaction !== "open-monthly-pdf-configuration" && state.interaction !== "export-single-configured-account") {
    return;
  }

  await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.textContent?.includes("Configure"));
    if (!button) throw new Error("Configure button was not found");
    button.click();
  })()`);
  await waitFor(client, "document.body.innerText.includes('Configure monthly PDF') && document.body.innerText.includes('Daily USD') && document.body.innerText.includes('Savings PLN')");

  if (state.interaction !== "export-single-configured-account") {
    return;
  }

  await evaluate(client, `(() => {
    const savingsSelection = Array.from(document.querySelectorAll(".ant-select-selection-item")).find((item) => item.textContent?.includes("Savings PLN"));
    const removeButton = savingsSelection?.querySelector(".ant-select-selection-item-remove");
    if (!removeButton) throw new Error("Savings PLN selection remove control was not found");
    removeButton.click();
  })()`);
  await waitFor(client, "document.querySelectorAll('.ant-select-selection-item').length === 1");
  await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === "Download PDF");
    if (!button) throw new Error("Configured PDF download button was not found");
    button.click();
  })()`);
  await wait(250);
}

async function waitForReportsReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Reports') || document.body.innerText.includes('Category Report') || document.body.innerText.includes('Budget Control') || document.body.innerText.includes('Cash Flow') || document.body.innerText.includes('Spending Heatmap')");

  if (state.routePath === "/reports") {
    await waitFor(client, "document.body.innerText.includes('Category Report') && document.body.innerText.includes('Budget Control') && document.body.innerText.includes('Cash Flow')");
    return;
  }
  if (state.scenario === "budget-error") {
    await waitFor(client, "document.body.innerText.includes('reports.budgetReportError')");
    return;
  }
  if (state.scenario === "heatmap-error") {
    await waitFor(client, "document.body.innerText.includes('Failed to load spending heatmap')");
    return;
  }
  if (state.name.startsWith("category-empty")) {
    await waitFor(client, "document.body.innerText.includes('No data')");
    return;
  }
  if (state.routePath.startsWith("/reports/category")) {
    await waitFor(client, "document.body.innerText.includes('Living') && document.body.innerText.includes('Category report data summary')");
    return;
  }
  if (state.routePath.startsWith("/reports/budget")) {
    await waitFor(client, "document.body.innerText.includes('Groceries') && document.body.innerText.includes('Budget report data summary')");
    return;
  }
  if (state.routePath.startsWith("/reports/history")) {
    await waitFor(client, "document.body.innerText.includes('Cash flow chart data summary') && document.body.innerText.includes('Apr')");
    return;
  }
  if (state.routePath.startsWith("/reports/heatmap")) {
    await waitFor(client, "document.body.innerText.includes('Spending heatmap data summary')");
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
    const content = document.querySelector(".reports-route, .reports-workspace, .report-panel");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const modal = document.querySelector(".ant-modal");
    const modalRect = modal ? modal.getBoundingClientRect() : null;
    const reportCards = Array.from(document.querySelectorAll(".reports-hub-card"));
    const reportPanels = Array.from(document.querySelectorAll(".report-panel"));
    const statCards = Array.from(document.querySelectorAll(".report-stat"));
    const tableRows = Array.from(document.querySelectorAll(".report-table .ant-table-row"));
    const chartSurfaces = Array.from(document.querySelectorAll(".recharts-surface"));
    const accessibleSummaries = Array.from(document.querySelectorAll(".report-accessible-summary, .spending-heatmap__summary"));
    const heatmapCells = Array.from(document.querySelectorAll(".spending-heatmap rect"));

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
      modalOpen: Boolean(modal),
      modalWithinViewport: modalRect ? modalRect.left >= 0 && modalRect.right <= window.innerWidth : null,
      modalBounds: modalRect ? { left: modalRect.left, right: modalRect.right, width: modalRect.width } : null,
      reportCardCount: reportCards.length,
      reportPanelCount: reportPanels.length,
      statCardCount: statCards.length,
      tableRowCount: tableRows.length,
      chartSurfaceCount: chartSurfaces.length,
      accessibleSummaryCount: accessibleSummaries.length,
      heatmapCellCount: heatmapCells.length,
      hubVisible: reportCards.length > 0,
      categoryReportVisible: document.body.innerText.includes("Category report data summary"),
      budgetReportVisible: document.body.innerText.includes("Budget report data summary"),
      historyReportVisible: document.body.innerText.includes("Cash flow chart data summary"),
      heatmapReportVisible: document.body.innerText.includes("Spending heatmap data summary"),
      reportErrorVisible: document.body.innerText.includes("reports.budgetReportError") || document.body.innerText.includes("Failed to load spending heatmap"),
      emptyReportVisible: document.body.innerText.includes("No data") || document.body.innerText.includes("No heatmap data available"),
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
    routePath: state.routePath,
    interaction: state.interaction ?? null,
    ...metrics,
  };
}

function runState(args) {
  return runBrowserState({
    ...args,
    routePath: args.state.routePath,
    initScript: fixedDateInitScript(args.fixture.reportsVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForReportsReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const configuredExport = stateResults.find((state) => state.name === "hub-configure-single-account-export-1440");
  if (!configuredExport) {
    return ["Configured account export visual QA state is missing"];
  }

  const expectedRequest = "GET /reports/monthly-pdf?year=2026&month=4&accountIds=101";
  return configuredExport.requestLog.includes(expectedRequest)
    ? []
    : [`Configured account export did not request exactly ${expectedRequest}`];
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "reports",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.reportsVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/reportsVisualFixture.ts",
      baseline: fixture.reportsVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.reportsVisualFixtureMeta.expectedBaseCurrency,
      expectedReportCardCount: fixture.reportsVisualFixtureMeta.expectedReportCardCount,
      expectedCategoryReportRows: fixture.reportsVisualFixtureMeta.expectedCategoryReportRows,
      expectedBudgetReportRows: fixture.reportsVisualFixtureMeta.expectedBudgetReportRows,
      expectedHistoryMonths: fixture.reportsVisualFixtureMeta.expectedHistoryMonths,
      expectedHeatmapDays: fixture.reportsVisualFixtureMeta.expectedHeatmapDays,
      nonApplicableStates: fixture.reportsVisualFixtureMeta.nonApplicableStates,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Reports fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5203,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Reports",
  userDataPrefix: "inex-reports-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
