import path from "node:path";
import { visualQaConfig as transactions } from "./transactions.mjs";
import { buildCommonChecks, evaluate, fixedDateInitScript, jsonResponse, problemResponse,
  resolveVisualQaPaths, runBrowserState, runVisualQaScript, setInputValue, wait, waitFor } from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const fixture = transactions.fixture;
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/transaction-edit");
const states = [
  ...[1440, 1024, 390, 360].map(width => ({ name: `expense-${width}`, mode: "expense", viewport: { width, height: 900 } })),
  { name: "expense-ru-360", mode: "expense", russian: true, viewport: { width: 360, height: 900 } },
  ...["income", "transfer", "correction", "category-search", "currency", "date", "comment", "delete-confirmation"].map(mode => ({ name: `${mode}-360`, mode, viewport: { width: 360, height: 900 } })),
  ...["save", "failure", "retry", "delete"].map(mode => ({ name: `${mode}-390`, mode, viewport: { width: 390, height: 900 } })),
].map(state => ({ ...state, screenshot: `${state.name}.png`, screenshotMode: "viewport",
  scenario: state.mode === "correction" ? "correction-edit" : state.mode === "failure" ? "edit-failure" : state.mode === "retry" ? "edit-retry" : state.russian ? "populated-ru" : "populated" }));

const form = ".transactions-edit-form";
const comment = `${form} input[id^=transaction-comment]`;
const popup = ".inex-picker-popup:not(.ant-popover-hidden)";
async function click(client, selector) {
  await evaluate(client, `(() => { const element=document.querySelector(${JSON.stringify(selector)}); if (!element) throw new Error('Missing target '+${JSON.stringify(selector)}); element.scrollIntoView({block:'center'}); element.click(); })()`);
  await wait(150);
}

async function applyInteraction(client, state) {
  const id = state.mode === "income" ? 502 : state.mode === "transfer" ? 503 : state.mode === "correction" ? 990 : 501;
  await click(client, `.transactions-ledger-row[data-transaction-id="${id}"]`);
  await waitFor(client, `Boolean(document.querySelector('${form} #edit_amount'))`);
  state.initial = await evaluate(client, `({amount:document.querySelector('#edit_amount').value,comment:document.querySelector('${comment}')?.value,
    systemReadOnly:document.querySelector('#category')?.readOnly??false,
    reasonRequired:Boolean(document.querySelector('${form} .ant-form-item-required')),
    saveDisabled:document.querySelector('${form} .transactions-drawer-actions button:last-child').disabled})`);

  if (state.mode === "category-search") {
    await click(client, "#category");
    await waitFor(client, `Boolean(document.querySelector('${popup} input'))`);
    await setInputValue(client, `${popup} input`, "Groc");
    await waitFor(client, `document.querySelector('${popup}')?.textContent.includes('Groceries')&&!document.querySelector('${popup}')?.textContent.includes('Transport')`);
  }
  if (state.mode === "currency") {
    await click(client, "#account");
    await waitFor(client, `Boolean(document.querySelector('${popup} .ant-menu-item'))`);
    await evaluate(client, `Array.from(document.querySelectorAll('${popup} .ant-menu-item')).find(item=>item.textContent.includes('USD operating')).click()`);
    await waitFor(client, "document.querySelector('.transaction-currency-feedback')?.textContent.includes('USD')");
  }
  if (state.mode === "date") {
    await click(client, ".transaction-creation-date button:last-child");
    await waitFor(client, "Boolean(document.querySelector('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)'))");
  }
  if (state.mode === "comment") {
    await click(client, ".transaction-comment-toggle");
    state.collapsed = await evaluate(client, `!document.querySelector('${comment}')`);
    await click(client, ".transaction-comment-toggle");
  }
  if (["save", "failure", "retry"].includes(state.mode)) {
    await setInputValue(client, comment, `${state.initial.comment} updated`);
    await click(client, `${form} .transactions-drawer-actions button:last-child`);
    if (state.mode !== "save") {
      await waitFor(client, `Boolean(document.querySelector('${form}'))&&document.body.innerText.includes('Controlled transaction update failure')`);
      state.failedDraftRetained = await evaluate(client, `document.querySelector('${comment}').value===${JSON.stringify(`${state.initial.comment} updated`)}`);
      if (state.mode === "retry") await click(client, `${form} .transactions-drawer-actions button:last-child`);
    }
    if (state.mode !== "failure") {
      await waitFor(client, `!document.querySelector('${form}')&&document.activeElement?.getAttribute('data-transaction-id')==='501'`);
      state.focusReturned = await evaluate(client, "document.activeElement?.getAttribute('data-transaction-id')==='501'");
    }
  }
  if (["delete", "delete-confirmation"].includes(state.mode)) {
    await click(client, `${form} .transactions-drawer-actions button:first-child`);
    await waitFor(client, "Boolean(document.querySelector('.ant-popconfirm:not(.ant-popover-hidden)'))");
    if (state.mode === "delete") {
      await click(client, ".ant-popconfirm:not(.ant-popover-hidden) .ant-btn-primary");
      await waitFor(client, `!document.querySelector('${form}')&&document.activeElement?.id==='transactions-ledger-heading'`);
      state.focusReturned = await evaluate(client, "document.activeElement?.id==='transactions-ledger-heading'");
    }
  }
}

