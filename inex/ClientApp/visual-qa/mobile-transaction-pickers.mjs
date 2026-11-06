import path from "node:path";
import { visualQaConfig as transactions } from "./transactions.mjs";
import { visualQaConfig as budgets } from "./budgets.mjs";
import {
  buildCommonChecks, evaluate, fixedDateInitScript, resolveVisualQaPaths,
  runBrowserState, runVisualQaScript, wait, waitFor,
} from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/mobile-transaction-pickers");
const fixture = {
  ...transactions.fixture,
  transactionsVisualFixtureAccounts: [
    ...transactions.fixture.transactionsVisualFixtureAccounts,
    ...Array.from({ length: 25 }, (_, i) => ({
      ...transactions.fixture.transactionsVisualFixtureAccounts[0],
      id: 700 + i, key: `picker-${i}`, name: `Счёт для повседневных расходов и накоплений ${i + 1}`,
    })),
  ],
  transactionsVisualFixtureCategories: [
    ...transactions.fixture.transactionsVisualFixtureCategories,
    ...Array.from({ length: 20 }, (_, i) => ({
      ...transactions.fixture.transactionsVisualFixtureCategories[0],
      id: 800 + i, key: `picker-${i}`, name: `Категория с длинным названием ${i + 1}`,
    })),
  ],
};

const states = [
  ...[1440, 1024, 390, 360].flatMap(width => ["account", "category"].map(kind => ({
    name: `${kind}-${width}`, kind, viewport: { width, height: 900 },
  }))),
  ...["account", "category"].map(kind => ({
    name: `${kind}-ru-360`, kind, russian: true, viewport: { width: 360, height: 760 },
  })),
  { name: "account-scrolled-360", kind: "account", scrolled: true, viewport: { width: 360, height: 600 } },
  { name: "category-scrolled-360", kind: "category", scrolled: true, viewport: { width: 360, height: 600 } },
  { name: "income-account-390", kind: "account", mode: "Income", viewport: { width: 390, height: 900 } },
  { name: "transfer-account-360", kind: "account", mode: "Transfer", viewport: { width: 360, height: 900 } },
  { name: "edit-category-360", kind: "category", edit: true, viewport: { width: 360, height: 900 } },
  ...[1440, 360].map(width => ({ name: `budget-multiple-${width}`, kind: "category", budget: true, viewport: { width, height: 900 } })),
].map(state => ({ ...state, screenshot: `${state.name}.png`, screenshotMode: "viewport", scenario: state.russian ? "correction-ru" : "populated" }));

async function click(client, selector) {
  const point = await evaluate(client, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Missing click target: ' + ${JSON.stringify(selector)});
    element.scrollIntoView({ block: 'nearest' });
    const r = element.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
}

async function key(client, value) {
  const keyCode = { Escape: 27, Tab: 9, Enter: 13, ArrowDown: 40 }[value];
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code: value, windowsVirtualKeyCode: keyCode });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code: value, windowsVirtualKeyCode: keyCode });
}

const visiblePopup = ".inex-picker-popup:not(.ant-popover-hidden)";

