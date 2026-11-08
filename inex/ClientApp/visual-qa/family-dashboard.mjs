import path from "node:path";
import { visualQaConfig as dashboard } from "./dashboard.mjs";
import {
  buildCommonChecks, evaluate, fixedDateInitScript, jsonResponse, problemResponse,
  runBrowserState, runVisualQaScript, wait, waitFor,
} from "./harness.mjs";

const fixedNow = "2026-04-30T12:00:00.000Z";
const outputDir = path.join(dashboard.repoRoot, "docs/implementation/visual-qa/family-dashboard");
const states = [
  ...[1440, 1024, 390, 360].map((width) => ({ name: `populated-${width}`, scenario: "populated", width })),
  { name: "classic-1440", scenario: "classic", width: 1440 },
  { name: "west-1440", scenario: "west", width: 1440, timezoneId: "America/Los_Angeles" },
  { name: "month-boundary-390", scenario: "month-boundary", width: 390, timezoneId: "Europe/Warsaw", fixedNow: "2026-05-01T00:30:00+02:00" },
  { name: "trailing-slash-390", scenario: "trailing-slash", width: 390, routePath: "/dashboard/" },
  ...["russian", "historical", "empty", "balance-missing", "flow-missing", "error", "loading", "self", "individual", "route-reset", "revoked"].map((scenario) => ({
    name: `${scenario}-${scenario === "russian" ? 360 : 390}`, scenario, width: scenario === "russian" ? 360 : 390,
    ...(scenario === "loading" ? { settleDelayMs: 1800 } : {}),
  })),
].map((state) => ({ ...state, screenshot: `${state.name}.png`, viewport: { width: state.width, height: state.width >= 1024 ? 1000 : 900 } }));

const totals = (balance, income, expenses) => ({ balance, income, expenses, surplus: income - expenses, balanceComplete: true, cashFlowComplete: true });
function familyFixture(scenario, month) {
  const historical = month !== 4;
  const empty = scenario === "empty";
  const russian = scenario === "russian";
  const names = russian
    ? ["Артём", "Анна — участник семьи с длинным именем", "Михаил"]
    : ["QA", "Anna", "Michael"];
  const participants = names.map((username, index) => ({
    userId: index + 1, username, isMaster: index === 0,
    totals: empty ? totals(0, 0, 0) : totals([24000, 6000, 1500][index], historical ? [2000, 1200, 300][index] : [4000, 2500, 500][index], [1500, 900, 100][index]),
  }));
  const categories = (income) => empty ? [] : participants.map((participant, index) => ({
    userId: participant.userId, username: participant.username, categoryId: index + (income ? 200 : 100),
    path: russian ? (income ? "Доходы / Основная работа" : "Дом / Продукты и повседневные покупки") : (income ? "Income / Salary" : "Home / Groceries"),
    amount: income ? participant.totals.income : participant.totals.expenses,
  }));
  const result = {
    year: 2026, month, currency: "USD", balanceDate: "2026-04-30T00:00:00Z",
    totals: totals(participants.reduce((sum, p) => sum + p.totals.balance, 0), participants.reduce((sum, p) => sum + p.totals.income, 0), participants.reduce((sum, p) => sum + p.totals.expenses, 0)),
    participants, incomeCategories: categories(true), expenseCategories: categories(false), missingRates: [],
  };
  if (scenario === "balance-missing") {
    result.totals.balance = null;
    result.totals.balanceComplete = false;
    result.participants[1].totals.balance = null;
    result.participants[1].totals.balanceComplete = false;
    result.missingRates = [{ scope: "balance", currency: "PLN", date: "2026-04-30T00:00:00" }];
  }
  if (scenario === "flow-missing") {
    for (const value of [result.totals, result.participants[1].totals]) {
      value.income = null; value.expenses = null; value.surplus = null; value.cashFlowComplete = false;
    }
    result.incomeCategories = null; result.expenseCategories = null;
    result.missingRates = [{ scope: "cashFlow", currency: "EUR", date: "2026-04-03T00:00:00" }];
  }
  return result;
}

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  const fallback = dashboard.createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef);
  let linkReads = 0;
  let lastScenario;
  return async (event, client) => {
    if (lastScenario !== scenarioRef.current) { linkReads = 0; lastScenario = scenarioRef.current; }
    const url = new URL(event.request.url);
    let response;
    if (url.pathname === "/api/auth/link-state") {
      linkReads++;
      response = jsonResponse(scenarioRef.current === "revoked" && linkReads > 1
        ? { state: "unlinked", masterAccount: null, linkedAccounts: [] }
        : { state: "master", masterAccount: null, linkedAccounts: [
          { id: 2, username: "Anna", email: null, baseCurrency: "EUR" },
          { id: 3, username: "Michael", email: null, baseCurrency: "PLN" },
        ] });
    } else if (url.pathname === "/api/auth/me") {
      response = jsonResponse({ id: 1, username: "QA", email: "qa@example.test", currencyId: 1, languageCode: scenarioRef.current === "russian" ? "ru" : "en" });
    } else if (url.pathname === "/api/reports/family") {
      if (scenarioRef.current === "loading") await wait(1500);
      response = scenarioRef.current === "error" ? problemResponse("Family unavailable", "Controlled fixture failure.", 500)
        : scenarioRef.current === "revoked" ? problemResponse("Not found", "Requested family is unavailable.", 404)
          : jsonResponse(familyFixture(scenarioRef.current, Number(url.searchParams.get("month"))));
    } else if (url.pathname === "/api/currencies") {
      response = jsonResponse([{ id: 1, key: "USD", name: "US Dollar" }]);
    }
    if (!response) return fallback(event, client);
    requestLog.push(`${event.request.method} ${url.pathname.replace("/api", "")}${url.search}`);
    await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...response });
  };
}

