import path from "node:path";
import { visualQaConfig as transactions } from "./transactions.mjs";
import { buildCommonChecks, evaluate, fixedDateInitScript, jsonResponse, resolveVisualQaPaths,
  runBrowserState, runVisualQaScript, setInputValue, wait, waitFor } from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/transaction-quick-entry");
const fixture = transactions.fixture;
const states = [
  ...[1440, 1024, 390, 360].flatMap(width => ["expense", "income"].map(mode => ({ name: `${mode}-${width}`, mode, viewport: { width, height: 900 } }))),
  ...["expense", "income", "correction", "internalTransfer"].map(mode => ({ name: `${mode}-ru-360`, mode, russian: true, viewport: { width: 360, height: 900 } })),
  ...["transfer", "correction", "internalTransfer", "category-search", "date", "comment", "currency", "save"].map(mode => ({ name: `${mode}-390`, mode, viewport: { width: 390, height: 900 } })),
].map(state => ({ ...state, screenshot: `${state.name}.png`, screenshotMode: "viewport", scenario: state.russian ? "default-account-ru" : "default-account" }));

async function click(client, selector) {
  await evaluate(client, `(() => { const element = document.querySelector(${JSON.stringify(selector)}); if (!element) throw new Error('Missing target: ' + ${JSON.stringify(selector)}); element.scrollIntoView({block:'nearest'}); element.click(); })()`);
  await wait(100);
}

async function applyInteraction(client, state) {
  const labels = state.russian ? { add: "Добавить", income: "Доход", transfer: "Перевод", correction: "Корректировка", internalTransfer: "Внутренний перевод" }
    : { add: "Add transaction", income: "Income", transfer: "Transfer", correction: "Correction", internalTransfer: "Internal transfer" };
  await evaluate(client, `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(${JSON.stringify(labels.add)})).click()`);
  await waitFor(client, "Boolean(document.querySelector('.transactions-create-form'))");
  await waitFor(client, "document.querySelector('#expense_account')?.textContent.includes('PLN')");
  if (["income", "transfer"].includes(state.mode)) {
    await evaluate(client, `Array.from(document.querySelectorAll('.transaction-type-buttons button')).find(b => b.textContent.trim() === ${JSON.stringify(labels[state.mode])}).click()`);
  } else if (["correction", "internalTransfer"].includes(state.mode)) {
    await click(client, ".transaction-type-more");
    await waitFor(client, "Boolean(document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden)'))");
    await evaluate(client, `Array.from(document.querySelectorAll('.ant-dropdown-menu-item')).find(b => b.textContent.trim() === ${JSON.stringify(labels[state.mode])}).click()`);
  }
  await wait(250);
  if (["expense", "income", "save", "currency", "comment", "category-search"].includes(state.mode)) {
    await waitFor(client, "document.querySelectorAll('.transaction-category-shortcuts button').length > 0");
    state.noAutomaticCategory = await evaluate(client, "document.querySelectorAll('.transaction-category-shortcuts button[aria-pressed=true]').length === 0");
  }
  if (state.mode === "transfer") {
    await click(client, "#transfer_from_account");
    await evaluate(client, "Array.from(document.querySelectorAll('.inex-picker-popup:not(.ant-popover-hidden) .ant-menu-item')).find(b=>b.textContent.includes('USD operating')).click()");
    await wait(400);
    await setInputValue(client, "#transfer_from_amount", "10");
    await click(client, "#transfer_to_account");
    await evaluate(client, "Array.from(document.querySelectorAll('.inex-picker-popup:not(.ant-popover-hidden) .ant-menu-item')).find(b=>b.textContent.includes('PLN card')).click()");
    await wait(400);
    await setInputValue(client, "#transfer_to_amount", "42.50");
  }
  if (["currency", "save", "comment"].includes(state.mode)) {
    await setInputValue(client, "#expense_amount", "12.50");
    await click(client, ".transaction-category-shortcuts button");
  }
  if (state.mode === "currency") {
    await click(client, "#expense_account");
    await evaluate(client, "Array.from(document.querySelectorAll('.inex-picker-popup:not(.ant-popover-hidden) .ant-menu-item')).find(b=>b.textContent.includes('USD operating')).click()");
  }
  if (state.mode === "comment") {
    await click(client, ".transaction-comment-toggle");
    await setInputValue(client, "input[id^=transaction-comment]", "Lunch #food @family");
    await click(client, ".transaction-comment-toggle");
    await click(client, ".transaction-comment-toggle");
  }
  if (state.mode === "category-search") {
    await click(client, "#expense_category");
    await setInputValue(client, ".inex-picker-popup:not(.ant-popover-hidden) input", "grocer");
  }
  if (state.mode === "date") await click(client, ".transaction-creation-date .ant-btn-link");
  if (state.mode === "save") {
    await click(client, ".transactions-drawer-actions button:last-child");
    await waitFor(client, "!document.querySelector('.transactions-create-form')");
  }
}

