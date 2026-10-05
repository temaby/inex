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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/dashboard");
const fixturePath = path.join(clientRoot, "src/test/fixtures/dashboardVisualFixture.ts");

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const states = [
  { name: "populated-1440", screenshot: "populated-1440.png", viewport: { width: 1440, height: 1000 }, scenario: "populated" },
  { name: "populated-1024", screenshot: "populated-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated" },
  { name: "child-view-1024", screenshot: "child-view-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated", interaction: "select-child-view" },
  { name: "parent-drilldown-1024", screenshot: "parent-drilldown-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated", interaction: "drill-into-home" },
  { name: "keyboard-drilldown-1024", screenshot: "keyboard-drilldown-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated", interaction: "keyboard-drill-into-home" },
  { name: "populated-390", screenshot: "populated-390.png", viewport: { width: 390, height: 900 }, scenario: "populated" },
  { name: "populated-360", screenshot: "populated-360.png", viewport: { width: 360, height: 900 }, scenario: "populated" },
  { name: "first-use-empty-390", screenshot: "first-use-empty-390.png", viewport: { width: 390, height: 900 }, scenario: "empty" },
  { name: "no-activity-390", screenshot: "no-activity-390.png", viewport: { width: 390, height: 900 }, scenario: "no-activity" },
  { name: "income-only-390", screenshot: "income-only-390.png", viewport: { width: 390, height: 900 }, scenario: "income-only" },
  { name: "expense-only-390", screenshot: "expense-only-390.png", viewport: { width: 390, height: 900 }, scenario: "expense-only" },
  { name: "missing-rate-390", screenshot: "missing-rate-390.png", viewport: { width: 390, height: 900 }, scenario: "missing-rate" },
  { name: "category-error-390", screenshot: "category-error-390.png", viewport: { width: 390, height: 900 }, scenario: "category-error" },
  { name: "summary-error-390", screenshot: "summary-error-390.png", viewport: { width: 390, height: 900 }, scenario: "summary-error" },
  { name: "linked-readonly-390", screenshot: "linked-readonly-390.png", viewport: { width: 390, height: 900 }, scenario: "linked", interaction: "select-linked-account" },
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
      if (url.pathname === "/api/auth/link-state" && method === "GET" && scenario === "linked") {
        return jsonResponse({
          state: "master",
          masterAccount: null,
          linkedAccounts: [{ id: 2, username: "Linked QA", email: "linked@example.test", baseCurrency: "USD" }],
        });
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        const isLinked = url.searchParams.get("linkedUserId") === "2";
        return jsonResponse({
          data: scenario === "empty" ? [] : fixture.dashboardVisualFixtureAccounts.map((account) => ({
            ...account,
            name: isLinked ? `Linked ${account.name}` : account.name,
          })),
        });
      }
      if (url.pathname === "/api/accounts/details" && method === "GET") {
        const isLinked = url.searchParams.get("linkedUserId") === "2";
        const requestedIds = [...url.searchParams.entries()]
          .filter(([key]) => /^ids\[\d+\]$/.test(key))
          .map(([, value]) => Number(value));
        return jsonResponse({
          data: scenario === "empty"
            ? []
            : fixture.dashboardVisualFixtureAccountSummaries
              .filter((account) => requestedIds.includes(account.id))
              .map((account) => ({ ...account, name: isLinked ? `Linked ${account.name}` : account.name })),
        });
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        return jsonResponse({ data: scenario === "empty" ? [] : fixture.dashboardVisualFixtureCategories });
      }
      if (url.pathname === "/api/transactions/summary" && method === "GET") {
        if (scenario === "summary-error") {
          return problemResponse("Transaction summary fixture failure", "Controlled summary failure.", 500);
        }
        if (scenario === "empty" || scenario === "no-activity") {
          return jsonResponse(fixture.dashboardVisualFixtureEmptyTransactionSummary);
        }
        if (scenario === "income-only") {
          return jsonResponse({
            ...fixture.dashboardVisualFixtureTransactionSummary,
            currentScope: {
              ...fixture.dashboardVisualFixtureTransactionSummary.currentScope,
              cashFlowBuckets: [{ date: "2026-04-03", currency: "USD", income: 4300, expense: 0, recordCount: 1 }],
            },
          });
        }
        if (scenario === "expense-only") {
          return jsonResponse({
            ...fixture.dashboardVisualFixtureTransactionSummary,
            currentScope: {
              ...fixture.dashboardVisualFixtureTransactionSummary.currentScope,
              cashFlowBuckets: [{ date: "2026-04-03", currency: "USD", income: 0, expense: -1450, recordCount: 1 }],
            },
          });
        }
        return jsonResponse(fixture.dashboardVisualFixtureTransactionSummary);
      }
      if (url.pathname === "/api/transactions" && method === "GET") {
        if (scenario === "category-error") {
          return problemResponse("Category transaction fixture failure", "Controlled category transaction failure.", 500);
        }
        const rows = scenario === "empty" || scenario === "no-activity"
          ? []
          : scenario === "income-only"
            ? fixture.dashboardVisualFixtureTransactions.filter((transaction) => transaction.amount >= 0)
            : scenario === "expense-only"
              ? fixture.dashboardVisualFixtureTransactions.filter((transaction) => transaction.amount < 0)
              : fixture.dashboardVisualFixtureTransactions;
        return jsonResponse({ data: rows, metadata: { totalItems: rows.length } });
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: scenario === "missing-rate" ? [] : fixture.dashboardVisualFixtureRates });
      }
      return null;
    },
  });
}