async function chooseWorkspace(client, value) {
  await evaluate(client, `(() => {
    const trigger = document.querySelector('.inex-linked-account-select .ant-select-selector');
    trigger?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
  })()`);
  await waitFor(client, "Boolean(document.querySelector('.ant-select-item-option'))");
  await evaluate(client, `(() => {
    const option = [...document.querySelectorAll('.ant-select-item-option')].find(item => item.textContent.includes(${JSON.stringify(value)}));
    if (!option) throw new Error('Workspace option missing'); option.click();
  })()`);
}

async function applyInteraction(client, state) {
  await chooseWorkspace(client, state.scenario === "russian" ? "Семья" : "Family");
  if (state.scenario === "revoked") {
    await waitFor(client, "!document.querySelector('[data-qa=family-dashboard]') && Boolean(document.querySelector('.inex-linked-account-alert'))");
    return;
  }
  await waitFor(client, "Boolean(document.querySelector('[data-qa=family-dashboard]'))");
  if (state.scenario === "loading") return;
  await waitFor(client, state.scenario === "error"
    ? "document.querySelector('[data-qa=family-dashboard]')?.getAttribute('aria-busy') === 'false' && Boolean(document.querySelector('[data-qa=family-dashboard] [role=alert]'))"
    : "Boolean(document.querySelector('[data-qa=family-context]'))");
  if (state.scenario === "historical") {
    await evaluate(client, "document.querySelector('[data-qa=family-month-previous]').click()");
    await waitFor(client, "location.search.includes('month=2026-03') && Boolean(document.querySelector('[data-qa=family-context]'))");
  } else if (state.scenario === "self" || state.scenario === "individual") {
    await chooseWorkspace(client, state.scenario === "self" ? "My data" : "Anna");
    await waitFor(client, "!document.querySelector('[data-qa=family-dashboard]') && Boolean(document.querySelector('[data-qa=dashboard-position], [data-qa=visual-money]'))");
  } else if (state.scenario === "route-reset") {
    await evaluate(client, "document.querySelector('.r-bottom-nav__item:nth-child(3)').click()");
    await waitFor(client, "location.pathname === '/accounts'");
    await evaluate(client, "document.querySelector('.r-bottom-nav__item:first-child').click()");
    await waitFor(client, "location.pathname === '/dashboard' && !document.querySelector('[data-qa=family-dashboard]') && Boolean(document.querySelector('[data-qa=dashboard-position], [data-qa=visual-money]'))");
  }
  await wait(100);
}

async function collectMetrics(client, state) {
  await evaluate(client, "window.scrollTo(0, document.documentElement.scrollHeight)");
  await wait(100);
  const metrics = await evaluate(client, `(() => {
    const nav = document.querySelector('.r-bottom-nav');
    const rect = nav?.getBoundingClientRect();
    const style = nav ? getComputedStyle(nav) : null;
    const bottomNavVisible = Boolean(nav && style.display !== 'none' && rect.height > 0);
    const family = document.querySelector('[data-qa=family-dashboard]');
    const content = family ?? document.querySelector('.visual-dashboard-workspace, .dashboard-workspace');
    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      bottomNavVisible,
      bottomNavOccludesLastContent: Boolean(bottomNavVisible && content && content.getBoundingClientRect().bottom > rect.top + 1),
      familyVisible: Boolean(family), loading: family?.getAttribute('aria-busy') === 'true',
      chartCount: family?.querySelectorAll('.recharts-pie').length ?? 0,
      participantCount: family?.querySelectorAll('.family-dashboard-participant').length ?? 0,
      currencyVisible: document.querySelector('[data-qa=family-context]')?.textContent.includes('USD') ?? false,
      balance: document.querySelector('[data-qa=family-balance-total]')?.getAttribute('aria-label') ?? document.querySelector('[data-qa=family-balance-total]')?.textContent ?? '',
      balanceAvailable: Boolean(document.querySelector('[data-qa=family-balance-total]')),
      flowAvailable: Boolean(document.querySelector('[data-qa=family-income-total]')),
      balanceScope: document.querySelector('[data-qa=family-balance] p')?.textContent ?? '',
      mutationCount: family?.querySelectorAll('a[href*="/transactions"]').length ?? 0,
      selectedWorkspace: document.querySelector('.inex-linked-account-select .ant-select-selection-item')?.textContent ?? '',
      pageText: document.body.innerText,
    };
  })()`);
  return { name: state.name, page: "family-dashboard", route: "/dashboard", dataMode: "fixture", screenshot: state.screenshot, scenario: state.scenario, viewport: state.viewport, ...metrics };
}

