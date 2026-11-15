import path from "node:path";

import {
  buildCommonChecks,
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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/reports");
const fixturePath = path.join(clientRoot, "src/test/fixtures/reportsVisualFixture.ts");

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const defaultViewportHeight = 900;
const yearEnd = "2026-12-31T12:00:00.000Z";
const timezoneId = "Europe/Warsaw";
const chartMonthCount = (state) => state.chartMonths ?? 4;

const states = [
  ...["category", "budget", "history"].flatMap((report) =>
    [1440, 1024, 390, 360].map((width) => ({
      name: `${report}-typography-${width}`,
      screenshot: `${report}-typography-${width}.png`,
      viewport: { width, height: defaultViewportHeight },
      scenario: "populated",
      routePath: report === "history" ? "/reports/history?year=2026" : `/reports/${report}?interval=2026-04`,
      interaction: report === "history" ? "cash-flow-select" : width === 390 ? "change-report-month" : undefined,
    }))),
  ...["hub", "category", "budget", "history"].map((report) => ({
    name: `${report}-russian-360`,
    screenshot: `${report}-russian-360.png`,
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "russian",
    language: "ru",
    routePath: report === "hub" ? "/reports" : report === "history" ? "/reports/history?year=2026" : `/reports/${report}?interval=2026-04`,
    interaction: report === "history" ? "cash-flow-select" : undefined,
  })),
  ...[
    [320, undefined],
    [430, "cash-flow-touch"],
    [768, undefined],
    [1280, "cash-flow-hover"],
  ].map(([width, interaction]) => ({
    name: `history-chart-${width}`,
    screenshot: `history-chart-${width}.png`,
    viewport: { width, height: interaction === "cash-flow-touch" ? 700 : defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports/history?year=2026",
    ...(interaction === "cash-flow-touch" ? { fixedNow: yearEnd, chartMonths: 12 } : {}),
    interaction,
  })),
  ...[
    ["history-skewed", 320],
    ["history-sub-cent", 390],
  ].map(([scenario, width]) => ({
    name: `${scenario}-${width}`,
    screenshot: `${scenario}-${width}.png`,
    viewport: { width, height: defaultViewportHeight },
    scenario,
    routePath: "/reports/history?year=2026",
    interaction: "cash-flow-select",
  })),
  ...[
    [2025, 12, undefined],
    [2027, 0, "cash-flow-select"],
  ].map(([year, chartMonths, interaction]) => ({
    name: `history-year-${year}-1440`,
    screenshot: `history-year-${year}-1440.png`,
    viewport: { width: 1440, height: defaultViewportHeight },
    scenario: "populated",
    routePath: `/reports/history?year=${year}`,
    chartMonths,
    interaction,
  })),
  {
    name: "history-upcoming-month-390",
    screenshot: "history-upcoming-month-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports/history?year=2026",
    interaction: "cash-flow-select",
    monthIndex: 4,
  },
  ...[
    ["hub", "/reports"],
    ["category", "/reports/category?interval=2026-04"],
    ["budget", "/reports/budget?interval=2026-04"],
    ["history", "/reports/history?year=2026"],
  ].flatMap(([report, routePath]) => [
    {
      name: `linked-${report}-1440`,
      screenshot: `linked-${report}-1440.png`,
      viewport: { width: 1440, height: 1000 },
      scenario: "linked",
      routePath,
      interaction: "select-linked-account",
    },
    {
      name: `linked-${report}-390`,
      screenshot: `linked-${report}-390.png`,
      viewport: { width: 390, height: defaultViewportHeight },
      scenario: "linked",
      routePath,
      interaction: "select-linked-account",
    },
  ]),
  {
    name: "hub-populated-1440",
    screenshot: "hub-populated-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-populated-1024",
    screenshot: "hub-populated-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-populated-390",
    screenshot: "hub-populated-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-populated-360",
    screenshot: "hub-populated-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
  },
  {
    name: "hub-configure-1440",
    screenshot: "hub-configure-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports",
    interaction: "open-monthly-pdf-configuration",
  },
  {
    name: "hub-configure-390",
    screenshot: "hub-configure-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports",
    interaction: "open-monthly-pdf-configuration",
  },
  {
    name: "hub-configure-single-account-export-1440",
    screenshot: "hub-configure-single-account-export-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports",
    interaction: "export-single-configured-account",
  },
  {
    name: "category-report-1440",
    screenshot: "category-report-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports/category?interval=2026-04",
  },
  ...[360, 390, 768, 1280, 1920].map((width) => ({
    name: `category-distribution-${width}`,
    screenshot: `category-distribution-${width}.png`,
    viewport: { width, height: defaultViewportHeight },
    scenario: "category-distribution",
    routePath: "/reports/category?interval=2026-04",
    interaction: "expand-category",
  })),
  {
    name: "category-empty-390",
    screenshot: "category-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "empty",
    routePath: "/reports/category?interval=2026-04",
  },
  {
    name: "budget-report-390",
    screenshot: "budget-report-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    routePath: "/reports/budget?interval=2026-04",
  },
  {
    name: "budget-error-390",
    screenshot: "budget-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "budget-error",
    routePath: "/reports/budget?interval=2026-04",
  },
  {
    name: "history-report-1440",
    screenshot: "history-report-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    routePath: "/reports/history?year=2026",
  },
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
        return jsonResponse({ ...authUser, languageCode: scenario === "russian" ? "ru" : "en" });
      }
      if (url.pathname === "/api/auth/link-state" && method === "GET") {
        return jsonResponse(scenario === "linked" ? {
          state: "master",
          masterAccount: null,
          linkedAccounts: [{
            id: 2,
            username: "Linked QA",
            email: "linked@example.test",
            baseCurrency: "PLN",
          }],
        } : {
          state: "unlinked",
          masterAccount: null,
          linkedAccounts: [],
        });
      }
      if (url.pathname === "/api/currencies" && method === "GET") {
        return jsonResponse(fixture.reportsVisualFixtureCurrencies);
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        return jsonResponse({ data: fixture.reportsVisualFixtureAccounts });
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.reportsVisualFixtureRates });
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        return jsonResponse({ data: fixture.reportsVisualFixtureCategories });
      }
      if (url.pathname === "/api/reports/category" && method === "GET") {
        const report = fixture.reportsVisualFixtureCategoryReport;
        const stretch = scenario === "category-distribution";
        return jsonResponse({
          ...report,
          data: scenario === "empty" ? [] : report.data.map((row) => stretch && row.id === 402 ? {
            ...row,
            name: "Groceries, household essentials and recurring family purchases",
            value: -123456789012.125,
          } : row),
          metadata: {
            ...report.metadata,
            currency: scenario === "linked" ? "PLN" : stretch ? "KWD" : report.metadata.currency,
            ...(scenario === "empty" ? {
              internalTransfers: { amountReceived: 0, amountSent: 0, netChange: 0, transactionCount: 0 },
            } : {}),
          },
        });
      }
      if (url.pathname === "/api/reports/budget/comparison" && method === "GET") {
        if (scenario === "budget-error") {
          return problemResponse("Budget report fixture failure", "Controlled Reports budget failure.", 500);
        }
        return jsonResponse(scenario === "linked" ? {
          ...fixture.reportsVisualFixtureBudgetReport,
          metadata: { ...fixture.reportsVisualFixtureBudgetReport.metadata, currency: "PLN" },
        } : fixture.reportsVisualFixtureBudgetReport);
      }
      if (url.pathname.startsWith("/api/reports/history/") && method === "GET") {
        const report = fixture.reportsVisualFixtureHistoryReport;
        if (url.pathname.endsWith("/2027")) {
          return jsonResponse({
            data: report.data.map((month) => ({ ...month, income: 0, expense: 0, savings: 0 })),
          });
        }
        if (scenario === "history-skewed" || scenario === "history-sub-cent") {
          const amounts = scenario === "history-skewed" ? [
            { income: 1000, expense: 0, savings: 1000 },
            { income: 50, expense: -55, savings: -5 },
            { income: 7.216494845360825, expense: 0, savings: 7.216494845360825 },
            { income: 100.4, expense: -22.5, savings: 77.9 },
          ] : [
            { income: 0.003, expense: -0.004, savings: -0.001 },
          ];
          return jsonResponse({
            data: report.data.map((month, index) => ({
              ...month,
              ...(amounts[index] ?? { income: 0, expense: 0, savings: 0 }),
            })),
          });
        }
        return jsonResponse(report);
      }
      if (url.pathname === "/api/reports/monthly-pdf" && method === "GET") {
        return jsonResponse({ generated: true });
      }
      return null;
    },
  });
}

