import path from "node:path";
import { visualQaConfig as classic } from "./dashboard.mjs";
import {
  buildCommonChecks, clickButtonByTextExpression, evaluate, fixedDateInitScript,
  jsonResponse, problemResponse, runBrowserState, runVisualQaScript, wait, waitFor,
} from "./harness.mjs";

const outputDir = path.join(classic.repoRoot, "docs/implementation/visual-qa/visual-dashboard");
const reportingScenarios = ["report-all-active", "report-only", "report-linked"];
const states = [
  ...[1440, 1024, 390, 360].map((width) => ({ name: `expense-focus-${width}`, scenario: "populated", width, interaction: "expense-focus" })),
  { name: "expense-hover-1440", scenario: "populated", width: 1440, interaction: "expense-hover" },
  { name: "expense-restored-390", scenario: "populated", width: 390, interaction: "expense-restored" },
  { name: "expense-russian-360", scenario: "russian", width: 360, interaction: "expense-focus" },
  { name: "expense-long-label-360", scenario: "long-amounts", width: 360, interaction: "expense-focus" },
  { name: "expense-other-member-390", scenario: "populated", width: 390, interaction: "expense-other-member" },
  ...[1440, 1024, 390, 360].map((width) => ({ name: `wallet-selected-${width}`, scenario: "populated", width, interaction: "select-non-favorite" })),
  { name: "wallet-favorite-selected-390", scenario: "populated", width: 390, interaction: "select-favorite" },
  { name: "wallet-hover-1440", scenario: "populated", width: 1440, interaction: "hover-wallet" },
  { name: "wallet-focus-1440", scenario: "populated", width: 1440, interaction: "focus-wallet" },
  { name: "wallet-cleared-390", scenario: "populated", width: 390, interaction: "clear-wallet" },
  { name: "wallet-selected-russian-360", scenario: "russian", width: 360, interaction: "select-non-favorite" },
  { name: "wallet-tiny-selected-360", scenario: "tiny-wallet", width: 360, interaction: "pick-tiny-wallet" },
  ...["zero-wallets", "debt-wallets", "two-favorites"].map((scenario) => ({ name: `${scenario}-390`, scenario, width: 390 })),
  { name: "wording-russian-1440", scenario: "russian", width: 1440 },
  ...["wording-negative", "wording-equal", "wording-negative-ru", "wording-equal-ru", "wording-empty-ru"].map((scenario) => ({ name: `${scenario}-390`, scenario, width: 390 })),
  { name: "report-all-active-1440", scenario: "report-all-active", width: 1440 },
  { name: "report-only-1440", scenario: "report-only", width: 1440 },
  { name: "report-only-390", scenario: "report-only", width: 390 },
  { name: "report-linked-1440", scenario: "report-linked", width: 1440, interaction: "linked" },
  ...[800, 900].map((height) => ({ name: `compact-1440-${height}`, scenario: "populated", width: 1440, height })),
  { name: "single-parent-1440-800", scenario: "income-single-parent", width: 1440, height: 800 },
  { name: "linked-russian-1440-900", scenario: "linked-russian", width: 1440, height: 900, interaction: "linked" },
  ...[1440, 1024, 390, 360].map((width) => ({ name: `populated-${width}`, scenario: "populated", width })),
  { name: "russian-390", scenario: "russian", width: 390 },
  { name: "long-amounts-russian-360", scenario: "long-amounts", width: 360 },
  ...["income-two", "income-four", "income-tiny", "income-single-parent"].map((scenario) => ({ name: `${scenario}-390`, scenario, width: 390 })),
  { name: "income-children-1440", scenario: "income-single-parent", width: 1440, interaction: "income-drilldown" },
  { name: "income-other-390", scenario: "populated", width: 390, interaction: "income-other" },
  { name: "negative-wallet-390", scenario: "negative", width: 390 },
  { name: "negative-late-wallet-390", scenario: "negative-late", width: 390 },
  ...["single-category", "empty", "no-activity", "income-only", "expense-only", "missing-rate", "category-error", "summary-error", "accounts-error"].map((scenario) => ({ name: `${scenario}-390`, scenario, width: 390 })),
  { name: "drilldown-1024", scenario: "populated", width: 1024, interaction: "drilldown" },
  { name: "other-390", scenario: "populated", width: 390, interaction: "other" },
  { name: "linked-390", scenario: "linked", width: 390, interaction: "linked" },
  { name: "settings-switch-390", scenario: "settings", width: 390, interaction: "settings" },
  { name: "classic-default-1440", scenario: "classic", width: 1440 },
].map((state) => ({ ...state, screenshot: `${state.name}.png`, viewport: { width: state.width, height: state.height ?? (state.width >= 1024 ? 1000 : 900) } }));

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  const source = {
    ...fixture,
    get dashboardVisualFixtureAccounts() {
      return fixture.dashboardVisualFixtureAccounts.map((account) => {
        const reportAccount = reportingScenarios.includes(scenarioRef.current) && account.id === 14
          ? { ...account, currency: "PLN", currencyId: 2 } : account;
        return scenarioRef.current === "report-only" ? { ...reportAccount, isFavourite: false }
          : scenarioRef.current === "two-favorites" ? { ...reportAccount, isFavourite: [11, 13].includes(account.id) } : reportAccount;
      });
    },
    get dashboardVisualFixtureAccountSummaries() {
      return fixture.dashboardVisualFixtureAccountSummaries.map((account) => ({
        ...account,
        ...(reportingScenarios.includes(scenarioRef.current) && account.id === 14 ? { currency: "PLN", currencyId: 2 } : {}),
        value: scenarioRef.current === "tiny-wallet" && account.id === 13 ? 0.001
          : scenarioRef.current === "zero-wallets" ? 0
          : scenarioRef.current === "debt-wallets" ? -Math.abs(account.value)
          : scenarioRef.current === "negative" ? account.value
          : scenarioRef.current === "negative-late" && account.id === 16 ? -Math.abs(account.value)
          : scenarioRef.current === "long-amounts" ? Math.abs(account.value) * 100000000 : Math.abs(account.value),
      }));
    },
    get dashboardVisualFixtureCategories() {
      return fixture.dashboardVisualFixtureCategories.map((category) => ({
        ...category,
        parentId: ["income-single-parent", "linked-russian"].includes(scenarioRef.current) && category.id === 211 ? 200 : category.parentId,
        name: scenarioRef.current === "long-amounts" ? `${category.name} — Очень длинное название категории для проверки переноса текста` : category.name,
      }));
    },
    get dashboardVisualFixtureTransactions() {
      const scenario = scenarioRef.current;
      if (scenario === "wording-empty-ru") return [];
      if (scenario === "long-amounts") return fixture.dashboardVisualFixtureTransactions.map((transaction) => ({
        ...transaction, amount: transaction.amount < 0 ? transaction.amount * 1000000 : transaction.amount,
      }));
      if (["income-two", "income-four", "income-single-parent", "income-tiny", "linked-russian"].includes(scenario)) {
        const ids = scenario === "income-four" ? [201, 211, 221, 231] : scenario === "income-tiny" ? [201, 251] : [201, 211];
        return fixture.dashboardVisualFixtureTransactions
          .filter((transaction) => transaction.amount < 0 || ids.includes(transaction.categoryId))
          .map((transaction) => scenario === "income-tiny" && transaction.categoryId === 251 ? { ...transaction, amount: 0.01 } : transaction);
      }
      return scenarioRef.current === "single-category"
        ? fixture.dashboardVisualFixtureTransactions.filter((transaction) => [101, 201].includes(transaction.categoryId))
        : fixture.dashboardVisualFixtureTransactions;
    },
  };
  const handleClassic = classic.createApiHandler(source, requestLog, unhandledApiRequests, {
    get current() { return ["linked-russian", "report-linked"].includes(scenarioRef.current) ? "linked" : scenarioRef.current; },
  });
  return async (event, client) => {
    const url = new URL(event.request.url);
    if (scenarioRef.current.startsWith("wording-") && url.pathname === "/api/transactions/summary") {
      requestLog.push(`${event.request.method} ${url.pathname.replace("/api", "")}${url.search}`);
      const income = scenarioRef.current === "wording-empty-ru" ? 0 : 100;
      const expense = scenarioRef.current.includes("negative") ? -150 : -income;
      const body = { ...fixture.dashboardVisualFixtureTransactionSummary,
        currentScope: { ...fixture.dashboardVisualFixtureTransactionSummary.currentScope,
          cashFlowBuckets: [{ date: "2026-04-03", currency: "USD", income, expense, recordCount: income ? 2 : 0 }] } };
      await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse(body) });
      return;
    }
    if (reportingScenarios.includes(scenarioRef.current) && ["/api/transactions", "/api/transactions/summary"].includes(url.pathname)) {
      requestLog.push(`${event.request.method} ${url.pathname.replace("/api", "")}${url.search}`);
      const requestedIds = url.searchParams.getAll("accountId").map(Number);
      const enabledIds = source.dashboardVisualFixtureAccounts.filter((account) => account.isEnabled).map((account) => account.id);
      const rows = [
        { id: 1, accountId: 11, categoryId: 111, accountCurrency: "USD", amount: -100, created: "2026-04-03T12:00:00" },
        { id: 2, accountId: 14, categoryId: 131, accountCurrency: "PLN", amount: -200, created: "2026-04-03T12:00:00" },
        { id: 3, accountId: 14, categoryId: 201, accountCurrency: "PLN", amount: 2000, created: "2026-04-03T12:00:00" },
        { id: 4, accountId: 15, categoryId: 191, accountCurrency: "USD", amount: -900, created: "2026-04-03T12:00:00" },
      ].filter((row) => enabledIds.includes(row.accountId) && (!requestedIds.length || requestedIds.includes(row.accountId)));
      const buckets = ["USD", "PLN"].map((currency) => {
        const currencyRows = rows.filter((row) => row.accountCurrency === currency);
        return { date: "2026-04-03", currency,
          income: currencyRows.reduce((sum, row) => sum + Math.max(row.amount, 0), 0),
          expense: currencyRows.reduce((sum, row) => sum + Math.min(row.amount, 0), 0),
          recordCount: currencyRows.length };
      }).filter((bucket) => bucket.recordCount > 0);
      const counts = { all: rows.length, income: rows.filter((row) => row.amount >= 0).length,
        expense: rows.filter((row) => row.amount < 0).length, transfer: 0, internalTransfer: 0, correction: 0 };
      const body = url.pathname === "/api/transactions"
        ? { data: rows, metadata: { totalItems: rows.length } }
        : { ...fixture.dashboardVisualFixtureTransactionSummary, totalCount: rows.length, typeCounts: counts, viewTypeCounts: counts,
          currencySummaries: buckets.map(({currency, income, expense}) => ({currency, income, expense, net: income + expense})),
          currentScope: { ...fixture.dashboardVisualFixtureTransactionSummary.currentScope, totalCount: rows.length, typeCounts: counts, cashFlowBuckets: buckets } };
      await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse(body) });
      return;
    }
    if (url.pathname === "/api/accounts" && scenarioRef.current === "accounts-error") {
      requestLog.push(`GET /accounts${url.search}`);
      await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...problemResponse("Account scope failed", "Controlled account read failure.", 500) });
      return;
    }
    if (url.pathname === "/api/auth/me" || url.pathname === "/api/currencies") {
      requestLog.push(`${event.request.method} ${url.pathname.replace("/api", "")}`);
      const body = url.pathname === "/api/currencies"
        ? [{ id: 1, key: "USD", name: "US Dollar" }]
        : { id: 1, username: "QA", email: "qa@example.test", currencyId: 1, languageCode: ["russian", "long-amounts", "linked-russian", "wording-negative-ru", "wording-equal-ru", "wording-empty-ru"].includes(scenarioRef.current) ? "ru" : "en" };
      await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse(body) });
    } else {
      await handleClassic(event, client);
    }
  };
}