async function applyInteraction(client, state) {
  if (state.viewport.width <= 390) {
    await client.send("Emulation.setDeviceMetricsOverride", { ...state.viewport, deviceScaleFactor: 1, mobile: true });
    await client.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  }
  if (state.edit) {
    await click(client, ".transactions-ledger-row");
  } else {
    const label = state.budget ? "Add budget" : state.russian ? "Добавить" : "Add transaction";
    await evaluate(client, `Array.from(document.querySelectorAll('button')).find(item => item.textContent.includes(${JSON.stringify(label)})).click()`);
  }
  await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open'))");
  await wait(350);
  if (state.mode) {
    await click(client, ".transactions-create-form .ant-select-selector");
    await waitFor(client, "Boolean(document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)'))");
    await evaluate(client, `Array.from(document.querySelectorAll('.ant-select-item-option')).find(item => item.textContent.trim() === ${JSON.stringify(state.mode)}).click()`);
  }
  const pickerId = state.budget ? "category-dropdown" : state.edit ? "category" :
    state.kind === "category" ? "expense_category" : state.mode === "Income" ? "income_account" : state.mode === "Transfer" ? "transfer_from_account" : "expense_account";
  const resolvedId = state.mode === "Transfer"
    ? await evaluate(client, "document.querySelector('.transactions-create-form [data-picker-id]')?.getAttribute('data-picker-id')")
    : pickerId;
  state.trigger = `button[data-picker-id="${resolvedId}"]`;
  await waitFor(client, `Boolean(document.querySelector(${JSON.stringify(state.trigger)}))`);
  if (state.scrolled) {
    await evaluate(client, "document.querySelector('.ant-drawer-body').style.paddingTop = '160px'");
    await evaluate(client, "document.querySelector('.ant-drawer-body').scrollTop = 100");
  }
  await click(client, state.trigger);
  await waitFor(client, `Boolean(document.querySelector('${visiblePopup}'))`);
  await wait(250);
  if (state.scrolled) {
    state.scrollWhileOpenPassed = await evaluate(client, `(() => {
      const body = document.querySelector('.ant-drawer-body');
      const before = body.scrollTop;
      body.scrollTop += 40;
      return body.scrollTop > before;
    })()`);
    await wait(300);
  }
  if (state.kind === "category") {
    await click(client, `${visiblePopup} .ant-menu-submenu-title`);
    await waitFor(client, `Boolean(document.querySelector('${visiblePopup} .ant-menu-sub.ant-menu-inline .ant-menu-item'))`);
    await wait(250);
  }
  const optionSelector = state.kind === "account"
    ? `${visiblePopup} .inex-picker-menu > .ant-menu-item:last-child`
    : `${visiblePopup} .ant-menu-submenu-open .ant-menu-sub .ant-menu-item`;
  const selectedText = await evaluate(client, `document.querySelector('${optionSelector}').textContent.trim()`);
  await click(client, optionSelector);
  if (state.budget) {
    await waitFor(client, `document.querySelector(${JSON.stringify(state.trigger)}).textContent.includes(${JSON.stringify(selectedText)})`);
    await click(client, optionSelector);
    await waitFor(client, `!document.querySelector(${JSON.stringify(state.trigger)}).textContent.includes(${JSON.stringify(selectedText)})`);
    state.multipleTogglePassed = true;
  } else {
    await waitFor(client, `document.querySelector(${JSON.stringify(state.trigger)}).textContent.includes(${JSON.stringify(selectedText)}) && document.querySelector(${JSON.stringify(state.trigger)}).getAttribute('aria-expanded') === 'false'`);
    await click(client, state.trigger);
    await waitFor(client, `document.querySelector(${JSON.stringify(state.trigger)}).getAttribute('aria-expanded') === 'true'`);
  }
  state.selectionPassed = true;
  await key(client, "Tab");
  await waitFor(client, `document.querySelector(${JSON.stringify(state.trigger)}).getAttribute('aria-expanded') === 'false' && !document.querySelector('${visiblePopup}')?.contains(document.activeElement) && Boolean(document.querySelector('.ant-drawer-open'))`);
  state.tabPassed = true;
  await click(client, state.trigger);
  await wait(250);
  await key(client, "Escape");
  await waitFor(client, `document.querySelector(${JSON.stringify(state.trigger)}).getAttribute('aria-expanded') === 'false' && document.activeElement === document.querySelector(${JSON.stringify(state.trigger)}) && Boolean(document.querySelector('.ant-drawer-open'))`);
  state.escapePassed = true;
  await key(client, "ArrowDown");
  await waitFor(client, `document.querySelector(${JSON.stringify(state.trigger)}).getAttribute('aria-expanded') === 'true'`);
  await wait(250);
  if (state.kind === "category") {
    const expanded = await evaluate(client, `document.querySelector('${visiblePopup} .ant-menu-submenu-title')?.getAttribute('aria-expanded') === 'true'`);
    if (!expanded) await click(client, `${visiblePopup} .ant-menu-submenu-title`);
    if (!state.budget) {
      // Select a category near the bottom after also verifying nested-child selection.
      await click(client, `${visiblePopup} [data-menu-id$="-819"]`);
      await waitFor(client, `document.querySelector(${JSON.stringify(state.trigger)}).textContent.includes('Категория с длинным названием 20')`);
      await click(client, state.trigger);
      await wait(250);
    }
    await evaluate(client, `document.querySelector('${visiblePopup} .ant-popover-inner').scrollTop = 0`);
  }
  {
    const point = await evaluate(client, `(() => {
      const scroller = document.querySelector('${visiblePopup} .ant-popover-inner');
      scroller.scrollTop = 0;
      const r = scroller.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + Math.min(140, r.height / 2) };
    })()`);
    if (state.viewport.width <= 390) {
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, id: 1 }] });
      for (let step = 1; step <= 5; step += 1) {
        await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x, y: point.y - step * 20, id: 1 }] });
        await wait(30);
      }
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await client.send("Input.dispatchMouseEvent", { type: "mouseWheel", ...point, deltaX: 0, deltaY: 150 });
    }
    await wait(200);
    await evaluate(client, `(() => {
      const scroller = document.querySelector('${visiblePopup} .ant-popover-inner');
      window.__pickerScrollPassed = scroller.scrollTop > 0;
      ${state.kind === "category" ? "scroller.scrollTop = 0;" : ""}
    })()`);
  }
  await wait(300);
}