async function collectMetrics(client, state) {
  const metrics = await evaluate(client, `(() => {
    const form=document.querySelector('${form}'),drawer=document.querySelector('.ant-drawer-open .ant-drawer-content-wrapper')?.getBoundingClientRect();
    const overlay=document.querySelector('${popup}')??document.querySelector('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')??document.querySelector('.ant-popconfirm:not(.ant-popover-hidden)');
    const p=overlay?.getBoundingClientRect(),amount=document.querySelector('#edit_amount');
    const actions=Array.from(form?.querySelectorAll('.transactions-drawer-actions button')??[]);
    return {hasHorizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,expectsMobileBottomNav:false,drawerOpen:Boolean(form),
      drawerWithinViewport:!drawer||(drawer.left>=-1&&drawer.right<=innerWidth+1),
      fieldLabels:Array.from(form?.querySelectorAll('.ant-form-item-label')??[]).map(item=>item.textContent),
      amount:amount?.value,amountFontSize:amount?parseFloat(getComputedStyle(amount).fontSize):null,
      comment:form?.querySelector('input[id^=transaction-comment]')?.value,
      popupWithinViewport:!p||(p.left>=-1&&p.right<=innerWidth+1&&p.top>=-1&&p.bottom<=innerHeight+1),
      searchText:overlay?.textContent,
      controlsWithinDrawer:!drawer||Array.from(form?.querySelectorAll('button,input')??[]).every(item=>{const r=item.getBoundingClientRect();return !r.width||(r.left>=drawer.left-1&&r.right<=drawer.right+1);}),
      footerReachable:actions.every(item=>{const r=item.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&item.scrollWidth<=item.clientWidth+1;}),
      currencyFeedback:form?.querySelector('.transaction-currency-feedback')?.textContent,
    };
  })()`);
  return { ...state, dataMode: "fixture", ...metrics };
}