async function applyInteraction(client, state) {
  if (state.interaction?.startsWith("expense-")) {
    await client.send("Page.bringToFront");
    if (state.interaction === "expense-other-member") {
      await evaluate(client, "document.querySelector('[data-category-key=other]').click()");
      await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-expenses] .visual-dashboard-legend__members button'))");
    }
    await evaluate(client, `(() => {
      const center = document.querySelector('[data-qa=visual-expense-center]');
      window.__expenseDefault = center.textContent;
      const r = center.getBoundingClientRect();
      window.__expenseCenterBounds = {width:r.width,height:r.height};
      const member = ${JSON.stringify(state.interaction === "expense-other-member")};
      const row = document.querySelector(member ? '[data-qa=visual-expenses] .visual-dashboard-legend__members button' : '[data-category-key]');
      window.__expenseTarget = row;
      window.__expenseExpected = {
        label:row.querySelector(member ? 'span:first-child' : '.visual-dashboard-legend__name').textContent,
        amount:row.querySelector(member ? '[role=text]' : '.visual-dashboard-legend__amount').textContent,
        share:member ? null : row.querySelector('.visual-dashboard-legend__percentage').textContent,
      };
    })()`);
    if (state.interaction === "expense-hover") {
      const point = await evaluate(client, `(() => {
        const sector = document.querySelector('[data-qa=visual-expenses] .recharts-pie-sector path');
        const box = sector.closest('svg').getBoundingClientRect();
        return {x:box.x+box.width/2+box.width*.37,y:box.y+box.height/2};
      })()`);
      await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    } else {
      await evaluate(client, "window.__expenseTarget.focus()");
    }
    await waitFor(client, "document.querySelector('[data-qa=visual-expense-center]')?.textContent.includes(window.__expenseExpected.label)");
    await evaluate(client, `(() => {
      const center = document.querySelector('[data-qa=visual-expense-center]');
      const r = center.getBoundingClientRect();
      window.__expenseInspection = {
        correct: center.textContent.includes(window.__expenseExpected.label)
          && center.textContent.includes(window.__expenseExpected.amount)
          && (!window.__expenseExpected.share || document.querySelector('[data-qa=visual-expense-share]').textContent.includes(window.__expenseExpected.share)),
        stable: Math.abs(r.width-window.__expenseCenterBounds.width)<1 && Math.abs(r.height-window.__expenseCenterBounds.height)<1,
        contained: [...center.children].every(el => {
          const b = el.getBoundingClientRect();
          return b.left >= r.left-1 && b.right <= r.right+1 && b.top >= r.top-1 && b.bottom <= r.bottom+1
            && el.scrollWidth <= el.clientWidth+1;
        }),
        tooltip: Boolean(document.querySelector('[data-qa=visual-expenses] .recharts-tooltip-wrapper')),
      };
    })()`);
    if (state.interaction === "expense-restored") {
      await evaluate(client, "document.activeElement.blur()");
      await waitFor(client, "document.querySelector('[data-qa=visual-expense-center]')?.textContent === window.__expenseDefault");
    }
  }
  if (state.interaction === "focus-wallet") {
    await client.send("Page.bringToFront");
    await evaluate(client, "document.querySelector('[data-qa=visual-account-bar] [data-account-id=\"13\"]').focus()");
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-account-tooltip]'))");
  }
  if (state.interaction === "pick-tiny-wallet") {
    await evaluate(client, `(() => { const picker = document.querySelector('[data-qa=visual-account-picker]'); picker.value='13'; picker.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-account-selection]'))");
  }
  if (["select-non-favorite", "select-favorite", "clear-wallet"].includes(state.interaction)) {
    const id = state.interaction === "select-favorite" ? 13 : 14;
    await evaluate(client, `document.querySelector('[data-qa=visual-account-bar] [data-account-id="${id}"]').click()`);
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-account-selection]'))");
    if (state.interaction === "clear-wallet") {
      await evaluate(client, "document.querySelector('[data-qa=visual-account-clear]').click()");
      await waitFor(client, "!document.querySelector('[data-qa=visual-account-selection]')");
    }
  }
  if (state.interaction === "hover-wallet") {
    const point = await evaluate(client, `(() => {
      const el = document.querySelector('[data-qa=visual-account-bar] [data-account-id="13"]');
      el.scrollIntoView({block:'center'});
      const r = el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`);
    await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-account-tooltip]'))");
  }
  if (state.interaction === "income-drilldown") {
    await evaluate(client, "document.querySelector('[data-qa=visual-income] button[aria-label=\"Back to categories\"]').click()");
    await waitFor(client, "Boolean(document.querySelector('[data-income-key=\"200\"]'))");
    await evaluate(client, "document.querySelector('[data-income-key=\"200\"]').click()");
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-income-chart]')) && document.querySelectorAll('[data-income-key]').length === 2");
  }
  if (state.interaction === "income-other") {
    await evaluate(client, "document.querySelector('[data-income-key=other]').click()");
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-income] [aria-expanded=true]'))");
  }
  if (state.interaction === "settings") {
    await waitFor(client, "Boolean(document.querySelector('[role=switch][aria-labelledby=profile-dashboard-heading]'))");
    await evaluate(client, "document.querySelector('[role=switch][aria-labelledby=profile-dashboard-heading]').click()");
    await waitFor(client, "localStorage.getItem('inex.dashboard.variant.user-1') === 'visual'");
    process.stdout.write("Visual dashboard QA: Settings preference saved\n");
    await evaluate(client, clickButtonByTextExpression("Dashboard"));
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-dashboard]'))");
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-income-total]')) && !document.querySelector('.ant-spin-spinning')");
    await wait(150);
    const dashboardUrl = await evaluate(client, "location.href");
    await client.send("Page.navigate", { url: dashboardUrl });
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-dashboard]')) && document.querySelector('[data-qa=visual-money]').innerText.includes('Daily account')");
  }
  if (state.interaction === "drilldown") {
    await evaluate(client, clickButtonByTextExpression("Home"));
    await waitFor(client, "document.querySelector('[data-qa=visual-expense-context]')?.textContent === 'Home'");
  }
  if (state.interaction === "other") {
    await evaluate(client, clickButtonByTextExpression("Other"));
    await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-expenses] [aria-expanded=true]'))");
  }
  if (state.interaction === "linked") {
    await evaluate(client, `(() => {
      const selector = document.querySelector('.inex-linked-account-select input');
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
    const cards = ['visual-expenses','visual-money','visual-income','visual-flow'].map(key => document.querySelector('[data-qa='+key+']'));
    const bounds = cards.map(el => { const r = el?.getBoundingClientRect(); return r ? { x:r.x, y:r.y, width:r.width, height:r.height } : null; });
    const charts = [...document.querySelectorAll('.recharts-surface')];
    return {
      pageHeight: document.documentElement.scrollHeight,
      scrollTop: window.scrollY,
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
      expenseInspection: window.__expenseInspection,
      incomeTotal: document.querySelector('[data-qa=visual-income-total]')?.textContent,
      incomeChart: Boolean(document.querySelector('[data-qa=visual-income-chart] .recharts-pie-sector')),
      incomeLegendCount: document.querySelectorAll('[data-income-key]').length,
      incomeOtherMembers: document.querySelectorAll('[data-qa=visual-income] .visual-dashboard-legend__members button').length,
      tinyIncomeShare: document.querySelector('[data-income-key="250"] .visual-dashboard-legend__percentage')?.textContent,
      headings: [...document.querySelectorAll('[data-qa=visual-dashboard] h2')].map(el => el.textContent),
      pageSubtitleVisible: Boolean(document.querySelector('[data-qa=page-eyebrow]')),
      incomeContext: document.querySelector('[data-qa=visual-income-context]')?.textContent,
      expenseContext: document.querySelector('[data-qa=visual-expense-context]')?.textContent,
      untranslatedKeyVisible: /dashboard\.(visual|categories|balance)\./.test(text),
      technicalNavigationVisible: /Starting level|Back to parent|Родительские|Дочерние|Начальный уровень|кошел|wallet/i.test(text),
      flowExpense: document.querySelector('[data-flow=expense] [role=text]')?.textContent,
      flowResult: document.querySelector('[data-qa=visual-flow-result]')?.textContent,
      flowRows: document.querySelectorAll('[data-flow]').length,
      flowRowsDisabled: [...document.querySelectorAll('[data-flow]')].every(el => el.disabled),
      negativeWarningLinked: Boolean(document.querySelector('.visual-dashboard-hint a[href="/accounts"]')),
      hiddenAccountsVisible: text.includes('Closed account'),
      favoriteIds: [...document.querySelectorAll('[data-qa=visual-favorite-accounts] [data-account-id]')].map(el => Number(el.dataset.accountId)),
      favoriteColors: [...document.querySelectorAll('[data-qa=visual-favorite-accounts] [data-account-id]')].map(el => ({id:Number(el.dataset.accountId),color:el.querySelector('.visual-dashboard-swatch')?.style.background})),
      segmentColors: [...document.querySelectorAll('[data-qa=visual-account-bar] [data-account-id]')].map(el => ({id:Number(el.dataset.accountId),color:el.style.background})),
      selectionColor: document.querySelector('[data-qa=visual-account-selection] .visual-dashboard-swatch')?.style.background,
      segmentIds: [...document.querySelectorAll('[data-qa=visual-account-bar] [data-account-id]')].map(el => Number(el.dataset.accountId)),
      segmentWidths: [...document.querySelectorAll('[data-qa=visual-account-bar] [data-account-id]')].map(el => parseFloat(el.style.width)),
      selectedWallet: document.querySelector('[data-qa=visual-account-selection]')?.textContent,
      selectedWalletId: document.querySelector('[data-qa=visual-account-bar] [aria-pressed=true]')?.dataset.accountId,
      walletTooltip: document.querySelector('[data-qa=visual-account-tooltip]')?.textContent,
      favoritesEmpty: Boolean(document.querySelector('[data-qa=visual-favorites-empty] a[href="/accounts"]')),
      runtimeErrors: window.__visualDashboardErrors ?? [],
      textSample: text.slice(0, 3500),
    };
  })()`);
  return { ...state, dataMode: "fixture", ...metrics };
}

function runState(args) {
  process.stdout.write(`Visual dashboard QA: ${args.state.name}\n`);
  const language = ["russian", "long-amounts", "linked-russian", "wording-negative-ru", "wording-equal-ru", "wording-empty-ru"].includes(args.state.scenario) ? "ru" : "en";
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
        else if (["empty", "no-activity", "income-only", "wording-empty-ru"].includes(state.scenario)) await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-expenses] .visual-dashboard-empty'))");
        else await waitFor(client, "Boolean(document.querySelector('[data-qa=visual-expenses] .recharts-surface')) && !document.querySelector('.ant-spin-spinning')");
      }
    },
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(results) {
  const failures = [];
  for (const state of results) {
    if (state.interaction?.startsWith("expense-") && (!state.expenseInspection?.correct || !state.expenseInspection?.stable || !state.expenseInspection?.contained || state.expenseInspection?.tooltip)) failures.push(`${state.name}: expense detail incorrect, center shifted/overflowed or tooltip present`);
    if (state.height && state.pageHeight > state.viewport.height) failures.push(`${state.name}: dashboard exceeds viewport (${state.pageHeight}px)`);
    if (reportingScenarios.includes(state.scenario)) {
      if (!state.expenseTotal?.includes('150.00') || !state.flowExpense?.includes('150.00')
        || !state.incomeTotal?.includes('500.00') || !state.flowResult?.includes('350.00')) failures.push(`${state.name}: non-favorite report activity missing or closed account included`);
      if (state.flowRowsDisabled) failures.push(`${state.name}: report links disabled`);
      if (!state.balance?.includes('26,265.00') || !state.accountBar) failures.push(`${state.name}: all-active balance/distribution missing`);
      if (state.scenario === "report-only" && (!state.favoritesEmpty || state.favoriteIds.length)) failures.push(`${state.name}: no-favorites state incorrect`);
    }
    if (state.runtimeErrors.length) failures.push(`${state.name}: ${state.runtimeErrors.join(', ')}`);
    if (state.hiddenAccountsVisible) failures.push(`${state.name}: hidden account disclosed`);
    if (state.scenario === "classic") {
      if (state.visual || state.chartCount !== 3) failures.push(`${state.name}: classic default changed`);
      continue;
    }
    if (state.favoriteIds.length > 5 || state.favoriteIds.includes(14) || state.favoriteIds.includes(15)) failures.push(`${state.name}: ineligible account in favorites`);
    if (state.scenario === "populated" && JSON.stringify(state.favoriteIds) !== JSON.stringify([12,18,11,19,16])) failures.push(`${state.name}: favorite cap/order incorrect`);
    if (state.scenario === "two-favorites" && JSON.stringify(state.favoriteIds) !== JSON.stringify([11,13])) failures.push(`${state.name}: fewer favorites incorrect`);
    if (state.accountBar && Math.abs(state.segmentWidths.reduce((sum, width) => sum + width, 0) - 100) > 0.01) failures.push(`${state.name}: segment denominator inconsistent`);
    if (state.accountBar && state.favoriteColors.some(item => state.segmentColors.some(segment => segment.id === item.id && segment.color !== item.color))) failures.push(`${state.name}: favorite colors differ from segments`);
    if (state.selectedWalletId && state.selectionColor !== state.segmentColors.find(item => item.id === Number(state.selectedWalletId))?.color) failures.push(`${state.name}: selected color differs from segment`);
    if (state.scenario === "populated" && state.segmentIds.length !== 8) failures.push(`${state.name}: eligible segment missing`);
    if (state.interaction === "select-non-favorite" && (state.selectedWalletId !== '14' || !state.selectedWallet?.includes('Hidden reserve'))) failures.push(`${state.name}: non-favorite selection missing`);
    if (state.interaction === "select-favorite" && (state.selectedWalletId !== '13' || !state.selectedWallet?.includes('PLN') || !state.selectedWallet?.includes('USD'))) failures.push(`${state.name}: favorite currency details missing`);
    if (state.interaction === "clear-wallet" && (state.selectedWallet || state.selectedWalletId)) failures.push(`${state.name}: selection not cleared`);
    if (["hover-wallet", "focus-wallet"].includes(state.interaction) && (!state.walletTooltip?.includes('Travel card') || !state.walletTooltip?.includes('PLN') || !state.walletTooltip?.includes('USD') || !state.walletTooltip?.includes('%'))) failures.push(`${state.name}: incomplete wallet tooltip`);
    if (state.interaction === "pick-tiny-wallet" && (state.selectedWalletId !== '13' || !state.selectedWallet?.includes('<0.1%'))) failures.push(`${state.name}: tiny segment inaccessible or share rounded to zero`);
    if (state.scenario === "missing-rate" && state.favoriteIds.length !== 5) failures.push(`${state.name}: native favorites hidden by missing rates`);
    const russian = ["russian", "long-amounts", "linked-russian", "wording-negative-ru", "wording-equal-ru", "wording-empty-ru"].includes(state.scenario);
    const expectedHeadings = russian
      ? ["Куда уходят деньги", "Деньги на счетах", "Откуда пришли деньги", "Как идёт месяц"]
      : ["Where the money goes", "Money in accounts", "Where the money came from", "How the month is going"];
    if (JSON.stringify(state.headings) !== JSON.stringify(expectedHeadings)) failures.push(`${state.name}: visual section wording incorrect`);
    if (state.pageSubtitleVisible || state.untranslatedKeyVisible || state.technicalNavigationVisible) failures.push(`${state.name}: outdated or missing visual copy`);
    if (state.scenario === "income-single-parent" && !state.interaction && state.incomeContext) failures.push(`${state.name}: automatic root exposes hierarchy context`);
    if (state.interaction === "drilldown" && state.expenseContext !== "Home") failures.push(`${state.name}: category navigation context missing`);
    if (state.scenario.startsWith("wording-")) {
      const russian = state.scenario.endsWith("-ru");
      const expected = state.scenario.includes("negative") ? (russian ? "Расходов больше на" : "Expenses are higher by")
        : state.scenario.includes("empty") ? "За этот период нет операций." : (russian ? "Доходы и расходы равны" : "Income and expenses are equal");
      if (!state.flowResult?.includes(expected)) failures.push(`${state.name}: incorrect localized financial result`);
    }
    if (!state.visual || state.cardCount !== 4 || state.chartBlank) failures.push(`${state.name}: missing cards or blank chart`);
    if (["populated", "russian", "long-amounts", "single-category", "linked", "settings"].includes(state.scenario) && !state.accountBar) failures.push(`${state.name}: account shares absent`);
    if (["missing-rate", "empty", "zero-wallets", "debt-wallets"].includes(state.scenario) && state.accountBar) failures.push(`${state.name}: misleading account shares`);
    if (state.scenario === "negative" && (!state.accountBar || state.segmentIds.includes(13))) failures.push(`${state.name}: debt included in positive distribution`);
    if (state.scenario === "negative-late" && (!state.accountBar || state.segmentIds.includes(16))) failures.push(`${state.name}: late debt included in positive distribution`);
    if (state.scenario === "empty" && !state.flowRowsDisabled) failures.push(`${state.name}: empty scope navigation enabled`);
    if (state.scenario === "accounts-error" && (state.flowRows || state.flowResult)) failures.push(`${state.name}: failed scope shown as complete zeros`);
    if (state.scenario === "negative-late" && !state.negativeWarningLinked) failures.push(`${state.name}: missing link to negative wallet details`);
    if (state.width >= 1200 && state.interaction !== "settings") {
      const [expense, money, income, flow] = state.bounds;
      if (Math.abs(expense.y - money.y) > 1 || expense.width <= money.width || Math.abs(income.y - flow.y) > 1 || income.y < money.y + money.height || flow.y < expense.y + expense.height) failures.push(`${state.name}: desktop hierarchy incorrect`);
    }
    if (state.scenario === "populated" && !state.interaction && !state.flowResult?.includes('2,000')) failures.push(`${state.name}: financial result incorrect`);
    if (state.width <= 600 && state.bounds.some((card) => Math.abs(card.width - state.bounds[0].width) > 1)) failures.push(`${state.name}: mobile cards do not fill the column`);
    if (state.scenario === "single-category" && state.chartCount !== 1) failures.push(`${state.name}: single-category chart missing`);
    const singleIncome = state.scenario === "single-category";
    if (singleIncome && (state.incomeChart || state.incomeLegendCount !== 1)) failures.push(`${state.name}: single income should use a summary`);
    const multiIncome = ["populated", "russian", "long-amounts", "income-only", "income-two", "income-four", "income-tiny", "income-single-parent", "linked-russian"].includes(state.scenario) || state.interaction === "income-drilldown";
    if (multiIncome && !state.incomeChart) failures.push(`${state.name}: income donut missing`);
    if (state.scenario === "income-two" && state.incomeLegendCount !== 2) failures.push(`${state.name}: two-source legend incomplete`);
    if (state.scenario === "income-four" && state.incomeLegendCount !== 4) failures.push(`${state.name}: four-source legend incomplete`);
    if (state.scenario === "income-tiny" && state.tinyIncomeShare !== '<0.1%') failures.push(`${state.name}: small positive share rounded to zero`);
    if (state.interaction === "income-other" && state.incomeOtherMembers !== 3) failures.push(`${state.name}: grouped income values unavailable`);
    if (["empty", "no-activity", "expense-only", "category-error", "accounts-error"].includes(state.scenario) && state.incomeTotal) failures.push(`${state.name}: unavailable income shown as complete`);
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
