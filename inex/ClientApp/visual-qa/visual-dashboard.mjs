import path from "node:path";
import { visualQaConfig as classic } from "./dashboard.mjs";
import {
  buildCommonChecks, clickButtonByTextExpression, evaluate, fixedDateInitScript,
  jsonResponse, problemResponse, runBrowserState, runVisualQaScript, wait, waitFor,
} from "./harness.mjs";

const outputDir = path.join(classic.repoRoot, "docs/implementation/visual-qa/visual-dashboard");
const states = [
  ...[1440, 1024, 390, 360].map((width) => ({ name: `populated-${width}`, scenario: "populated", width })),
  { name: "russian-390", scenario: "russian", width: 390 },
  { name: "long-amounts-russian-360", scenario: "long-amounts", width: 360 },
  { name: "negative-wallet-390", scenario: "negative", width: 390 },
  { name: "negative-late-wallet-390", scenario: "negative-late", width: 390 },
  ...["single-category", "empty", "no-activity", "income-only", "expense-only", "missing-rate", "category-error", "summary-error", "accounts-error"].map((scenario) => ({ name: `${scenario}-390`, scenario, width: 390 })),
  { name: "drilldown-1024", scenario: "populated", width: 1024, interaction: "drilldown" },
  { name: "other-390", scenario: "populated", width: 390, interaction: "other" },
  { name: "linked-390", scenario: "linked", width: 390, interaction: "linked" },
  { name: "settings-switch-390", scenario: "settings", width: 390, interaction: "settings" },
  { name: "classic-default-1440", scenario: "classic", width: 1440 },
].map((state) => ({ ...state, screenshot: `${state.name}.png`, viewport: { width: state.width, height: state.width >= 1024 ? 1000 : 900 } }));

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  const source = {
    ...fixture,
    get dashboardVisualFixtureAccountSummaries() {
      return fixture.dashboardVisualFixtureAccountSummaries.map((account) => ({
        ...account,
        value: scenarioRef.current === "negative" ? account.value
          : scenarioRef.current === "negative-late" && account.id === 16 ? -Math.abs(account.value)
          : scenarioRef.current === "long-amounts" ? Math.abs(account.value) * 100000000 : Math.abs(account.value),
      }));
    },
    get dashboardVisualFixtureCategories() {
      return fixture.dashboardVisualFixtureCategories.map((category) => ({
        ...category,
        name: scenarioRef.current === "long-amounts" ? `${category.name} — Очень длинное название категории для проверки переноса текста` : category.name,
      }));
    },
    get dashboardVisualFixtureTransactions() {
      return scenarioRef.current === "single-category"
        ? fixture.dashboardVisualFixtureTransactions.filter((transaction) => [101, 201].includes(transaction.categoryId))
        : fixture.dashboardVisualFixtureTransactions;
    },
  };
  const handleClassic = classic.createApiHandler(source, requestLog, unhandledApiRequests, scenarioRef);
  return async (event, client) => {
    const url = new URL(event.request.url);
    if (url.pathname === "/api/accounts" && scenarioRef.current === "accounts-error") {
      requestLog.push(`GET /accounts${url.search}`);
      await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...problemResponse("Account scope failed", "Controlled account read failure.", 500) });
      return;
    }
    if (url.pathname === "/api/auth/me" || url.pathname === "/api/currencies") {
      requestLog.push(`${event.request.method} ${url.pathname.replace("/api", "")}`);
      const body = url.pathname === "/api/currencies"
        ? [{ id: 1, key: "USD", name: "US Dollar" }]
        : { id: 1, username: "QA", email: "qa@example.test", currencyId: 1, languageCode: ["russian", "long-amounts"].includes(scenarioRef.current) ? "ru" : "en" };
      await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse(body) });
    } else {
      await handleClassic(event, client);
    }
  };
}