async function applyInteraction(client, state) {
  if (state.interaction === "select-child-view") {
    await evaluate(client, clickButtonByTextExpression("Children"));
    await waitFor(client, "document.body.innerText.includes('Home / Rent')");
    return;
  }

  if (state.interaction === "drill-into-home") {
    await evaluate(client, clickButtonByTextExpression("Home"));
    await waitFor(client, "document.body.innerText.includes('Inside Home')");
    return;
  }

  if (state.interaction === "keyboard-drill-into-home") {
    await evaluate(client, `(() => {
      const button = Array.from(document.querySelectorAll('.dashboard-chart-legend__button'))
        .find((item) => item.textContent.includes('Home'));
      if (!button) return false;
      button.focus();
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      button.click();
      return true;
    })()`);
    await waitFor(client, "document.body.innerText.includes('Inside Home') && document.activeElement?.classList.contains('dashboard-panel__title')");
    await evaluate(client, `document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await waitFor(client, "!document.body.innerText.includes('Inside Home')");
    return;
  }

  if (state.interaction === "select-linked-account") {
    await waitFor(client, "Boolean(document.querySelector('[aria-label=\"Financial workspace\"]'))");
    await evaluate(client, `(() => {
      const selector = document.querySelector('[aria-label="Financial workspace"]');
      const trigger = selector?.closest('.ant-select')?.querySelector('.ant-select-selector') ?? selector;
      if (!trigger) return false;
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      return true;
    })()`);
    await waitFor(client, "Boolean(document.querySelector('.ant-select-item-option'))");
    await evaluate(client, `(() => {
      const option = Array.from(document.querySelectorAll('.ant-select-item-option'))
        .find((item) => item.textContent.includes('Linked QA'));
      if (!option) return false;
      option.click();
      return true;
    })()`);
    await waitFor(client, "document.body.innerText.includes(\"Viewing Linked QA's financial workspace in read-only mode.\") && document.body.innerText.includes('Linked Daily account')");
  }
}

async function waitForDashboardReady(client, state) {
  await waitFor(client, "document.body.innerText.length > 0 || (window.__dashboardErrors?.length ?? 0) > 0");
  const runtimeErrors = await evaluate(client, "window.__dashboardErrors ?? []");
  if (runtimeErrors.length > 0) {
    throw new Error(`Dashboard runtime error: ${runtimeErrors.join(" | ")}`);
  }
  const initialText = await evaluate(client, "document.body.innerText");
  if (!initialText.includes("Dashboard")) {
    throw new Error(`Dashboard did not render: ${initialText.slice(0, 500)}`);
  }

  if (state.scenario === "category-error") {
    await waitFor(client, "document.body.innerText.includes('Could not load category breakdown')");
    return;
  }
  if (state.scenario === "summary-error") {
    await waitFor(client, "document.body.innerText.includes('Could not load cash flow') && document.body.innerText.includes('Visible account balance') && document.body.innerText.includes('Salary')");
    return;
  }
  if (state.scenario === "missing-rate") {
    await waitFor(client, "document.body.innerText.includes('Total unavailable')");
    return;
  }
  if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No accounts are selected for the overview.') && document.body.innerText.includes('No categorized expenses this month')");
    return;
  }

  if (state.scenario === "no-activity") {
    await waitFor(client, "document.body.innerText.includes('No activity this month') && document.body.innerText.includes('No categorized expenses this month')");
    return;
  }
  if (state.scenario === "income-only") {
    await waitFor(client, "document.body.innerText.includes('No expenses are recorded for this account scope.')");
    return;
  }
  if (state.scenario === "expense-only") {
    await waitFor(client, "document.body.innerText.includes('No income is recorded for this account scope.')");
    return;
  }

  await waitFor(client, "document.querySelectorAll('.dashboard-account-list > li').length === 5 && document.querySelectorAll('.recharts-surface').length >= 3");
}

async function collectMetrics(client, state, apiRequestCount) {
  await evaluate(client, "window.scrollTo(0, document.documentElement.scrollHeight)");
  await wait(150);

  const metrics = await evaluate(client, `(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const bottomNav = document.querySelector('.r-bottom-nav');
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    const bottomNavVisible = Boolean(bottomNav && bottomNavStyle && bottomNavStyle.display !== 'none' && bottomNav.getBoundingClientRect().height > 0);
    const bottomNavRect = bottomNavVisible ? bottomNav.getBoundingClientRect() : null;
    const content = document.querySelector('.dashboard-workspace');
    const contentRect = content ? content.getBoundingClientRect() : null;
    const panelCount = document.querySelectorAll('.dashboard-panel').length;
    const chartCount = document.querySelectorAll('.recharts-surface').length;
    const accountRows = Array.from(document.querySelectorAll('.dashboard-account-list > li'));
    const visibleAccountCount = accountRows.filter((row) => window.getComputedStyle(row).display !== 'none').length;
    const accountRowCount = accountRows.length;
    const legendItemCount = document.querySelectorAll('.dashboard-chart-legend > li').length;
    const text = body.innerText.replace(/\\s+/g, ' ').trim();

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
      drawerOpen: false,
      panelCount,
      chartCount,
      visibleAccountCount,
      accountRowCount,
      legendItemCount,
      balancePanelVisible: Boolean(document.querySelector('[data-qa="dashboard-balance"]')),
      cashFlowPanelVisible: Boolean(document.querySelector('[data-qa="dashboard-cash-flow"]')),
      expensePanelVisible: Boolean(document.querySelector('[data-qa="dashboard-expense-categories"]')),
      incomePanelVisible: Boolean(document.querySelector('[data-qa="dashboard-income-categories"]')),
      budgetContentVisible: /budget remaining|budgets this month/i.test(text),
      netWorthContentVisible: /net worth/i.test(text),
      categoryErrorVisible: text.includes('Could not load category breakdown'),
      summaryErrorVisible: text.includes('Could not load cash flow'),
      missingRateVisible: text.includes('Total unavailable'),
      linkedReadOnlyVisible: text.includes("Viewing Linked QA's financial workspace in read-only mode."),
      linkedDataVisible: text.includes('Linked Daily account'),
      emptyVisible: text.includes('No accounts are selected for the overview.') && text.includes('No categorized expenses this month'),
      childViewVisible: text.includes('Home / Rent'),
      parentDrilldownVisible: text.includes('Inside Home'),
      dataModeLabel: 'fixture',
      apiRequestCount: ${apiRequestCount},
      textSample: text.slice(0, 1600),
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
    initScript: `${fixedDateInitScript(args.fixture.dashboardVisualFixtureMeta.fixedNow, "en")}
      window.__dashboardErrors = [];
      window.addEventListener('error', (event) => window.__dashboardErrors.push(event.message));
      window.addEventListener('unhandledrejection', (event) => window.__dashboardErrors.push(String(event.reason)));
    `,
    waitForReady: waitForDashboardReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const fixture = fixtureExports;
  const failures = [];

  for (const state of stateResults.filter((item) => item.scenario === "populated" || item.scenario === "linked")) {
    if (state.panelCount !== fixture.dashboardVisualFixtureMeta.expectedPanelCount) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedPanelCount} panels, found ${state.panelCount}`);
    }
    if (state.chartCount < fixture.dashboardVisualFixtureMeta.expectedChartCount) {
      failures.push(`${state.name}: expected at least ${fixture.dashboardVisualFixtureMeta.expectedChartCount} charts, found ${state.chartCount}`);
    }
    const expectedDisplayedAccounts = state.viewport.width <= 768 ? 3 : fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount;
    if (state.accountRowCount !== fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount || state.visibleAccountCount !== expectedDisplayedAccounts) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount} account rows and ${expectedDisplayedAccounts} displayed, found ${state.accountRowCount}/${state.visibleAccountCount}`);
    }
    if (!state.balancePanelVisible || !state.cashFlowPanelVisible || !state.expensePanelVisible || !state.incomePanelVisible) {
      failures.push(`${state.name}: a required current-status panel is missing`);
    }
    if (state.budgetContentVisible || state.netWorthContentVisible) {
      failures.push(`${state.name}: deferred budget or net-worth content is visible`);
    }
  }

  const childView = stateResults.find((state) => state.interaction === "select-child-view");
  if (!childView?.childViewVisible) failures.push("child-view-1024: child category context is missing");
  const drilldown = stateResults.find((state) => state.interaction === "drill-into-home");
  if (!drilldown?.parentDrilldownVisible) failures.push("parent-drilldown-1024: parent drill-down context is missing");
  const keyboardDrilldown = stateResults.find((state) => state.interaction === "keyboard-drill-into-home");
  if (keyboardDrilldown?.parentDrilldownVisible) failures.push("keyboard-drilldown-1024: Escape did not return to parent categories");
  const linked = stateResults.find((state) => state.scenario === "linked");
  if (!linked?.linkedReadOnlyVisible || !linked.linkedDataVisible) failures.push("linked-readonly-390: linked scoped data or read-only notice is missing");
  const missingRate = stateResults.find((state) => state.scenario === "missing-rate");
  if (!missingRate?.missingRateVisible) failures.push("missing-rate-390: complete-or-unavailable state is missing");
  const categoryError = stateResults.find((state) => state.scenario === "category-error");
  if (!categoryError?.categoryErrorVisible || !categoryError.balancePanelVisible || !categoryError.cashFlowPanelVisible) {
    failures.push("category-error-390: category error is not isolated to its panels");
  }
  const summaryError = stateResults.find((state) => state.scenario === "summary-error");
  if (!summaryError?.summaryErrorVisible || !summaryError.balancePanelVisible || summaryError.legendItemCount === 0) {
    failures.push("summary-error-390: summary error is not isolated to cash flow");
  }
  const empty = stateResults.find((state) => state.scenario === "empty");
  if (!empty?.emptyVisible) failures.push("first-use-empty-390: empty state is incomplete");
  for (const scenario of ["no-activity", "income-only", "expense-only"]) {
    if (!stateResults.some((state) => state.scenario === scenario)) failures.push(`${scenario}: state evidence is missing`);
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
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.dashboardVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/dashboardVisualFixture.ts",
      baseline: fixture.dashboardVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.dashboardVisualFixtureMeta.expectedBaseCurrency,
      expectedPanelCount: fixture.dashboardVisualFixtureMeta.expectedPanelCount,
      expectedVisibleAccountCount: fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount,
      expectedChartCount: fixture.dashboardVisualFixtureMeta.expectedChartCount,
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