function collectAdditionalFailures(results) {
  const failures = [];
  for (const state of results) {
    const returnedToPersonal = ["self", "individual", "route-reset", "revoked"].includes(state.scenario);
    if (returnedToPersonal) {
      if (state.familyVisible) failures.push(`${state.name}: family context was not cleared`);
      if (state.scenario !== "individual" && state.selectedWorkspace && state.selectedWorkspace !== "My data") failures.push(`${state.name}: expected personal workspace`);
      continue;
    }
    if (!state.familyVisible) failures.push(`${state.name}: family dashboard missing`);
    if (state.scenario === "loading") {
      if (!state.loading || state.balanceAvailable) failures.push(`${state.name}: loading displayed stale values`);
      continue;
    }
    if (state.scenario === "error") {
      if (state.participantCount || state.balanceAvailable) failures.push(`${state.name}: error displayed stale values`);
      continue;
    }
    if (state.participantCount !== 3 || !state.currencyVisible) failures.push(`${state.name}: family identity or currency missing`);
    if (state.mutationCount) failures.push(`${state.name}: mixed-owner navigation exposed`);
    if (state.scenario === "west" && !state.balanceScope.includes('Apr 30, 2026')) failures.push(`${state.name}: UTC balance date shifted in local timezone`);
    if (state.scenario === "month-boundary" && !state.requestLog.some((route) => route.startsWith('GET /reports/family?') && route.includes('month=4'))) failures.push(`${state.name}: family requested a future UTC month`);
    if (state.scenario === "balance-missing" && (state.balanceAvailable || !state.flowAvailable)) failures.push(`${state.name}: balance completeness not independent`);
    if (state.scenario === "flow-missing" && (!state.balanceAvailable || state.flowAvailable)) failures.push(`${state.name}: cash-flow completeness not independent`);
    if (!["empty", "balance-missing", "flow-missing"].includes(state.scenario) && state.chartCount !== 2) failures.push(`${state.name}: expected two category charts`);
  }
  return failures;
}

export const visualQaConfig = {
  clientRoot: dashboard.clientRoot, repoRoot: dashboard.repoRoot, outputDir, defaultPort: 53147,
  fixture: dashboard.fixture, states, createApiHandler, collectAdditionalFailures,
  runState: (args) => runBrowserState({
    ...args, routePath: args.state.routePath ?? "/dashboard",
    initScript: `${fixedDateInitScript(args.state.fixedNow ?? fixedNow, args.state.scenario === "russian" ? "ru" : "en")}
      localStorage.setItem('inex.dashboard.variant.user-1', ${JSON.stringify(args.state.scenario === "classic" ? "classic" : "visual")});`,
    waitForReady: (client) => waitFor(client, "Boolean(document.querySelector('.inex-linked-account-select')) && Boolean(document.querySelector('[data-qa=dashboard-position], [data-qa=visual-money]'))"),
    applyInteraction, collectMetrics,
  }),
  buildSummary: ({ stateResults, requestLog, unhandledApiRequests, failures }) => ({
    generatedAt: new Date().toISOString(), page: "family-dashboard", dataMode: "fixture",
    harness: { runner: "Node CDP headless browser", viteMode: "test", realBackendCalled: false, fixedNow, apiIsolation: "All API requests fulfilled with synthetic fixtures; unhandled calls fail." },
    screenshots: stateResults.map((state) => state.screenshot), apiRequests: requestLog, unhandledApiRequests,
    states: stateResults, checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  }),
  label: "Family Dashboard", userDataPrefix: "inex-family-dashboard-visual-qa",
};
runVisualQaScript(import.meta.url, visualQaConfig);