async function applyInteraction(client, state) {
  if (state.interaction === "settings") {
    await waitFor(client, "Boolean(document.querySelector('[role=switch][aria-labelledby=profile-dashboard-heading]'))");
    await evaluate(client, "document.querySelector('[role=switch][aria-labelledby=profile-dashboard-heading]').click()");
    await waitFor(client, "localStorage.getItem('inex.dashboard.variant.user-1') === 'visual'");
    process.stdout.write("Visual dashboard QA: Settings preference saved\n");
    await evaluate(client, clickButtonByTextExpression("Dashboard"));
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-dashboard]'))");
    const dashboardUrl = await evaluate(client, "location.href");
    await client.send("Page.navigate", { url: dashboardUrl });
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-dashboard]')) && document.querySelector('[data-qa=visual-money]').innerText.includes('Daily account')");
  }
  if (state.interaction === "drilldown") {
    await evaluate(client, clickButtonByTextExpression("Home"));
    await waitFor(client, "document.body.innerText.includes('Inside Home')");
  }
  if (state.interaction === "other") {
    await evaluate(client, clickButtonByTextExpression("Other"));
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-expenses] [aria-expanded=true]'))");
  }
  if (state.interaction === "linked") {
    await evaluate(client, `(() => {
      const selector = document.querySelector('[aria-label="Financial workspace"]');
      (selector?.closest('.ant-select')?.querySelector('.ant-select-selector') ?? selector)?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    })()`);
    await waitFor(client, "Boolean(document.querySelector('.ant-select-item-option'))");
    await evaluate(client, "Array.from(document.querySelectorAll('.ant-select-item-option')).find(e => e.textContent.includes('Linked QA'))?.click()");
    await waitFor(client, "document.body.innerText.includes('Linked Daily account')");
  }
}

async function collectMetrics(client, state) {
  await evaluate(client, "window.scrollTo(0, document.documentElement.scrollHeight)");
  await wait(150);
  const metrics = await evaluate(client, `(() => {
    const text = document.body.innerText;
    const nav = document.querySelector('.r-bottom-nav');
    const bottomNavVisible = Boolean(nav && getComputedStyle(nav).display !== 'none');
    const content = document.querySelector('[data-qa=visual-dashboard]') ?? document.querySelector('.dashboard-workspace');
    const cards = ['visual-expenses','visual-money','visual-flow'].map(key => document.querySelector('[data-qa='+key+']'));
    const bounds = cards.map(el => { const r = el?.getBoundingClientRect(); return r ? { x:r.x, y:r.y, width:r.width, height:r.height } : null; });
    const charts = [...document.querySelectorAll('.recharts-surface')];
    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth,
      bottomNavVisible,
      bottomNavOccludesLastContent: Boolean(bottomNavVisible && content && content.getBoundingClientRect().bottom > nav.getBoundingClientRect().top - 4),
      drawerOpen: false,
      visual: Boolean(document.querySelector('[data-qa=visual-dashboard]')),
      cardCount: cards.filter(Boolean).length,
      bounds,
      chartCount: charts.length,
      chartBlank: charts.some(el => el.getBoundingClientRect().height <= 0 || el.getBoundingClientRect().width <= 0),
      accountBar: Boolean(document.querySelector('[data-qa=visual-account-bar]')),
      balance: document.querySelector('[data-qa=visual-balance-total]')?.textContent,
      expenseTotal: document.querySelector('[data-qa=visual-expense-total]')?.textContent,
      flowResult: document.querySelector('[data-qa=visual-flow-result]')?.textContent,
      flowRows: document.querySelectorAll('[data-flow]').length,
      flowRowsDisabled: [...document.querySelectorAll('[data-flow]')].every(el => el.disabled),
      negativeWarningLinked: Boolean(document.querySelector('.visual-dashboard-hint a[href="/accounts"]')),
      hiddenAccountsVisible: text.includes('Hidden reserve') || text.includes('Closed account'),
      runtimeErrors: window.__visualDashboardErrors ?? [],
      textSample: text.slice(0, 3500),
    };
  })()`);
  return { ...state, dataMode: "fixture", ...metrics };
}

