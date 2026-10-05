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
  { name: "populated-expanded-1440", screenshot: "populated-expanded-1440.png", viewport: { width: 1440, height: 1000 }, scenario: "populated", interaction: "expand-accounts" },
  { name: "populated-1024", screenshot: "populated-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated" },
  { name: "child-view-1024", screenshot: "child-view-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated", interaction: "select-child-view" },
  { name: "parent-drilldown-1024", screenshot: "parent-drilldown-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated", interaction: "drill-into-home" },
  { name: "keyboard-drilldown-1024", screenshot: "keyboard-drilldown-1024.png", viewport: { width: 1024, height: 900 }, scenario: "populated", interaction: "keyboard-drill-into-home" },
  { name: "populated-390", screenshot: "populated-390.png", viewport: { width: 390, height: 900 }, scenario: "populated" },
  { name: "populated-expanded-390", screenshot: "populated-expanded-390.png", viewport: { width: 390, height: 900 }, scenario: "populated", interaction: "expand-accounts" },
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
  if (state.interaction === "expand-accounts") {
    await evaluate(client, `document.querySelector('.dashboard-account-list__toggle')?.click()`);
    await waitFor(client, "document.querySelector('.dashboard-account-list__toggle')?.getAttribute('aria-expanded') === 'true'");
    return;
  }

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
    await waitFor(client, "document.body.innerText.includes('Could not load cash flow') && document.body.innerText.includes('Available') && document.body.innerText.includes('Salary')");
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

  await waitFor(client, `document.querySelectorAll('.dashboard-account-list > li').length === ${fixtureExports.dashboardVisualFixtureMeta.expectedVisibleAccountCount} && document.querySelectorAll('.recharts-surface').length >= 3`);
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
    const panels = Array.from(document.querySelectorAll('.dashboard-panel'));
    const panelCount = panels.length;
    const panelOrder = panels.map((panel) => panel.getAttribute('data-qa'));
    const getPanelRect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    };
    const positionRect = getPanelRect('[data-qa="dashboard-position"]');
    const cashFlowRect = getPanelRect('[data-qa="dashboard-cash-flow"]');
    const expenseRect = getPanelRect('[data-qa="dashboard-expense-categories"]');
    const incomeRect = getPanelRect('[data-qa="dashboard-income-categories"]');
    const aligned = (first, second) => Boolean(first && second
      && Math.abs(first.top - second.top) <= 1
      && Math.abs(first.height - second.height) <= 1);
    const topPairAligned = aligned(cashFlowRect, positionRect)
      && cashFlowRect.left < positionRect.left;
    const bottomPairAligned = aligned(expenseRect, incomeRect)
      && expenseRect.left < incomeRect.left;
    const stackedPanelOrder = Boolean(positionRect && cashFlowRect && expenseRect && incomeRect
      && positionRect.top < cashFlowRect.top
      && cashFlowRect.top < expenseRect.top
      && expenseRect.top < incomeRect.top);
    const expensePalette = Array.from(document.querySelectorAll('[data-qa="dashboard-expense-categories"] .dashboard-chart-legend__swatch'))
      .map((swatch) => window.getComputedStyle(swatch).backgroundColor);
    const incomePalette = Array.from(document.querySelectorAll('[data-qa="dashboard-income-categories"] .dashboard-chart-legend__swatch'))
      .map((swatch) => window.getComputedStyle(swatch).backgroundColor);
    const paletteOverlap = [...new Set(expensePalette)].filter((color) => new Set(incomePalette).has(color));
    const chartCount = document.querySelectorAll('.recharts-surface').length;
    const accountRows = Array.from(document.querySelectorAll('.dashboard-account-list > li'));
    const visibleAccountCount = accountRows.filter((row) => window.getComputedStyle(row).display !== 'none').length;
    const accountRowCount = accountRows.length;
    const accountToggle = document.querySelector('.dashboard-account-list__toggle');
    const accountToggleStyle = accountToggle ? window.getComputedStyle(accountToggle) : null;
    const amountText = (row) => row?.querySelector('[role="text"] [aria-hidden="true"]')?.textContent?.trim() ?? '';
    const amountColorToken = (row) => {
      const amount = row?.querySelector('[role="text"] [aria-hidden="true"]');
      return amount?.style.color ?? null;
    };
    const negativeAccountRow = accountRows.find((row) => row.textContent.includes('Travel card'));
    const positiveAccountRow = accountRows.find((row) => row.textContent.includes('Daily account'));
    const cashFlowChartRect = document.querySelector('.dashboard-cash-flow-chart')?.getBoundingClientRect() ?? null;
    const cashFlowTrailingSpace = cashFlowRect && cashFlowChartRect ? cashFlowRect.top + cashFlowRect.height - cashFlowChartRect.bottom : null;
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
      panelOrder,
      topPairAligned,
      bottomPairAligned,
      stackedPanelOrder,
      expensePalette,
      incomePalette,
      paletteOverlap,
      chartCount,
      visibleAccountCount,
      accountRowCount,
      accountToggleVisible: Boolean(accountToggle && accountToggleStyle && accountToggleStyle.display !== 'none'),
      accountToggleExpanded: accountToggle?.getAttribute('aria-expanded') === 'true',
      positiveAccountHasPlus: amountText(positiveAccountRow).startsWith('+'),
      negativeAccountHasMinus: amountText(negativeAccountRow).startsWith('-'),
      negativeAccountHasSemanticColor: amountColorToken(negativeAccountRow) === 'var(--expense-600)',
      cashFlowTrailingSpace,
      legendItemCount,
      positionPanelVisible: Boolean(document.querySelector('[data-qa="dashboard-position"]')),
      balancePanelVisible: Boolean(document.querySelector('[data-qa="dashboard-balance"]')),
      accountsPanelVisible: Boolean(document.querySelector('[data-qa="dashboard-accounts"]')),
      positionPanelCombined: Boolean(document.querySelector('[data-qa="dashboard-position"] [data-qa="dashboard-balance"]')
        && document.querySelector('[data-qa="dashboard-position"] [data-qa="dashboard-accounts"]')),
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
    if (JSON.stringify(state.panelOrder) !== JSON.stringify(fixture.dashboardVisualFixtureMeta.expectedPanelOrder)) {
      failures.push(`${state.name}: panel DOM order does not match the mobile reading contract`);
    }
    const expectedDisplayedAccounts = state.interaction === "expand-accounts"
      ? fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount
      : state.viewport.width <= 768
        ? fixture.dashboardVisualFixtureMeta.expectedCollapsedMobileAccountCount
        : fixture.dashboardVisualFixtureMeta.expectedCollapsedDesktopAccountCount;
    if (state.accountRowCount !== fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount || state.visibleAccountCount !== expectedDisplayedAccounts) {
      failures.push(`${state.name}: expected ${fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount} account rows and ${expectedDisplayedAccounts} displayed, found ${state.accountRowCount}/${state.visibleAccountCount}`);
    }
    if (!state.accountToggleVisible || state.accountToggleExpanded !== (state.interaction === "expand-accounts")) {
      failures.push(`${state.name}: account expansion control does not match the collapsed/expanded state`);
    }
    if (state.positiveAccountHasPlus || !state.negativeAccountHasMinus || !state.negativeAccountHasSemanticColor) {
      failures.push(`${state.name}: account balance sign or negative semantic color is incorrect`);
    }
    if (!state.positionPanelVisible || !state.positionPanelCombined || !state.balancePanelVisible || !state.accountsPanelVisible
      || !state.cashFlowPanelVisible || !state.expensePanelVisible || !state.incomePanelVisible) {
      failures.push(`${state.name}: a required current-status panel is missing`);
    }
    if (state.viewport.width >= 1200 && (!state.topPairAligned || !state.bottomPairAligned)) {
      failures.push(`${state.name}: desktop panel pairs are not aligned to equal-height rows`);
    }
    if (state.viewport.width >= 1200 && (state.cashFlowTrailingSpace === null || state.cashFlowTrailingSpace > 32)) {
      failures.push(`${state.name}: cash-flow chart leaves excessive unused space at the bottom of its card`);
    }
    if (state.viewport.width < 1200 && !state.stackedPanelOrder) {
      failures.push(`${state.name}: responsive panels do not follow the balance, cash flow, expense, income order`);
    }
    if (state.expensePalette.length === 0 || state.incomePalette.length === 0 || state.paletteOverlap.length > 0) {
      failures.push(`${state.name}: category palettes are missing or share an exact color`);
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
      expectedPanelOrder: fixture.dashboardVisualFixtureMeta.expectedPanelOrder,
      expectedVisibleAccountCount: fixture.dashboardVisualFixtureMeta.expectedVisibleAccountCount,
      expectedCollapsedDesktopAccountCount: fixture.dashboardVisualFixtureMeta.expectedCollapsedDesktopAccountCount,
      expectedCollapsedMobileAccountCount: fixture.dashboardVisualFixtureMeta.expectedCollapsedMobileAccountCount,
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