async function collectMetrics(client, state) {
  const metrics = await evaluate(client, `(() => {
    const drawer = document.querySelector('.ant-drawer-content-wrapper')?.getBoundingClientRect();
    const form = document.querySelector('.transactions-create-form');
    const popup = document.querySelector('.inex-picker-popup:not(.ant-popover-hidden), .ant-picker-dropdown:not(.ant-picker-dropdown-hidden)');
    const p = popup?.getBoundingClientRect();
    const labels = Array.from(form?.querySelectorAll('.ant-form-item-label') ?? []).map(e=>e.textContent);
    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      bottomNavVisible: Boolean(document.querySelector('.inex-bottom-nav, .shell-bottom-nav, nav[aria-label="Mobile navigation"]')),
      expectsMobileBottomNav: false,
      drawerOpen: Boolean(form), drawerWithinViewport: !drawer || (drawer.left >= -1 && drawer.right <= innerWidth+1),
      title: document.querySelector('.ant-drawer-title')?.textContent,
      selectedType: form?.querySelector('.transaction-type-buttons button[aria-pressed=true]')?.textContent.trim(),
      selectedTypeCount: form?.querySelectorAll('.transaction-type-buttons button[aria-pressed=true]').length ?? 0,
      fieldLabels: labels, amountEmpty: Array.from(form?.querySelectorAll('input[inputmode=decimal]') ?? []).every(e=>e.value===''),
      shortcutCount: form?.querySelectorAll('.transaction-category-shortcuts button').length ?? 0,
      currencyFeedback: form?.querySelector('.transaction-currency-feedback')?.textContent,
      amount: form?.querySelector('input[inputmode=decimal]')?.value,
      currencies: Array.from(form?.querySelectorAll('.ant-input-group-addon') ?? []).map(e=>e.textContent),
      comment: form?.querySelector('input[id^=transaction-comment]')?.value,
      reasonVisible: Boolean(form?.querySelector('input[maxlength="255"]')),
      popupWithinViewport: !p || (p.left >= -1 && p.right <= innerWidth+1 && p.top >= -1 && p.bottom <= innerHeight+1),
      searchText: popup?.textContent,
      controlsWithinDrawer: Array.from(form?.querySelectorAll('button,input') ?? []).every(e => {const r=e.getBoundingClientRect();return !r.width || r.left>=drawer.left-1 && r.right<=drawer.right+1;}),
      buttonTextUnclipped: Array.from(form?.querySelectorAll('.transaction-type-buttons button') ?? []).every(e => e.scrollWidth<=e.clientWidth+1 && e.scrollHeight<=e.clientHeight+1),
    };
  })()`);
  return { name: state.name, mode: state.mode, russian: state.russian ?? false, viewport: state.viewport, screenshot: state.screenshot, dataMode: "fixture", noAutomaticCategory: state.noAutomaticCategory ?? true, ...metrics };
}

runVisualQaScript(import.meta.url, {
  ...transactions, clientRoot, repoRoot, outputDir, fixture, states,
  label: "Transaction quick entry", userDataPrefix: "inex-quick-entry-qa",
  createApiHandler: (data, log, unhandled, scenarioRef) => {
    const base = transactions.createApiHandler(data, log, unhandled, scenarioRef);
    return async (event, client) => {
      const url = new URL(event.request.url);
      if (url.pathname === "/api/transactions" && event.request.method === "POST") {
        const body = JSON.parse(event.request.postData);
        if (body.accountId !== 302 || body.categoryId !== 404 || body.amount !== -12.5 || body.created !== "2026-04-30") throw new Error("Invalid saved expense payload");
        log.push("POST /transactions (expense payload verified)");
        await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse({}) });
        return;
      }
      return base(event, client);
    };
  },
  runState: args => runBrowserState({ ...args, routePath: "/transactions",
    initScript: fixedDateInitScript(fixture.transactionsVisualFixtureMeta.fixedNow, args.state.russian ? "ru" : "en"),
    waitForReady: client => waitFor(client, "Boolean(document.querySelector('.transactions-ledger-row'))"),
    applyInteraction, collectMetrics,
  }),
  collectAdditionalFailures: results => results.flatMap(state => {
    const failures = [];
    const expectedTitles = state.russian ? { expense:"Новый расход", income:"Новый доход", correction:"Коррекция баланса", internalTransfer:"Внутренний перевод" }
      : { expense:"New expense", income:"New income", transfer:"New transfer", correction:"Balance correction", internalTransfer:"Internal transfer" };
    if (state.mode !== "save" && state.selectedTypeCount !== 1) failures.push(`${state.name}: selected state ambiguous`);
    if (expectedTitles[state.mode] && state.title !== expectedTitles[state.mode]) failures.push(`${state.name}: wrong dynamic heading`);
    if (!state.noAutomaticCategory) failures.push(`${state.name}: category automatically selected`);
    if (!state.popupWithinViewport || !state.controlsWithinDrawer || !state.buttonTextUnclipped) failures.push(`${state.name}: clipped controls or popup overflow`);
    if (["expense", "income"].includes(state.mode) && !state.amountEmpty) failures.push(`${state.name}: amount prepopulated`);
    if (state.mode === "correction" && !state.reasonVisible) failures.push(`${state.name}: required reason hidden`);
    if (state.mode === "currency" && (state.amount !== "12.50" || !state.currencyFeedback.includes("USD"))) failures.push(`${state.name}: currency change lost amount/feedback`);
    if (state.mode === "comment" && state.comment !== "Lunch #food @family") failures.push(`${state.name}: collapsed comment lost markers`);
    if (state.mode === "transfer" && state.currencies.join("|") !== "USD|PLN") failures.push(`${state.name}: transfer currencies lost`);
    if (state.mode === "category-search" && (!state.searchText.includes("Living") || !state.searchText.includes("Groceries") || state.searchText.includes("Transport"))) failures.push(`${state.name}: nested search lost hierarchy/filtering`);
    if (state.mode === "save" && state.drawerOpen) failures.push(`${state.name}: save did not close drawer`);
    return failures;
  }),
  buildSummary: ({ stateResults, requestLog, unhandledApiRequests, failures }) => ({
    generatedAt: new Date().toISOString(), page: "transaction-quick-entry", dataMode: "fixture",
    harness: { realBackendCalled: false, apiIsolation: "All API requests intercepted; expense POST payload verified" },
    states: stateResults, apiRequests: requestLog, unhandledApiRequests,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  }),
});