runVisualQaScript(import.meta.url, {
  ...transactions, clientRoot, repoRoot, fixture, outputDir, states,
  label: "Transaction editor", userDataPrefix: "inex-transaction-edit-qa",
  createApiHandler: (data, log, unhandled, scenarioRef) => {
    const base = transactions.createApiHandler(data, log, unhandled, scenarioRef);
    return async (event, client) => {
      const url = new URL(event.request.url),method=event.request.method;
      if (url.pathname === "/api/transactions/comment-suggestions") {
        log.push("GET /transactions/comment-suggestions (fixture)");
        await client.send("Fetch.fulfillRequest", { requestId:event.requestId,...jsonResponse({suggestions:[]}) });
        return;
      }
      if (url.pathname.startsWith("/api/transactions/") && ["PUT", "DELETE"].includes(method)) {
        if (url.pathname !== "/api/transactions/501") throw new Error("Unexpected transaction mutation");
        if (method === "PUT") {
          const body=JSON.parse(event.request.postData);
          if (body.accountId!==302||body.categoryId!==404||body.amount!==-84.5||body.created!=="2026-04-30"||body.comment!==`${data.transactionsVisualFixtureTransactions[0].comment} updated`) throw new Error("Historical transaction values changed in update payload");
        }
        const attempts=(scenarioRef.requestCounts["editor-mutation"]??0)+1;
        scenarioRef.requestCounts["editor-mutation"]=attempts;
        log.push(`${method} /transactions/501 (historical payload verified)`);
        const failure=scenarioRef.current==="edit-failure"||(scenarioRef.current==="edit-retry"&&attempts===1);
        await client.send("Fetch.fulfillRequest", { requestId:event.requestId,...(failure?problemResponse("Update failure","Controlled transaction update failure",422):jsonResponse({})) });
        return;
      }
      return base(event, client);
    };
  },
  runState: args => runBrowserState({ ...args, routePath:"/transactions",
    initScript:fixedDateInitScript(fixture.transactionsVisualFixtureMeta.fixedNow,args.state.russian?"ru":"en"),
    waitForReady:client=>waitFor(client,"Boolean(document.querySelector('.transactions-ledger-row'))"),applyInteraction,collectMetrics }),
  collectAdditionalFailures:results=>results.flatMap(state=>{
    const failures=[];
    if (!state.popupWithinViewport||!state.controlsWithinDrawer||!state.footerReachable) failures.push(`${state.name}: clipped or unreachable controls/popup`);
    if (state.drawerOpen) {
      const labels=state.russian?["Счёт","Сумма","Категория"]:["Account","Amount","Category"];
      if (state.fieldLabels.slice(0,3).join("|")!==labels.join("|")) failures.push(`${state.name}: incorrect field order`);
      if (state.amountFontSize<26) failures.push(`${state.name}: missing amount emphasis`);
    }
    const expectedAmount=state.mode==="income"?"3200":state.mode==="transfer"?"-1234567890.12":state.mode==="correction"?"25":"-84.5";
    if (state.initial.amount!==expectedAmount||!state.initial.saveDisabled) failures.push(`${state.name}: initial value or unchanged-save state lost`);
    if (["transfer","correction"].includes(state.mode)&&!state.initial.systemReadOnly) failures.push(`${state.name}: editable system category`);
    if (state.mode==="correction"&&!state.initial.reasonRequired) failures.push(`${state.name}: correction reason hidden`);
    if (state.mode==="currency"&&(state.amount!=="-84.5"||!state.currencyFeedback.includes("USD"))) failures.push(`${state.name}: currency change lost number/feedback`);
    if (state.mode==="comment"&&(!state.collapsed||state.comment!==state.initial.comment)) failures.push(`${state.name}: comment disclosure lost text`);
    if (["failure","retry"].includes(state.mode)&&!state.failedDraftRetained) failures.push(`${state.name}: failed save lost draft`);
    if (["save","retry","delete"].includes(state.mode)&&(state.drawerOpen||!state.focusReturned)) failures.push(`${state.name}: mutation did not close/return focus`);
    return failures;
  }),
  buildSummary:({stateResults,requestLog,unhandledApiRequests,failures})=>({generatedAt:new Date().toISOString(),page:"transaction-edit",dataMode:"fixture",
    harness:{realBackendCalled:false,apiIsolation:"All API requests intercepted; signed historical update payload and confirmed delete verified"},
    states:stateResults,apiRequests:requestLog,unhandledApiRequests,checks:buildCommonChecks(stateResults,failures,unhandledApiRequests)}),
});
