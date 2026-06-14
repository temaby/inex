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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/budgets");
const fixturePath = path.join(clientRoot, "src/test/fixtures/budgetsVisualFixture.ts");

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
    name: "populated-amount-1024",
    screenshot: "populated-amount-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "sort-by-amount",
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
    interaction: "open-add-drawer",
  },
  {
    name: "drawer-open-360",
    screenshot: "drawer-open-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-add-drawer",
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
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "budgets-error",
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
        return jsonResponse(fixture.budgetsVisualFixtureCurrencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.budgetsVisualFixtureRates });
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        return jsonResponse({ data: fixture.budgetsVisualFixtureCategories });
      }
      if (url.pathname === "/api/budgets" && method === "GET") {
        if (scenario === "budgets-error") {
          return problemResponse("Budgets fixture failure", "Controlled Budgets load failure.", 500);
        }
        return jsonResponse({
          data: scenario === "empty" ? [] : fixture.budgetsVisualFixtureBudgets,
        });
      }
      if (url.pathname === "/api/reports/budget/comparison" && method === "GET") {
        if (scenario === "empty") {
          return jsonResponse({
            ...fixture.budgetsVisualFixtureReport,
            data: [],
            metadata: {
              ...fixture.budgetsVisualFixtureReport.metadata,
              totalOutcome: 0,
            },
          });
        }
        return jsonResponse(fixture.budgetsVisualFixtureReport);
      }
      return null;
    },
  });
}

async function applyInteraction(client, state) {
  switch (state.interaction) {
    case "sort-by-amount":
      await evaluate(client, clickButtonByTextExpression("Amount"));
      await waitFor(client, `(() => {
        const firstRow = document.querySelector(".budget-row__title");
        return firstRow && firstRow.textContent && firstRow.textContent.includes("Rent envelope");
      })()`);
      return;
    case "search-no-match":
      await evaluate(client, `(() => {
        const input = document.querySelector("input[type='search'][aria-label='Search budgets']");
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "zzzz-no-match");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('No budgets match this search')");
      return;
    case "open-add-drawer":
      await evaluate(client, clickButtonByTextExpression("Add budget"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Add Budget')");
      return;
    case "expand-first-row":
      await evaluate(client, `(() => {
        const row = document.querySelector(".budget-row__main");
        if (!row) return false;
        row.click();
        return true;
      })()`);
      await waitFor(client, "Boolean(document.querySelector('.budget-row__edit'))");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function waitForBudgetsReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Budgets')");

  if (state.scenario === "budgets-error") {
    await waitFor(client, "document.body.innerText.includes('Budgets could not load')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No budgets planned for this month')");
  } else {
    await waitFor(client, "document.body.innerText.includes('Groceries cap') && document.body.innerText.includes('Apr 2026')");
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
    const content = document.querySelector(".budgets-workspace, .budgets-list, .budgets-hero");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const rows = Array.from(document.querySelectorAll(".budget-row"));
    const expandedRows = rows.filter((row) => row.querySelector(".budget-row__main")?.getAttribute("aria-expanded") === "true");
    const editPanels = Array.from(document.querySelectorAll(".budget-row__edit"));
    const burnRows = Array.from(document.querySelectorAll(".budgets-burn-row"));
    const overRows = rows.filter((row) => row.classList.contains("is-over"));
    const atLimitRows = rows.filter((row) => row.classList.contains("is-atLimit"));

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
      expandedRowCount: expandedRows.length,
      editPanelCount: editPanels.length,
      burnRowCount: burnRows.length,
      overBudgetRowCount: overRows.length,
      atLimitRowCount: atLimitRows.length,
      maxRowHeight: rows.length ? Math.max(...rows.map((row) => row.getBoundingClientRect().height)) : null,
      addDrawerOpen: document.body.innerText.includes("Add Budget"),
      inlineEditOpen: editPanels.length > 0,
      loadErrorVisible: document.body.innerText.includes("Budgets could not load"),
      filterEmptyVisible: document.body.innerText.includes("No budgets match this search"),
      firstUseEmptyVisible: document.body.innerText.includes("No budgets planned for this month"),
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
    routePath: "/budgets?year=2026&month=4",
    initScript: fixedDateInitScript(args.fixture.budgetsVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForBudgetsReady,
    applyInteraction,
    collectMetrics,
  });
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "budgets",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.budgetsVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/budgetsVisualFixture.ts",
      baseline: fixture.budgetsVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.budgetsVisualFixtureMeta.expectedBaseCurrency,
      expectedBudgetCount: fixture.budgetsVisualFixtureMeta.expectedBudgetCount,
      expectedCategoryCount: fixture.budgetsVisualFixtureMeta.expectedCategoryCount,
      rowInteraction: fixture.budgetsVisualFixtureMeta.rowInteraction,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Budgets fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5202,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  label: "Budgets",
  userDataPrefix: "inex-budgets-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
