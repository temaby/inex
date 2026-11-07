import path from "node:path";
import { visualQaConfig as transactions } from "./transactions.mjs";
import { buildCommonChecks, evaluate, fixedDateInitScript, jsonResponse, resolveVisualQaPaths,
  runBrowserState, runVisualQaScript, wait, waitFor } from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const fixture = transactions.fixture;
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/transaction-comment-autocomplete");
const states = [
  ...[1440, 1024, 390, 360].map(width => ({ name: `tags-${width}`, mode: "tags", viewport: { width, height: 900 } })),
  { name: "refs-ru-360", mode: "refs", russian: true, viewport: { width: 360, height: 900 } },
  { name: "long-360-short", mode: "long", viewport: { width: 360, height: 480 } },
  { name: "save-360", mode: "save", viewport: { width: 360, height: 900 } },
  ...["empty", "error", "keyboard", "touch", "correction"].map(mode => ({ name: `${mode}-360`, mode, viewport: { width: 360, height: 900 } })),
].map(state => ({ ...state, screenshot: `${state.name}.png`, screenshotMode: "viewport", scenario: state.russian ? "default-account-ru" : "default-account" }));

const inputSelector = "input[id^=transaction-comment]";
const popupSelector = ".transaction-comment-popup:not(.ant-popover-hidden)";
async function click(client, selector) {
  await evaluate(client, `(() => { const element=document.querySelector(${JSON.stringify(selector)}); if(!element) throw new Error('Missing ${selector}'); element.scrollIntoView({block:'center'}); element.click(); })()`);
  await wait(150);
}
async function type(client, value) {
  await evaluate(client, `document.querySelector(${JSON.stringify(inputSelector)}).focus()`);
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2, windowsVirtualKeyCode: 65 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2 });
  await client.send("Input.insertText", { text: value });
}
async function key(client, value, code) {
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code, windowsVirtualKeyCode: { ArrowDown: 40, Enter: 13, Escape: 27 }[value] });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code });
}