const cashFlowDetailClearsBottomNav = `(() => {
  const detail = document.querySelector('.cash-flow-chart__detail')?.getBoundingClientRect();
  const bottomNav = document.querySelector('.r-bottom-nav')?.getBoundingClientRect();
  return detail?.top >= 0 && detail.bottom <= bottomNav?.top;
})()`;

function selectedMonthIndex(state) {
  return state.monthIndex ?? (state.scenario === "history-sub-cent" ? 0 : state.scenario === "history-skewed" ? 2 : 3);
}

async function applyInteraction(client, state) {
  if (state.interaction === "expand-category") {
    await evaluate(client, "document.querySelector('.category-report__toggle[aria-label=\"Expand Living\"]').click()");
    await waitFor(client, "document.querySelector('.category-report__toggle[aria-expanded=true]') && document.querySelectorAll('.category-report .ant-table-row-level-1').length === 3");
    return;
  }

  if (state.interaction === "change-report-month") {
    await evaluate(client, "document.querySelector('.reports-drill-actions input').click()");
    await waitFor(client, "Boolean(document.querySelector('.ant-picker-cell[title=\"2026-03\"]'))");
    await evaluate(client, "document.querySelector('.ant-picker-cell[title=\"2026-03\"] .ant-picker-cell-inner').click()");
    await waitFor(client, "location.search === '?interval=2026-03' && document.querySelector('.reports-drill-actions input').value === '2026-03'");
    await waitForReportsReady(client, state);
    return;
  }

  if (state.interaction === "cash-flow-select") {
    const monthIndex = selectedMonthIndex(state);
    await evaluate(client, `document.querySelectorAll('.cash-flow-chart__months button')[${monthIndex}].click()`);
    await waitFor(client, `document.activeElement === document.querySelector('.cash-flow-chart__detail a') &&
      document.querySelectorAll('.cash-flow-chart__months button')[${monthIndex}].getAttribute('aria-pressed') === 'true' &&
      Boolean(document.querySelector('.cash-flow-chart__highlight'))`);
    if (state.viewport.width <= 768) await waitFor(client, cashFlowDetailClearsBottomNav);
    return;
  }

  if (state.interaction === "cash-flow-hover") {
    const point = await evaluate(client, `(() => {
      const mark = document.querySelectorAll('.cash-flow-chart__plot .recharts-bar-rectangle path')[3];
      const bounds = mark.getBoundingClientRect();
      return { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) };
    })()`);
    await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await waitFor(client, "document.querySelector('.cash-flow-chart__detail')?.textContent.includes('1,094.75')");
    await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
    await waitFor(client, "location.pathname.endsWith('/reports/category') && location.search === '?interval=2026-04'");
    await evaluate(client, "history.back()");
    await waitFor(client, `document.querySelectorAll('.cash-flow-chart__values text').length === ${3 * chartMonthCount(state)}`);
    return;
  }

  if (state.interaction === "cash-flow-touch") {
    await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await evaluate(client, "document.querySelector('.cash-flow-chart__scroll').scrollIntoView({ block: 'center' })");
    const point = await evaluate(client, `(() => {
      const viewport = document.querySelector('.cash-flow-chart__scroll').getBoundingClientRect();
      return { x: Math.round(viewport.right - 35), y: Math.round(viewport.top + 110) };
    })()`);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    for (const distance of [35, 90, 155, 230]) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, x: point.x - distance }] });
      await wait(35);
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitFor(client, "document.querySelector('.cash-flow-chart__scroll').scrollLeft > 80");
    if (await evaluate(client, "Boolean(document.querySelector('.cash-flow-chart__detail'))")) {
      throw new Error("A chart swipe opened month details");
    }

    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await waitFor(client, "Boolean(document.querySelector('.cash-flow-chart__detail a[href*=\"/reports/category?interval=2026-\"]'))");
    await waitFor(client, cashFlowDetailClearsBottomNav);

    await evaluate(client, "document.querySelectorAll('.cash-flow-chart__legend button')[1].click()");
    await waitFor(client, `document.querySelectorAll('.cash-flow-chart__values text').length === ${2 * chartMonthCount(state)}`);
    await evaluate(client, "document.querySelectorAll('.cash-flow-chart__legend button')[1].click()");
    await waitFor(client, `document.querySelectorAll('.cash-flow-chart__values text').length === ${3 * chartMonthCount(state)}`);
    return;
  }

  if (state.interaction === "select-linked-account") {
    await waitFor(client, "Boolean(document.querySelector('[aria-label=\"Financial workspace\"]'))");
    await evaluate(client, `(() => {
      const selector = document.querySelector('[aria-label="Financial workspace"]');
      if (!selector) return false;
      const trigger = selector.closest('.ant-select')?.querySelector('.ant-select-selector') ?? selector;
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
    await waitFor(client, "document.body.innerText.includes(\"Linked QA's financial workspace\") && document.body.innerText.includes('read-only mode')");
    return;
  }

  if (state.interaction !== "open-monthly-pdf-configuration" && state.interaction !== "export-single-configured-account") {
    return;
  }

  await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.textContent?.includes("Configure"));
    if (!button) throw new Error("Configure button was not found");
    button.click();
  })()`);
  await waitFor(client, "document.body.innerText.includes('Configure monthly PDF') && document.body.innerText.includes('Daily USD') && document.body.innerText.includes('Savings PLN')");

  if (state.interaction !== "export-single-configured-account") {
    return;
  }

  await evaluate(client, `(() => {
    const savingsSelection = Array.from(document.querySelectorAll(".ant-select-selection-item")).find((item) => item.textContent?.includes("Savings PLN"));
    const removeButton = savingsSelection?.querySelector(".ant-select-selection-item-remove");
    if (!removeButton) throw new Error("Savings PLN selection remove control was not found");
    removeButton.click();
  })()`);
  await waitFor(client, "document.querySelectorAll('.ant-select-selection-item').length === 1");
  await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === "Download PDF");
    if (!button) throw new Error("Configured PDF download button was not found");
    button.click();
  })()`);
  await wait(250);
}

async function waitForReportsReady(client, state) {
  if (state.routePath.startsWith("/reports/history")) {
    await waitFor(client, `(() => {
      const plot = document.querySelector('.cash-flow-chart__plot');
      const surface = plot?.querySelector('svg');
      return surface && Math.abs(surface.getBoundingClientRect().width - plot.getBoundingClientRect().width) <= 1 &&
        Math.abs(surface.getBoundingClientRect().height - plot.getBoundingClientRect().height) <= 1 &&
        document.querySelectorAll('.cash-flow-chart__months button').length === 12 &&
        document.querySelectorAll('.cash-flow-chart__values text').length === ${3 * chartMonthCount(state)};
    })()`);
    return;
  }
  if (state.language === "ru") {
    await waitFor(client, state.routePath === "/reports"
      ? "document.querySelectorAll('.reports-hub-card').length === 3"
      : "Boolean(document.querySelector('.report-accessible-summary'))");
    return;
  }
  await waitFor(client, "document.body.innerText.includes('Reports') || document.body.innerText.includes('Category Report') || document.body.innerText.includes('Budget Control') || document.body.innerText.includes('Cash Flow')");

  if (state.routePath === "/reports") {
    await waitFor(client, "document.body.innerText.includes('Category Report') && document.body.innerText.includes('Budget Control') && document.body.innerText.includes('Cash Flow')");
    return;
  }
  if (state.scenario === "budget-error") {
    await waitFor(client, "document.body.innerText.includes('reports.budgetReportError')");
    return;
  }
  if (state.name.startsWith("category-empty")) {
    await waitFor(client, "Boolean(document.querySelector('.category-report__empty') && document.querySelector('.category-report__transfers'))");
    return;
  }
  if (state.routePath.startsWith("/reports/category")) {
    await waitFor(client, "document.body.innerText.includes('Living') && document.querySelectorAll('.category-report__section-toggle').length === 2");
    return;
  }
  if (state.routePath.startsWith("/reports/budget")) {
    await waitFor(client, "document.body.innerText.includes('Groceries') && document.body.innerText.includes('Budget report data summary')");
    return;
  }
}

async function collectMetrics(client, state, apiRequestCount) {
  await evaluate(client, "window.scrollTo(0, document.documentElement.scrollHeight)");
  await wait(150);

  const metrics = await evaluate(client, `(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const bottomNav = document.querySelector(".r-bottom-nav");
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    const bottomNavVisible = Boolean(bottomNav && bottomNavStyle && bottomNavStyle.display !== "none" && bottomNav.getBoundingClientRect().height > 0);
    const bottomNavRect = bottomNavVisible ? bottomNav.getBoundingClientRect() : null;
    const content = document.querySelector(".reports-route, .reports-workspace, .report-panel");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const modal = document.querySelector(".ant-modal");
    const modalRect = modal ? modal.getBoundingClientRect() : null;
    const reportCards = Array.from(document.querySelectorAll(".reports-hub-card"));
    const reportPanels = Array.from(document.querySelectorAll(".report-panel"));
    const summaryBars = Array.from(document.querySelectorAll(".report-summary"));
    const summaryCells = Array.from(document.querySelectorAll(".report-summary .report-summary__metrics > div"));
    const headerPicker = document.querySelector(".reports-drill-actions .ant-picker")?.getBoundingClientRect();
    const headerButton = document.querySelector(".reports-drill-actions > button")?.getBoundingClientRect();
    const tableRows = Array.from(document.querySelectorAll(".report-table .ant-table-row"));
    const categoryReport = document.querySelector(".category-report");
    const categoryTable = categoryReport?.querySelector(".report-table-wrap");
    const categoryRows = tableRows.filter((row) => row.classList.contains("category-report__category-row"));
    const categoryDistribution = categoryReport ? {
      transfersOpen: categoryReport.querySelector("details")?.open,
      categoryScrolls: categoryTable.scrollWidth > categoryTable.clientWidth + 1,
      controlsFit: Array.from(categoryReport.querySelectorAll(".category-report__control"), (control) => {
        const width = control.closest(".category-report__controls").getBoundingClientRect();
        const rect = control.getBoundingClientRect();
        return rect.left >= width.left && rect.right <= width.right;
      }).every(Boolean),
      sections: Array.from(categoryReport.querySelectorAll(".category-report__section-toggle"), (section) => ({
        tone: section.dataset.tone,
        expanded: section.getAttribute("aria-expanded") === "true",
        fits: section.scrollWidth <= section.clientWidth + 1,
      })),
      mobileRows: categoryRows.length > 0 && getComputedStyle(categoryRows[0]).display === "grid",
      rows: categoryRows.map((row) => {
        const name = row.querySelector(".category-report__name > div");
        const amount = row.querySelector(".category-report__amount > div");
        const share = row.querySelector(".category-report__share > div");
        const fill = row.querySelector(".category-report__track > div");
        return {
          label: row.querySelector(".reports-link-button").textContent,
          depth: Number(row.className.match(/ant-table-row-level-([0-9]+)/)?.[1]),
          amount: amount.textContent,
          share: share.textContent,
          fillWidth: parseFloat(fill.style.width),
          tone: fill.dataset.tone,
          rowFits: Math.abs(row.getBoundingClientRect().width - categoryTable.clientWidth) <= 1,
          nameFits: name.scrollWidth <= name.clientWidth + 1,
          amountFits: amount.scrollWidth <= amount.clientWidth + 1 && amount.clientHeight <= parseFloat(getComputedStyle(amount).lineHeight) * 2 + 1,
          shareFits: share.scrollWidth <= share.clientWidth + 1,
          amountAlignment: getComputedStyle(amount.parentElement).textAlign,
        };
      }),
    } : null;
    const chartSurfaces = Array.from(document.querySelectorAll(".recharts-surface"));
    const accessibleSummaries = Array.from(document.querySelectorAll(".report-accessible-summary"));
    const cashFlowScroll = document.querySelector(".cash-flow-chart__scroll");
    const cashFlowValues = Array.from(document.querySelectorAll(".cash-flow-chart__values text"));
    const labelBoxes = cashFlowValues.map((label) => label.getBoundingClientRect());
    const chartBounds = cashFlowScroll?.querySelector("svg")?.getBoundingClientRect();
    const monthBounds = Array.from(cashFlowScroll?.querySelectorAll(".cash-flow-chart__months button") ?? [],
      (button) => button.getBoundingClientRect());
    const netPath = cashFlowScroll?.querySelector(".recharts-line-curve")?.getAttribute("d");
    const overlaps = labelBoxes.flatMap((label, index) => labelBoxes.slice(index + 1).flatMap((other, nextIndex) =>
      label.right > other.left && label.left < other.right && label.bottom > other.top && label.top < other.bottom
        ? [[cashFlowValues[index].textContent, cashFlowValues[index + 1 + nextIndex].textContent]] : []));
    const baseline = cashFlowScroll?.querySelector(".recharts-reference-line-line")?.getBoundingClientRect().top;
    const monthButtons = cashFlowScroll?.querySelector(".cash-flow-chart__months")?.getBoundingClientRect();
    const axisTicks = Array.from(cashFlowScroll?.querySelectorAll(".recharts-yAxis text") ?? []);
    const bars = cashFlowScroll?.querySelectorAll(".recharts-bar") ?? [];
    const barBounds = (bar) => Array.from(bar?.querySelectorAll(".recharts-bar-rectangle path") ?? [], (path) => path.getBoundingClientRect());
    const incomeBars = barBounds(bars[0]);
    const expenseBars = barBounds(bars[1]);
    const allBars = [...incomeBars, ...expenseBars];
    const barsMatchLabels = (key, rectangles, end, labelOffset) =>
      Array.from(cashFlowScroll.querySelectorAll('.cash-flow-chart__values text[data-series="' + key + '"]')).every((label) => {
        const x = chartBounds.left + Number(label.getAttribute("x"));
        const y = chartBounds.top + Number(label.getAttribute("y")) + labelOffset;
        return Math.abs(y - baseline) <= 1 || rectangles.some((bar) =>
          Math.abs(bar.left + bar.width / 2 - x) <= 1 && Math.abs(bar[end] - y) <= 1);
      });
    const plottedMonths = ${chartMonthCount(state)};
    const isMonthlyLine = !plottedMonths ? !netPath : /^M[^CQS]+$/.test(netPath ?? "") &&
      netPath.match(/L/g)?.length === plottedMonths - 1;
    const amountCells = Array.from(document.querySelectorAll(".cash-flow-report .report-summary dd, .cash-flow-chart__detail dd"));
    const detail = document.querySelector(".cash-flow-chart__detail");
    const detailAmounts = Array.from(detail?.querySelectorAll("dd") ?? [], (amount) => amount.textContent);
    const cashFlow = cashFlowScroll ? {
      labels: cashFlowValues.length,
      months: monthBounds.length,
      labelsAlignWithMonths: monthBounds.slice(0, plottedMonths).every((bounds, index) => {
        const label = labelBoxes[index * 3];
        return label && Math.abs(label.left + label.width / 2 - bounds.left - bounds.width / 2) <= 1;
      }),
      overlappingLabels: overlaps,
      clippedLabels: chartBounds ? labelBoxes.some((label) =>
        label.left < chartBounds.left || label.right > chartBounds.right || label.top < chartBounds.top ||
        label.bottom > Math.min(chartBounds.bottom, monthButtons.top)) : true,
      axisClips: chartBounds ? axisTicks.some((tick) => tick.getBoundingClientRect().left < chartBounds.left) : true,
      uniqueTicks: new Set(axisTicks.map((tick) => tick.textContent)).size === axisTicks.length,
      tickValues: axisTicks.map((tick) => tick.textContent),
      labelValues: cashFlowValues.map((label) => label.textContent),
      signedBars: !plottedMonths ? allBars.length === 0 : baseline !== undefined && bars.length === 2 && incomeBars.length > 0 && expenseBars.length > 0 &&
        incomeBars.every((bar) => Math.abs(bar.bottom - baseline) <= 1) &&
        expenseBars.every((bar) => Math.abs(bar.top - baseline) <= 1),
      barsInPlottedMonths: allBars.every((bar) => bar.right <= monthBounds[plottedMonths - 1]?.right),
      consistentBarWidths: allBars.every((bar) => Math.abs(bar.width - allBars[0].width) <= 1),
      barsMatchLabels: Boolean(chartBounds && baseline !== undefined &&
        barsMatchLabels("income", incomeBars, "top", 12) && barsMatchLabels("expense", expenseBars, "bottom", -12)),
      areaCount: cashFlowScroll.querySelectorAll(".recharts-area").length,
      linearPath: isMonthlyLine,
      netMarkers: cashFlowScroll.querySelectorAll("circle.recharts-line-dot").length,
      formattedAmounts: amountCells.every((amount) => /[.,]\\d{2}\\s(?:USD|PLN)$/.test(amount.textContent) && !/^[+−-]0[.,]00\\s/.test(amount.textContent)),
      detailMonth: detail?.querySelector("strong")?.textContent,
      detailAmounts,
      detailFits: Array.from(detail?.querySelectorAll("dt, dd") ?? []).every((item) => item.scrollWidth <= item.clientWidth),
      pendingDetail: detail?.querySelector(".cash-flow-chart__pending")?.textContent,
      selectedMonthBackground: getComputedStyle(cashFlowScroll.querySelector(".cash-flow-chart__months button[aria-pressed='true']") ??
        cashFlowScroll.querySelector(".cash-flow-chart__months button")).backgroundColor,
      chartCurrency: document.querySelector(".cash-flow-chart__currency")?.textContent,
      scrolls: cashFlowScroll.scrollWidth > cashFlowScroll.clientWidth,
      summaryHeight: document.querySelector(".report-summary").getBoundingClientRect().height,
      localizedMonths: cashFlowScroll.querySelector(".cash-flow-chart__months button").textContent,
      titles: document.querySelectorAll(".cash-flow-report h2").length,
    } : null;

    return {
      title: document.title,
      russianLabelsVisible: /отч[её]т/i.test(document.body.innerText),
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
      modalOpen: Boolean(modal),
      modalWithinViewport: modalRect ? modalRect.left >= 0 && modalRect.right <= window.innerWidth : null,
      modalBounds: modalRect ? { left: modalRect.left, right: modalRect.right, width: modalRect.width } : null,
      reportCardCount: reportCards.length,
      drilldownHeaderButtons: document.querySelectorAll(".reports-drill-actions button").length,
      reportPanelCount: reportPanels.length,
      headerControlsAligned: Boolean(headerPicker && headerButton &&
        headerPicker.right <= headerButton.left && headerButton.right <= window.innerWidth &&
        Math.abs(headerPicker.top + headerPicker.height / 2 - headerButton.top - headerButton.height / 2) <= 1),
      summaryBarCount: summaryBars.length,
      summaryMetricCount: summaryCells.length,
      overflowingSummaryMetrics: summaryCells.filter((cell) => {
        const value = cell.querySelector("dd");
        return value.scrollWidth > value.clientWidth + 1;
      }).length,
      tableRowCount: tableRows.length,
      categoryDistribution,
      chartSurfaceCount: chartSurfaces.length,
      accessibleSummaryCount: accessibleSummaries.length,
      visibleBottomSummaryCount: accessibleSummaries.filter((summary) => summary.getBoundingClientRect().height > 1).length,
      cashFlow,
      reportCardHeights: reportCards.map((card) => card.getBoundingClientRect().height),
      hubVisible: reportCards.length > 0,
      categoryReportVisible: document.body.innerText.includes("Category report data summary"),
      budgetReportVisible: document.body.innerText.includes("Budget report data summary"),
      historyReportVisible: document.body.innerText.includes("Cash flow chart data summary"),
      reportErrorVisible: document.body.innerText.includes("reports.budgetReportError"),
      emptyReportVisible: document.body.innerText.includes("No data"),
      linkedSelectorVisible: Boolean(document.querySelector('[aria-label="Financial workspace"]')),
      readOnlyNoticeVisible: document.body.innerText.includes("read-only mode"),
      dataModeLabel: ${JSON.stringify("fixture")},
      apiRequestCount: ${apiRequestCount},
      textSample: document.body.innerText.replace(/\\s+/g, " ").trim().slice(0, 1400),
    };
  })()`);

  return {
    name: state.name,
    dataMode: "fixture",
    screenshot: state.screenshot,
    viewport: state.viewport,
    scenario: state.scenario,
    routePath: state.routePath,
    chartMonths: chartMonthCount(state),
    monthIndex: selectedMonthIndex(state),
    fixedNow: state.fixedNow ?? fixtureExports.reportsVisualFixtureMeta.fixedNow,
    timezoneId,
    interaction: state.interaction ?? null,
    ...metrics,
  };
}

function runState(args) {
  const { state } = args;
  return runBrowserState({
    ...args,
    state: {
      ...state,
      timezoneId,
      screenshotMode: state.routePath.startsWith("/reports/history") && state.viewport.width >= 1024 ? "viewport" : undefined,
    },
    routePath: state.routePath,
    initScript: fixedDateInitScript(state.fixedNow ?? args.fixture.reportsVisualFixtureMeta.fixedNow, state.language ?? "en"),
    waitForReady: waitForReportsReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const failures = [];
  for (const state of stateResults) {
    if (state.routePath.startsWith("/reports/")) {
      if (state.drilldownHeaderButtons !== 1 || !state.headerControlsAligned) {
        failures.push(`${state.name}: the period picker and All reports button must share one header row`);
      }
      const metricCount = state.routePath.startsWith("/reports/budget") ? 8 : 3;
      if (state.summaryBarCount !== 1 || state.summaryMetricCount !== metricCount) {
        failures.push(`${state.name}: expected one summary bar with ${metricCount} metrics`);
      }
    }
    if (state.interaction === "change-report-month") {
      const expectedRequest = state.routePath.startsWith("/reports/category")
        ? "GET /reports/category?filter=Start:2026-03-01;End:2026-03-31;&currency=USD"
        : "GET /reports/budget/comparison?year=2026&month=3&currency=USD";
      if (!state.requestLog.includes(expectedRequest)) {
        failures.push(`${state.name}: changing the month did not request ${expectedRequest}`);
      }
    }
    if (state.scenario === "russian" && !state.russianLabelsVisible) failures.push(`${state.name}: Russian labels did not load`);
    if (state.visibleBottomSummaryCount > 0) failures.push(`${state.name}: duplicate bottom summary is visible`);
    if (state.overflowingSummaryMetrics > 0) failures.push(`${state.name}: summary metrics overflow their cells`);
    if (state.reportCardHeights.some((height) => height >= 190)) failures.push(`${state.name}: report list card is not compact`);
    if (state.categoryDistribution) {
      const { transfersOpen, categoryScrolls, controlsFit, sections, mobileRows, rows } = state.categoryDistribution;
      if (transfersOpen !== (state.scenario !== "empty")) failures.push(`${state.name}: unexpected default transfer disclosure state`);
      if (categoryScrolls || !controlsFit || sections.some((section) => !section.fits) || rows.some((row) => !row.rowFits || !row.nameFits || !row.amountFits || !row.shareFits)) failures.push(`${state.name}: category distribution does not fit the available width`);
      if (sections.map(({ tone }) => tone).join() !== "income,expense" || sections.some((section) => !section.expanded)) failures.push(`${state.name}: expected two expanded category sections`);
      if (rows.length && mobileRows !== (state.viewport.width <= 768)) failures.push(`${state.name}: incorrect responsive category layout`);
      if (rows.some((row) => row.amountAlignment !== "end")) failures.push(`${state.name}: category amounts are misaligned`);
      if (state.interaction === "expand-category") {
        const [parent, child, tinyRow] = rows.slice(2);
        const [salary, freelance] = rows;
        if (rows.length !== 7 || child?.depth !== 1 || !child.label.startsWith("Groceries,") || child.amount !== "123,456,789,012.125 KWD" ||
            parent.label !== "Living" || parent.tone !== "expense" || parent.share !== "100%" || tinyRow.share !== "0%" || tinyRow.fillWidth <= 0 ||
            salary?.label !== "Salary" || salary.tone !== "income" || salary.share !== "76.6%" || freelance?.label !== "Freelance") {
          failures.push(`${state.name}: incorrect hierarchical distribution or monetary precision`);
        }
      }
    }
    if (state.routePath.startsWith("/reports/history")) {
      const chart = state.cashFlow;
      if (!chart || chart.labels !== 3 * state.chartMonths || chart.months !== 12) failures.push(`${state.name}: chart values do not match the reporting year`);
      if (!chart) continue;
      if (!chart.labelsAlignWithMonths) failures.push(`${state.name}: chart labels do not align with their months`);
      if (chart.overlappingLabels.length || chart.clippedLabels || chart.axisClips) failures.push(`${state.name}: chart or axis labels overlap or are clipped (${JSON.stringify(chart.overlappingLabels)})`);
      if (!chart.signedBars || !chart.consistentBarWidths || !chart.barsInPlottedMonths) failures.push(`${state.name}: expected equal-width bars on opposite sides of zero and no bars in future months`);
      if (!chart.barsMatchLabels) failures.push(`${state.name}: bars do not align with their value labels`);
      if (chart.areaCount) failures.push(`${state.name}: chart still renders area fills`);
      if (!chart.linearPath || chart.netMarkers !== state.chartMonths) failures.push(`${state.name}: expected a straight net cash flow line with a marker for each plotted month`);
      if (!chart.formattedAmounts || !chart.detailFits) failures.push(`${state.name}: summary or detail currency formatting or layout is invalid`);
      if (state.interaction === "cash-flow-select") {
        const year = new URLSearchParams(state.routePath.split("?")[1]).get("year");
        const isUpcoming = state.monthIndex >= state.chartMonths;
        if (!chart.detailMonth?.includes(year) || (isUpcoming ? !chart.pendingDetail || chart.detailAmounts.length : chart.detailAmounts.length !== 3)) {
          failures.push(`${state.name}: selected month details are missing or invalid`);
        }
        if (chart.selectedMonthBackground !== "rgba(0, 0, 0, 0)") failures.push(`${state.name}: selected month button has a background`);
      }
      if (![...chart.labelValues, ...chart.tickValues].every((value) => /^[+−]?\d[\d,\.\s]*$/.test(value) && !/^[+−]0$/.test(value))) {
        failures.push(`${state.name}: chart numbers use invalid formatting`);
      }
      if (!chart.chartCurrency?.includes(state.scenario === "linked" ? "PLN" : "USD")) failures.push(`${state.name}: chart currency is missing`);
      if (state.name === "history-russian-360" && chart.labelValues.slice(0, 6).map((value) => value.replace(/\s/g, " ")).join("|") !== "3 050|−2 320|+730|3 080|−4 390|−1 310") {
        failures.push(`${state.name}: chart values are not localized, grouped, and signed`);
      }
      if (state.name === "history-year-2025-1440" && chart.labelValues.slice(12, 15).join("|") !== "0|0|0") {
        failures.push(`${state.name}: past months without activity must show zero values`);
      }
      if (state.scenario === "history-skewed" && chart.labelValues[8] !== "+7.2") failures.push(`${state.name}: chart values under 10 must round to one decimal place`);
      if (state.scenario === "history-skewed" && chart.labelValues.slice(9, 12).join("|") !== "100|−23|+78") {
        failures.push(`${state.name}: chart values of at least 10 must round to integers`);
      }
      if (state.scenario === "history-sub-cent" && chart.labelValues.some((value) => value !== "0")) {
        failures.push(`${state.name}: sub-cent chart values must round to unsigned zero`);
      }
      if (state.scenario === "history-sub-cent" && chart.detailAmounts.some((amount) => amount !== "0.00 USD")) failures.push(`${state.name}: sub-cent amounts did not round to unsigned zero`);
      if (state.scenario === "history-skewed" && chart.detailAmounts[2] !== "+7.22 USD") failures.push(`${state.name}: net amount was not rounded and signed`);
      if (!chart.uniqueTicks) failures.push(`${state.name}: y-axis tick labels repeat`);
      if (state.viewport.width >= 1024 && chart.scrolls) failures.push(`${state.name}: desktop chart requires horizontal scrolling`);
      if (state.viewport.width < 500 && !chart.scrolls) failures.push(`${state.name}: mobile chart does not scroll`);
      if (chart.summaryHeight > 140 || chart.titles > 0) failures.push(`${state.name}: summary or report chrome exceeds its layout`);
      if (state.scenario === "russian" && !/янв/i.test(chart.localizedMonths)) failures.push(`${state.name}: chart months are not localized`);
    }
  }
  for (const state of stateResults.filter((candidate) => candidate.scenario === "linked")) {
    if (!state.linkedSelectorVisible) failures.push(`${state.name}: linked-account selector is not visible`);
    if (!state.readOnlyNoticeVisible) failures.push(`${state.name}: linked read-only notice is not visible`);

    const expectedRequests = ["GET /accounts?mode=active&linkedUserId=2"];
    if (state.routePath.startsWith("/reports/category")) {
      expectedRequests.push(
        "GET /categories?mode=ALL&linkedUserId=2",
        "GET /reports/category?filter=Start:2026-04-01;End:2026-04-30;&currency=PLN&linkedUserId=2",
      );
    } else if (state.routePath.startsWith("/reports/budget")) {
      expectedRequests.push("GET /reports/budget/comparison?year=2026&month=4&currency=PLN&linkedUserId=2");
    } else if (state.routePath.startsWith("/reports/history")) {
      expectedRequests.push("GET /reports/history/2026?currency=PLN&linkedUserId=2");
    }

    for (const expectedRequest of expectedRequests) {
      if (!state.requestLog.includes(expectedRequest)) {
        failures.push(`${state.name}: missing linked-scoped request ${expectedRequest}`);
      }
    }
  }

  const configuredExport = stateResults.find((state) => state.name === "hub-configure-single-account-export-1440");
  if (!configuredExport) {
    return [...failures, "Configured account export visual QA state is missing"];
  }

  const expectedRequest = "GET /reports/monthly-pdf?year=2026&month=4&accountIds=101";
  if (!configuredExport.requestLog.includes(expectedRequest)) {
    failures.push(`Configured account export did not request exactly ${expectedRequest}`);
  }
  return failures;
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "reports",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.reportsVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/reportsVisualFixture.ts",
      baseline: fixture.reportsVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.reportsVisualFixtureMeta.expectedBaseCurrency,
      expectedReportCardCount: fixture.reportsVisualFixtureMeta.expectedReportCardCount,
      expectedCategoryReportRows: fixture.reportsVisualFixtureMeta.expectedCategoryReportRows,
      expectedBudgetReportRows: fixture.reportsVisualFixtureMeta.expectedBudgetReportRows,
      expectedHistoryMonths: fixture.reportsVisualFixtureMeta.expectedHistoryMonths,
      nonApplicableStates: fixture.reportsVisualFixtureMeta.nonApplicableStates,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Reports fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5203,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Reports",
  userDataPrefix: "inex-reports-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