function runState(args) {
  process.stdout.write(`Visual dashboard QA: ${args.state.name}\n`);
  const language = ["russian", "long-amounts"].includes(args.state.scenario) ? "ru" : "en";
  return runBrowserState({
    ...args,
    routePath: args.state.interaction === "settings" ? "/profile" : "/dashboard",
    initScript: `${fixedDateInitScript(args.fixture.dashboardVisualFixtureMeta.fixedNow, language)}
      if (!sessionStorage.getItem('visual-qa-preference-initialized')) {
        ${["classic", "settings"].includes(args.state.scenario) ? "localStorage.removeItem('inex.dashboard.variant.user-1');" : "localStorage.setItem('inex.dashboard.variant.user-1', 'visual');"}
        sessionStorage.setItem('visual-qa-preference-initialized', '1');
      }
      window.__visualDashboardErrors=[];
      window.addEventListener('error',e=>window.__visualDashboardErrors.push(e.message));
      window.addEventListener('unhandledrejection',e=>window.__visualDashboardErrors.push(String(e.reason)));
    `,
    waitForReady: async (client, state) => {
      if (state.interaction === "settings") {
        await waitFor(client, "Boolean(document.querySelector('#profile-dashboard-heading'))");
      } else if (state.scenario === "classic") {
        await waitFor(client, "document.querySelectorAll('.recharts-surface').length === 3");
      } else {
        await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-dashboard]'))");
        if (state.scenario === "missing-rate") await waitFor(client, "document.body.innerText.includes('Total unavailable')");
        else if (state.scenario === "category-error") await waitFor(client, "document.body.innerText.includes('Could not load category breakdown')");
        else if (["summary-error", "accounts-error"].includes(state.scenario)) await waitFor(client, "document.body.innerText.includes('Could not load cash flow')");
        else if (["empty", "no-activity", "income-only"].includes(state.scenario)) await waitFor(client, "document.body.innerText.includes('No categorized expenses this month')");
        else await waitFor(client, "document.querySelectorAll('.recharts-surface').length === 1 && !document.querySelector('.ant-spin-spinning')");
      }
    },
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(results) {
  const failures = [];
  for (const state of results) {
    if (state.runtimeErrors.length) failures.push(`${state.name}: ${state.runtimeErrors.join(', ')}`);
    if (state.hiddenAccountsVisible) failures.push(`${state.name}: hidden account disclosed`);
    if (state.scenario === "classic") {
      if (state.visual || state.chartCount !== 3) failures.push(`${state.name}: classic default changed`);
      continue;
    }
    if (!state.visual || state.cardCount !== 3 || state.chartBlank) failures.push(`${state.name}: missing cards or blank chart`);
    if (["populated", "russian", "long-amounts", "single-category", "linked", "settings"].includes(state.scenario) && !state.accountBar) failures.push(`${state.name}: account shares absent`);
    if (["negative", "negative-late", "missing-rate", "empty"].includes(state.scenario) && state.accountBar) failures.push(`${state.name}: misleading account shares`);
    if (state.scenario === "empty" && !state.flowRowsDisabled) failures.push(`${state.name}: empty scope navigation enabled`);
    if (state.scenario === "accounts-error" && (state.flowRows || state.flowResult)) failures.push(`${state.name}: failed scope shown as complete zeros`);
    if (state.scenario === "negative-late" && !state.negativeWarningLinked) failures.push(`${state.name}: missing link to negative wallet details`);
    if (state.width >= 1200 && state.interaction !== "settings") {
      const [expense, money, flow] = state.bounds;
      if (Math.abs(expense.y - money.y) > 1 || expense.width <= money.width || flow.y <= expense.y) failures.push(`${state.name}: desktop hierarchy incorrect`);
    }
    if (state.scenario === "populated" && !state.interaction && !state.flowResult?.includes('2,000')) failures.push(`${state.name}: financial result incorrect`);
    if (state.scenario === "single-category" && state.chartCount !== 1) failures.push(`${state.name}: single-category chart missing`);
  }
  return failures;
}

export const visualQaConfig = {
  ...classic, outputDir, states, createApiHandler, runState, collectAdditionalFailures,
  defaultPort: 5211, label: "Visual dashboard", userDataPrefix: "inex-visual-dashboard-qa",
  buildSummary: ({ stateResults, requestLog, unhandledApiRequests, failures }) => ({
    generatedAt: new Date().toISOString(), page: "visual-dashboard", dataMode: "fixture",
    harness: { realBackendCalled: false, apiIsolation: "All API requests intercepted; providers never called." },
    screenshots: stateResults.map(state => state.screenshot), states: stateResults,
    apiRequests: requestLog, unhandledApiRequests, checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  }),
};
runVisualQaScript(import.meta.url, visualQaConfig);