async function applyInteraction(client, state) {
  await evaluate(client, `Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes(${JSON.stringify(state.russian ? "Добавить" : "Add transaction")})).click()`);
  await waitFor(client, "Boolean(document.querySelector('.transactions-create-form'))");
  await waitFor(client, "document.querySelector('#expense_account')?.textContent.includes('PLN')");
  state.initiallyCollapsed = await evaluate(client, `!document.querySelector(${JSON.stringify(inputSelector)})`);
  if (state.mode === "correction") {
    await click(client, ".transaction-type-more");
    await waitFor(client, "Boolean(document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden)'))");
    await evaluate(client, "Array.from(document.querySelectorAll('.ant-dropdown-menu-item')).find(button=>button.textContent.trim()==='Correction').click()");
  } else await click(client, ".transaction-comment-toggle");
  await evaluate(client, `document.querySelector(${JSON.stringify(inputSelector)}).scrollIntoView({block:'center'})`);
  const initial = state.mode === "refs" ? "Подарок для @ма" : state.mode === "empty" ? "#zzz" : state.mode === "error" ? "#offline" : "Shopping for #gro";
  await type(client, initial);
  await waitFor(client, `Boolean(document.querySelector('${popupSelector} ${["empty","error"].includes(state.mode) ? ".transaction-comment-status" : "[role=option]"}'))`);
  if (state.mode === "empty") await waitFor(client, `document.querySelector('${popupSelector}')?.textContent.includes('No matches')`);
  if (state.mode === "error") await waitFor(client, `document.querySelector('${popupSelector}')?.textContent.includes('Suggestions unavailable')`);
  if (state.mode === "long") {
    await type(client, "#long");
    await waitFor(client, `document.querySelector('${popupSelector} [role=option]')?.textContent.includes('WWW')`);
    for (let index = 0; index < 4; index++) await key(client, "ArrowDown", "ArrowDown");
    state.highlightVisible = await evaluate(client, `(() => { const box=document.querySelector('${popupSelector} .transaction-comment-suggestions'); const row=box.querySelector('[aria-selected=true]'); const b=box.getBoundingClientRect(),r=row.getBoundingClientRect();return box.scrollHeight>box.clientHeight&&r.top>=b.top-1&&r.bottom<=b.bottom+1;})()`);
  }
  if (state.mode === "save") {
    await key(client, "Enter", "Enter");
    await evaluate(client, "document.querySelector('#expense_amount').focus()");
    await client.send("Input.insertText", { text: "12.50" });
    await click(client, ".transaction-category-shortcuts button");
    await click(client, ".transactions-drawer-actions button:last-child");
    await waitFor(client, "!document.querySelector('.transactions-create-form')");
    state.saveWorked = true;
    return;
  }
  if (["touch", "keyboard"].includes(state.mode)) {
    if (state.mode === "touch") {
      const point = await evaluate(client, `(() => {const r=document.querySelector('${popupSelector} [role=option]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
      await client.send("Emulation.setTouchEmulationEnabled", { enabled: true });
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, radiusX: 1, radiusY: 1, force: 1, id: 1 }] });
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else { await key(client, "ArrowDown", "ArrowDown"); await key(client, "Enter", "Enter"); }
    await wait(250);
    state.selectionWorked = await evaluate(client, `document.querySelector('${inputSelector}').value === ${JSON.stringify(state.mode === "touch" ? "Shopping for #groceries" : "Shopping for #groceries-weekly")}`);
    state.focusRetained = await evaluate(client, `document.activeElement===document.querySelector('${inputSelector}')`);
    await type(client, "Gift @ma");
    await waitFor(client, `Boolean(document.querySelector('${popupSelector} [role=option]'))`);
    await key(client, "Escape", "Escape");
    await waitFor(client, `!document.querySelector('${popupSelector}')`);
    state.escapeKeptDrawer = await evaluate(client, "Boolean(document.querySelector('.transactions-create-form'))");
    state.escapeClosedPopup = await evaluate(client, `!document.querySelector('${popupSelector}') && document.querySelector('${inputSelector}').value === 'Gift @ma'`);
    await type(client, "Shopping #gro");
    await waitFor(client, `Boolean(document.querySelector('${popupSelector} [role=option]'))`);
  }
}

async function collectMetrics(client, state) {
  const metrics = await evaluate(client, `(() => {
    const popup=document.querySelector('${popupSelector}'); const p=popup?.getBoundingClientRect();
    const footer=document.querySelector('.transactions-drawer-actions')?.getBoundingClientRect();
    const input=document.querySelector('${inputSelector}'); const options=Array.from(popup?.querySelectorAll('[role=option]')??[]);
    return {hasHorizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,drawerOpen:Boolean(input),expectsMobileBottomNav:false,
      popupWithinViewport:Boolean(p)&&p.left>=-1&&p.right<=innerWidth+1&&p.top>=-1&&p.bottom<=innerHeight+1,
      footerPresent:Boolean(footer), footerClear:!p||!footer||p.bottom<=footer.top+1||p.top>=footer.bottom-1,
      touchTargets:options.every(option=>option.getBoundingClientRect().height>=44), optionCount:options.length,
      popupText:popup?.textContent, comment:input?.value, combobox:input?.getAttribute('role')==='combobox',
      noTextClipping:options.every(option=>option.scrollWidth<=option.clientWidth+1),
    }; })()`);
  return { ...state, dataMode: "fixture", ...metrics };
}

runVisualQaScript(import.meta.url, {
  ...transactions, clientRoot, repoRoot, outputDir, fixture, states,
  label: "Transaction comment autocomplete", userDataPrefix: "inex-comment-autocomplete-qa",
  createApiHandler: (data, log, unhandled, scenarioRef) => {
    const base = transactions.createApiHandler(data, log, unhandled, scenarioRef);
    return async (event, client) => {
      const url = new URL(event.request.url);
      if (url.pathname === "/api/transactions/comment-suggestions") {
        if (url.searchParams.has("userId") || url.searchParams.has("linkedUserId")) throw new Error("Owner parameter sent");
        const query = url.searchParams.get("query") ?? "";
        const refs = url.searchParams.get("type") === "ref";
        const suggestions = query === "long" ? Array.from({length:5},(_,index)=>`long${"W".repeat(40)}${index}`)
          : query === "zzz" ? [] : refs ? (query.startsWith("ма") ? ["мама", "мария", "макс"] : ["mary", "mark"]) : ["groceries", "groceries-weekly", "grow", "grove", "agro-market"];
        log.push(`GET /transactions/comment-suggestions ${refs ? "ref" : "tag"} ${query}`);
        await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse(query === "offline" ? { title: "Unavailable" } : { suggestions }, query === "offline" ? 503 : 200) });
        return;
      }
      if (url.pathname === "/api/transactions" && event.request.method === "POST") {
        const body = JSON.parse(event.request.postData);
        if (body.comment !== "Shopping for #groceries" || body.amount !== -12.5 || body.accountId !== 302 || body.categoryId !== 404) throw new Error("Selected comment missing from saved expense payload");
        log.push("POST /transactions (selected comment and expense payload verified)");
        await client.send("Fetch.fulfillRequest", { requestId:event.requestId,...jsonResponse({}) });
        return;
      }
      return base(event, client);
    };
  },
  runState: args => runBrowserState({ ...args, routePath: "/transactions",
    initScript: fixedDateInitScript(fixture.transactionsVisualFixtureMeta.fixedNow, args.state.russian ? "ru" : "en"),
    waitForReady: client => waitFor(client, "Boolean(document.querySelector('.transactions-ledger-row'))"), applyInteraction, collectMetrics }),
  collectAdditionalFailures: results => results.flatMap(state => {
    const failures=[];
    if (state.mode === "save") return state.saveWorked && !state.drawerOpen ? [] : [`${state.name}: selected comment save failed`];
    if (!state.initiallyCollapsed || !state.popupWithinViewport || !state.footerPresent || !state.footerClear || !state.touchTargets || !state.noTextClipping || !state.combobox) failures.push(`${state.name}: collapsed state/accessibility/popup bounds failed`);
    if (!["empty","error"].includes(state.mode) && state.optionCount!==5 && state.mode!=="refs") failures.push(`${state.name}: expected five bounded options`);
    if (state.mode === "refs" && (state.optionCount !== 3 || state.popupText !== "@мама@мария@макс")) failures.push(`${state.name}: reference results incorrect`);
    if (state.mode === "long" && !state.highlightVisible) failures.push(`${state.name}: highlighted long option unreachable`);
    if (["touch","keyboard"].includes(state.mode) && (!state.selectionWorked||!state.focusRetained||!state.escapeKeptDrawer||!state.escapeClosedPopup)) failures.push(`${state.name}: selection/focus/Escape failed`);
    return failures;
  }),
  buildSummary: ({ stateResults, requestLog, unhandledApiRequests, failures }) => ({ generatedAt:new Date().toISOString(),page:"transaction-comment-autocomplete",dataMode:"fixture",
    harness:{realBackendCalled:false,apiIsolation:"All API requests intercepted; marker queries and pointer/touch selection verified"},states:stateResults,apiRequests:requestLog,unhandledApiRequests,
    checks:buildCommonChecks(stateResults,failures,unhandledApiRequests) }),
});
