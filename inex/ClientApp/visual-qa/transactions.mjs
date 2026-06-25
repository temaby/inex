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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/transactions");
const fixturePath = path.join(clientRoot, "src/test/fixtures/transactionsVisualFixture.ts");

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const defaultViewportHeight = 900;

function createTransactionsSummary(fixture, scenario) {
  const transactions = scenario === "empty" ? [] : fixture.transactionsVisualFixtureTransactions;
  const categoriesById = new Map(fixture.transactionsVisualFixtureCategories.map((category) => [category.id, category]));
  const currencySummariesByCurrency = new Map();
  const typeCounts = {
    all: transactions.length,
    income: 0,
    expense: 0,
    transfer: 0,
  };

  for (const transaction of transactions) {
    const category = categoriesById.get(transaction.categoryId);
    const kind = category?.isSystem ? "transfer" : transaction.amount >= 0 ? "income" : "expense";
    typeCounts[kind] += 1;

    if (kind === "transfer") {
      continue;
    }

    const summary = currencySummariesByCurrency.get(transaction.accountCurrency) ?? {
      currency: transaction.accountCurrency,
      income: 0,
      expense: 0,
      net: 0,
    };

    if (kind === "income") {
      summary.income += transaction.amount;
    } else {
      summary.expense += transaction.amount;
    }
    summary.net = summary.income + summary.expense;
    currencySummariesByCurrency.set(transaction.accountCurrency, summary);
  }

  return {
    totalCount: transactions.length,
    typeCounts,
    currencySummaries: Array.from(currencySummariesByCurrency.values()),
  };
}

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
    interaction: "open-row-edit",
  },
  {
    name: "expanded-row-390",
    screenshot: "expanded-row-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-row-edit",
  },
  {
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "transactions-error",
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
      if (url.pathname === "/api/accounts" && method === "GET") {
        return jsonResponse({ data: fixture.transactionsVisualFixtureAccounts });
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        return jsonResponse({ data: fixture.transactionsVisualFixtureCategories });
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.transactionsVisualFixtureRates });
      }
      if (url.pathname === "/api/transactions/summary" && method === "GET") {
        if (scenario === "transactions-error") {
          return problemResponse("Transactions fixture failure", "Controlled Transactions summary failure.", 500);
        }

        return jsonResponse(createTransactionsSummary(fixture, scenario));
      }
      if (url.pathname === "/api/transactions" && method === "GET") {
        if (scenario === "transactions-error") {
          return problemResponse("Transactions fixture failure", "Controlled Transactions load failure.", 500);
        }

        const data = scenario === "empty" ? [] : fixture.transactionsVisualFixtureTransactions;
        return jsonResponse({
          data,
          metadata: { totalItems: data.length },
        });
      }
      return null;
    },
  });
}

async function applyInteraction(client, state) {
  switch (state.interaction) {
    case "search-no-match":
      await evaluate(client, `(() => {
        const input = document.querySelector("input[type='search'][aria-label='Search']");
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "zzzz-no-match");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('No transactions match these filters')");
      return;
    case "open-add-drawer":
      await evaluate(client, clickButtonByTextExpression("Add transaction"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('New transaction')");
      return;
    case "open-row-edit":
      await evaluate(client, `(() => {
        const row = document.querySelector(".transactions-ledger-row");
        if (!row) return false;
        row.click();
        return true;
      })()`);
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Edit transaction')");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function waitForTransactionsReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Transactions')");

  if (state.scenario === "transactions-error") {
    await waitFor(client, "document.body.innerText.includes('Failed to load transactions')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No transactions to display')");
  } else {
    await waitFor(client, "document.body.innerText.includes('BIEDRONKA groceries')");
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
    const content = document.querySelector(".transactions-ledger, .transactions-empty-wrap, .transactions-ledger-card");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const rows = Array.from(document.querySelectorAll(".transactions-ledger-row"));
    const groups = Array.from(document.querySelectorAll(".transactions-day-group"));

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
      dayGroupCount: groups.length,
      maxRowHeight: rows.length ? Math.max(...rows.map((row) => row.getBoundingClientRect().height)) : null,
      addDrawerOpen: document.body.innerText.includes("New transaction"),
      rowEditDrawerOpen: document.body.innerText.includes("Edit transaction"),
      loadErrorVisible: document.body.innerText.includes("Failed to load transactions"),
      filterEmptyVisible: document.body.innerText.includes("No transactions match these filters"),
      firstUseEmptyVisible: document.body.innerText.includes("No transactions to display"),
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
    routePath: "/transactions",
    initScript: fixedDateInitScript(args.fixture.transactionsVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForTransactionsReady,
    applyInteraction,
    collectMetrics,
  });
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "transactions",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.transactionsVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/transactionsVisualFixture.ts",
      baseline: fixture.transactionsVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.transactionsVisualFixtureMeta.expectedBaseCurrency,
      expectedTransactionCount: fixture.transactionsVisualFixtureMeta.expectedTransactionCount,
      rowInteraction: fixture.transactionsVisualFixtureMeta.rowInteraction,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Transactions fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5199,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  label: "Transactions",
  userDataPrefix: "inex-transactions-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