async function collectMetrics(client, state) {
  const measured = await evaluate(client, `(() => {
    const trigger = document.querySelector(${JSON.stringify(state.trigger)});
    const popup = document.querySelector('${visiblePopup}');
    const r = popup?.getBoundingClientRect();
    const t = trigger.getBoundingClientRect();
    const drawer = document.querySelector('.ant-drawer-content-wrapper').getBoundingClientRect();
    const inside = r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
    const attached = r && Math.abs(r.left - t.left) <= 2 && (Math.abs(r.top - t.bottom) <= 20 || Math.abs(r.bottom - t.top) <= 20);
    return {
      hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      drawerOpen: true, drawerWithinViewport: drawer.left >= -1 && drawer.right <= innerWidth + 1,
      popupWithinViewport: Boolean(inside), popupAttached: Boolean(attached),
      popupBounds: r?.toJSON(), triggerBounds: t.toJSON(),
      popupInsideDrawer: Boolean(popup?.closest('.ant-drawer-body, .ant-drawer-content')),
      noSideFlyouts: !document.querySelector('.ant-menu-submenu-popup'),
      scrollPassed: Boolean(window.__pickerScrollPassed),
      keyboardFocusInside: Boolean(popup?.contains(document.activeElement)),
    };
  })()`);
  return { name: state.name, viewport: state.viewport, screenshot: state.screenshot, dataMode: "fixture", selectionPassed: state.selectionPassed, escapePassed: state.escapePassed, tabPassed: state.tabPassed, multipleTogglePassed: state.multipleTogglePassed ?? null, scrollWhileOpenPassed: state.scrollWhileOpenPassed ?? null, ...measured };
}

runVisualQaScript(import.meta.url, {
  ...transactions, clientRoot, repoRoot, outputDir, fixture, states,
  label: "Mobile transaction pickers", userDataPrefix: "inex-picker-qa",
  createApiHandler: (data, log, unhandled, scenarioRef) => {
    const tx = transactions.createApiHandler(data, log, unhandled, scenarioRef);
    const budget = budgets.createApiHandler(budgets.fixture, log, unhandled, scenarioRef);
    return (event, client) => scenarioRef.current === "budget" ? budget(event, client) : tx(event, client);
  },
  runState: args => runBrowserState({
    ...args, state: { ...args.state, scenario: args.state.budget ? "budget" : args.state.scenario },
    routePath: args.state.budget ? "/budgets?year=2026&month=4" : "/transactions",
    initScript: fixedDateInitScript(fixture.transactionsVisualFixtureMeta.fixedNow, args.state.russian ? "ru" : "en"),
    waitForReady: client => waitFor(client, "Boolean(document.querySelector('.transactions-ledger-row, .budget-row__main'))"),
    applyInteraction, collectMetrics,
  }),
  collectAdditionalFailures: results => results.flatMap(state => [
    ...["popupWithinViewport", "popupAttached", "popupInsideDrawer", "noSideFlyouts", "selectionPassed", "escapePassed", "tabPassed", "keyboardFocusInside"].filter(check => !state[check]).map(check => `${state.name}: ${check} failed`),
    ...(!state.scrollPassed ? [`${state.name}: list did not scroll`] : []),
    ...(state.name.includes('scrolled') && !state.scrollWhileOpenPassed ? [`${state.name}: drawer did not scroll while popup open`] : []),
    ...(state.name.startsWith("budget") && !state.multipleTogglePassed ? [`${state.name}: multiple selection failed`] : []),
  ]),
  buildSummary: ({ stateResults, requestLog, unhandledApiRequests, failures }) => ({
    generatedAt: new Date().toISOString(), page: "mobile-transaction-pickers", dataMode: "fixture",
    harness: { realBackendCalled: false, apiIsolation: "All requests intercepted by the existing fixture harness" },
    states: stateResults, apiRequests: requestLog, unhandledApiRequests,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  }),
});
