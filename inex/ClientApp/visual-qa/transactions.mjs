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
const visualQaViewports = [
  { suffix: "1440", viewport: { width: 1440, height: 1000 } },
  { suffix: "1024", viewport: { width: 1024, height: defaultViewportHeight } },
  { suffix: "390", viewport: { width: 390, height: defaultViewportHeight } },
  { suffix: "360", viewport: { width: 360, height: defaultViewportHeight } },
];
const longRangeRoutePath = "/transactions?filter=start%3A2026-01-01%3Bend%3A2026-04-30%3B";

const delayedResponse = (response, delayMs = 1400) => new Promise((resolve) => {
  setTimeout(() => resolve(response), delayMs);
});

function getScenarioTransactions(fixture, scenario, hasNoMatch) {
  if (scenario === "empty" || hasNoMatch) return [];

  if (scenario === "progressive-loading" || scenario === "progressive-error" || scenario === "long-range") {
    return Array.from({ length: 25 }, (_, index) => {
      const source = fixture.transactionsVisualFixtureTransactions[index % fixture.transactionsVisualFixtureTransactions.length];
      return {
        ...source,
        id: source.id + (index * 100),
        comment: `${source.comment} ${index + 1}`,
      };
    });
  }

  return fixture.transactionsVisualFixtureTransactions;
}

function createTransactionsSummary(fixture, scenario, hasNoMatch) {
  const transactions = getScenarioTransactions(fixture, scenario, hasNoMatch);
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
    baseCurrency: fixture.transactionsVisualFixtureMeta.expectedBaseCurrency,
    currentScope: {
      totalCount: transactions.length,
      typeCounts,
      period: { startDate: "2026-04-01T00:00:00", endDate: "2026-04-30T23:59:59" },
      cashFlowBuckets: transactions.filter((transaction) => !categoriesById.get(transaction.categoryId)?.isSystem).map((transaction) => ({
        date: transaction.created,
        currency: transaction.accountCurrency,
        income: transaction.amount >= 0 ? transaction.amount : 0,
        expense: transaction.amount < 0 ? transaction.amount : 0,
        recordCount: 1,
      })),
    },
    previousScope: {
      totalCount: 0,
      typeCounts: { all: 0, income: 0, expense: 0, transfer: 0 },
      period: { startDate: "2026-03-01T00:00:00", endDate: "2026-03-31T23:59:59" },
      cashFlowBuckets: [],
    },
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
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `selected-account-balance-create-${suffix}`,
    screenshot: `selected-account-balance-create-${suffix}.png`,
    viewport,
    scenario: "populated",
    interaction: "open-add-drawer-and-select-account",
    screenshotMode: "viewport",
  })),
  {
    name: "filter-drawer-open-390",
    screenshot: "filter-drawer-open-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-filter-drawer",
  },
  {
    name: "filter-drawer-open-360",
    screenshot: "filter-drawer-open-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-filter-drawer",
  },
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `account-balances-open-${suffix}`,
    screenshot: `account-balances-open-${suffix}.png`,
    viewport,
    scenario: "populated",
    interaction: "open-account-balances",
  })),
  {
    name: "account-balances-loading-390",
    screenshot: "account-balances-loading-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-loading",
    interaction: "open-account-balances",
    settleDelayMs: 2400,
  },
  {
    name: "account-balances-empty-390",
    screenshot: "account-balances-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-empty",
    interaction: "open-account-balances",
  },
  {
    name: "account-balances-error-390",
    screenshot: "account-balances-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-error",
    interaction: "open-account-balances",
  },
  {
    name: "account-balances-retry-390",
    screenshot: "account-balances-retry-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-error-retry",
    interaction: "open-account-balances-and-retry",
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
  ...visualQaViewports.filter(({ suffix }) => suffix === "1024" || suffix === "360").map(({ suffix, viewport }) => ({
    name: `expanded-row-${suffix}`,
    screenshot: `expanded-row-${suffix}.png`,
    viewport,
    scenario: "populated",
    interaction: "open-row-edit",
  })),
  {
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "transactions-error",
  },
  {
    name: "initial-retry-390",
    screenshot: "initial-retry-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "transactions-error-retry",
    interaction: "retry-initial",
  },
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `initial-loading-${suffix}`,
    screenshot: `initial-loading-${suffix}.png`,
    viewport,
    scenario: "initial-loading",
    settleDelayMs: 1600,
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `first-use-empty-${suffix}`,
    screenshot: `first-use-empty-${suffix}.png`,
    viewport,
    scenario: "empty",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `filter-empty-${suffix}`,
    screenshot: `filter-empty-${suffix}.png`,
    viewport,
    scenario: "populated",
    interaction: "search-no-match",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `missing-rate-${suffix}`,
    screenshot: `missing-rate-${suffix}.png`,
    viewport,
    scenario: "missing-rate",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `progressive-loading-${suffix}`,
    screenshot: `progressive-loading-${suffix}.png`,
    viewport,
    scenario: "progressive-loading",
    interaction: "load-more-pending",
    settleDelayMs: 1600,
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `long-range-pagination-${suffix}`,
    screenshot: `long-range-pagination-${suffix}.png`,
    viewport,
    scenario: "long-range",
    routePath: longRangeRoutePath,
    interaction: "close-filter-drawer",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `refresh-error-${suffix}`,
    screenshot: `refresh-error-${suffix}.png`,
    viewport,
    scenario: "progressive-error",
    interaction: "load-more-error",
    settleDelayMs: 1600,
  })),
  {
    name: "refresh-retry-390",
    screenshot: "refresh-retry-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "progressive-error",
    interaction: "load-more-error-and-retry",
  },
];

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  return createApiFixtureHandler({
    requestLog,
    unhandledApiRequests,
    scenarioRef,
    handleRequest: ({ url, method, scenario }) => {
      const hasNoMatch = url.searchParams.get("search") === "zzzz-no-match";
      if (url.pathname === "/api/auth/refresh" && method === "POST") {
        return jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
      }
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return jsonResponse(authUser);
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        return jsonResponse({ data: fixture.transactionsVisualFixtureAccounts });
      }
      if (url.pathname === "/api/accounts/details" && method === "GET") {
        const requestKey = "account-balances";
        scenarioRef.requestCounts[requestKey] = (scenarioRef.requestCounts[requestKey] ?? 0) + 1;
        const requestAttempt = scenarioRef.requestCounts[requestKey];

        if (scenario === "account-balances-error" || (scenario === "account-balances-error-retry" && requestAttempt === 1)) {
          return problemResponse("Account balance fixture failure", "Controlled account balance failure.", 500);
        }

        const response = jsonResponse({
          data: scenario === "account-balances-empty" ? [] : fixture.transactionsVisualFixtureAccountSummaries,
        });
        return scenario === "account-balances-loading" ? delayedResponse(response, 2200) : response;
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        return jsonResponse({ data: fixture.transactionsVisualFixtureCategories });
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: scenario === "missing-rate" ? [] : fixture.transactionsVisualFixtureRates });
      }
      if (url.pathname === "/api/transactions/summary" && method === "GET") {
        if (scenario === "transactions-error") {
          return problemResponse("Transactions fixture failure", "Controlled Transactions summary failure.", 500);
        }

        const response = jsonResponse(createTransactionsSummary(fixture, scenario, hasNoMatch));
        return scenario === "initial-loading" ? delayedResponse(response) : response;
      }
      if (url.pathname === "/api/transactions" && method === "GET") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
        const requestKey = `transactions-page-${page}`;
        scenarioRef.requestCounts[requestKey] = (scenarioRef.requestCounts[requestKey] ?? 0) + 1;
        const requestAttempt = scenarioRef.requestCounts[requestKey];

        if (scenario === "transactions-error" || (scenario === "transactions-error-retry" && requestAttempt === 1)) {
          return problemResponse("Transactions fixture failure", "Controlled Transactions load failure.", 500);
        }

        const data = getScenarioTransactions(fixture, scenario, hasNoMatch);
        const response = jsonResponse({
          data: data.slice((page - 1) * pageSize, page * pageSize),
          metadata: { totalItems: data.length },
        });

        if (scenario === "initial-loading" || (scenario === "progressive-loading" && page > 1)) {
          return delayedResponse(response);
        }

        if (scenario === "progressive-error" && page > 1 && requestAttempt === 1) {
          return delayedResponse(problemResponse("Transactions fixture failure", "Controlled progressive page failure.", 500));
        }

        return response;
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
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('No transactions match these filters')");
      return;
    case "open-add-drawer":
      await evaluate(client, clickButtonByTextExpression("Add transaction"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('New transaction')");
      return;
    case "open-add-drawer-and-select-account":
      await evaluate(client, clickButtonByTextExpression("Add transaction"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('New transaction')");
      await evaluate(client, `(() => {
        const trigger = Array.from(document.querySelectorAll(".ant-menu-submenu-title")).find((item) => item.textContent?.includes("Select account"));
        if (!trigger) return false;
        trigger.click();
        return true;
      })()`);
      await waitFor(client, "Array.from(document.querySelectorAll('.ant-menu-item')).some((item) => item.textContent?.includes('Emergency reserve for long-term household commitments'))");
      await evaluate(client, `(() => {
        const account = Array.from(document.querySelectorAll(".ant-menu-item")).find((item) => item.textContent?.includes("Emergency reserve for long-term household commitments"));
        if (!account) return false;
        account.click();
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('Native balance') && Boolean(document.querySelector('[data-qa=selected-account-native-balance]'))");
      return;
    case "open-filter-drawer":
      await evaluate(client, clickButtonByTextExpression("Filters"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Advanced filters')");
      return;
    case "open-account-balances":
      await evaluate(client, clickButtonByTextExpression("Account balances"));
      if (state.scenario === "account-balances-loading") {
        await waitFor(client, "document.body.innerText.includes('Loading account balances')");
      } else if (state.scenario === "account-balances-empty") {
        await waitFor(client, "document.body.innerText.includes('No active accounts to display')");
      } else if (state.scenario === "account-balances-error") {
        await waitFor(client, "document.body.innerText.includes('Could not load account balances')");
      } else {
        await waitFor(client, "document.body.innerText.includes('Emergency reserve for long-term household commitments')");
      }
      return;
    case "open-account-balances-and-retry":
      await evaluate(client, clickButtonByTextExpression("Account balances"));
      await waitFor(client, "document.body.innerText.includes('Could not load account balances')");
      await activateRetryButton(client);
      await waitFor(client, "document.body.innerText.includes('Emergency reserve for long-term household commitments')");
      return;
    case "open-row-edit":
      await evaluate(client, `(() => {
        const row = document.querySelector(".transactions-ledger-row");
        if (!row) return false;
        row.click();
        return true;
      })()`);
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Edit transaction') && Boolean(document.querySelector('[data-qa=selected-account-native-balance]'))");
      return;
    case "load-more-pending":
      await evaluate(client, clickButtonByTextExpression("Load more"));
      await waitFor(client, "document.body.innerText.includes('Refreshing ledger') && document.querySelectorAll('.transactions-ledger-row').length === 20");
      return;
    case "load-more-error":
      await evaluate(client, clickButtonByTextExpression("Load more"));
      await waitFor(client, "document.body.innerText.includes('Could not refresh the ledger') && document.querySelectorAll('.transactions-ledger-row').length === 20");
      return;
    case "retry-initial":
      await activateRetryButton(client);
      await waitFor(client, "document.querySelectorAll('.transactions-ledger-row').length === 6 && !document.body.innerText.includes('Failed to load transactions')");
      return;
    case "load-more-error-and-retry":
      await evaluate(client, clickButtonByTextExpression("Load more"));
      await waitFor(client, "document.body.innerText.includes('Could not refresh the ledger') && document.querySelectorAll('.transactions-ledger-row').length === 20");
      await activateRetryButton(client);
      await waitFor(client, "document.querySelectorAll('.transactions-ledger-row').length === 25 && !document.body.innerText.includes('Could not refresh the ledger')");
      return;
    case "close-filter-drawer":
      await evaluate(client, "(() => { const button = document.querySelector('.ant-drawer-close'); if (!button) return false; button.click(); return true; })()");
      await waitFor(client, "!document.querySelector('.ant-drawer-open') && Boolean(document.querySelector('.ant-pagination'))");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function activateRetryButton(client) {
  const activated = await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("button")).find((item) => {
      if (item.textContent?.trim() !== "Retry") return false;
      const style = window.getComputedStyle(item);
      const rect = item.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    if (!button) return false;
    button.focus();
    if (document.activeElement !== button) return false;
    button.click();
    return true;
  })()`);
  if (!activated) throw new Error("Could not focus and activate the Retry control.");
}

async function waitForTransactionsReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Transactions')");

  if (state.scenario === "initial-loading") {
    await waitFor(client, "Boolean(document.querySelector('.transactions-loading')) && Boolean(document.querySelector('.transactions-kpi__skeleton'))");
  } else if (state.scenario === "transactions-error" || state.scenario === "transactions-error-retry") {
    await waitFor(client, "document.body.innerText.includes('Failed to load transactions')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No transactions to display')");
  } else {
    await waitFor(client, "document.body.innerText.includes('BIEDRONKA groceries')");
  }
}

async function collectMetrics(client, state, apiRequestCount) {
  const initialViewport = await evaluate(client, `(() => {
    const retry = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === "Retry");
    const bottomNav = document.querySelector(".r-bottom-nav");
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    const bottomNavVisible = Boolean(bottomNav && bottomNavStyle && bottomNavStyle.display !== "none" && bottomNav.getBoundingClientRect().height > 0);
    const retryRect = retry?.getBoundingClientRect();
    const bottomNavRect = bottomNavVisible ? bottomNav.getBoundingClientRect() : null;
    return {
      recoveryActionVisibleAtStart: Boolean(retryRect && retryRect.bottom > 0 && retryRect.top < window.innerHeight),
      recoveryActionOccludedAtStart: Boolean(retryRect && bottomNavRect && retryRect.bottom > bottomNavRect.top),
    };
  })()`);
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
    const ledgerCard = document.querySelector(".transactions-ledger-card");
    const ledgerCardRect = ledgerCard ? ledgerCard.getBoundingClientRect() : null;
    const ledgerColumns = Array.from(document.querySelectorAll(".transactions-ledger-head > div"));
    const drawer = document.querySelector(".ant-drawer-open .ant-drawer-content-wrapper");
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
      advancedFilterDrawerOpen: document.body.innerText.includes("Advanced filters"),
      rowEditDrawerOpen: document.body.innerText.includes("Edit transaction"),
      accountBalancesOpen: Boolean(document.querySelector("[data-qa='account-balances-companion']")),
      accountBalancesDrawerOpen: Boolean(drawer && document.body.innerText.includes("Account balances")),
      accountBalancesZeroVisible: document.body.innerText.includes("0.00 PLN"),
      ledgerColumnsFullyVisible: Boolean(ledgerCardRect && ledgerColumns.length === 4 && ledgerColumns.every((column) => {
        const rect = column.getBoundingClientRect();
        return rect.left >= ledgerCardRect.left && rect.right <= ledgerCardRect.right;
      })),
      loadErrorVisible: document.body.innerText.includes("Failed to load transactions"),
      initialLoadingVisible: Boolean(document.querySelector(".transactions-loading")),
      progressiveLoadingVisible: document.body.innerText.includes("Refreshing ledger") && rows.length === 20,
      refreshErrorVisible: document.body.innerText.includes("Could not refresh the ledger") && rows.length === 20,
      paginationVisible: Boolean(document.querySelector(".ant-pagination")),
      filterEmptyVisible: document.body.innerText.includes("No transactions match these filters"),
      firstUseEmptyVisible: document.body.innerText.includes("No transactions to display"),
      dataModeLabel: ${JSON.stringify("fixture")},
      apiRequestCount: ${apiRequestCount},
      ...${JSON.stringify(initialViewport)},
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
    routePath: args.state.routePath ?? "/transactions",
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
    checks: {
      ...buildCommonChecks(stateResults, failures, unhandledApiRequests),
      amountFilterRemoved: stateResults
        .filter((state) => state.interaction === "open-filter-drawer")
        .every((state) => !state.textSample.includes("Amount equivalent")),
      recoveryActionsClearMobileNav: stateResults
        .filter((state) => state.loadErrorVisible || state.refreshErrorVisible)
        .every((state) => !state.recoveryActionOccludedAtStart),
      accountBalancesTabletLedgerColumnsVisible: stateResults
        .filter((state) => state.name === "account-balances-open-1024")
        .every((state) => state.ledgerColumnsFullyVisible),
    },
  };
}

const fixtureExports = loadFixture(fixturePath, `Transactions fixture is missing: ${fixturePath}`);
const stateFilter = process.env.INEX_VISUAL_QA_STATE_FILTER;
const configuredStates = stateFilter
  ? states.filter((state) => state.name.startsWith(stateFilter))
  : states;

if (configuredStates.length === 0) {
  throw new Error(`No Transactions visual-QA states match "${stateFilter}".`);
}

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5199,
  fixture: fixtureExports,
  states: configuredStates,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures: (stateResults) => {
    const failures = [];
    const tabletCompanion = stateResults.find((state) => state.name === "account-balances-open-1024");
    if (tabletCompanion && !tabletCompanion.ledgerColumnsFullyVisible) {
      failures.push("account-balances-open-1024: ledger columns are clipped");
    }

    for (const state of stateResults.filter((item) => item.name === "account-balances-open-1440" || item.name === "account-balances-open-1024")) {
      if (state.drawerOpen) failures.push(`${state.name}: desktop companion rendered as a drawer`);
    }

    for (const state of stateResults.filter((item) => item.name === "account-balances-open-390" || item.name === "account-balances-open-360")) {
      if (!state.drawerOpen || !state.drawerWithinViewport) failures.push(`${state.name}: mobile balance drawer is not fully visible`);
    }

    return failures;
  },
  label: "Transactions",
  userDataPrefix: "inex-transactions-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
