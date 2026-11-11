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

const states = [
  ...["category", "budget", "history"].flatMap((report) =>
    [1440, 1024, 390, 360].map((width) => ({
      name: `${report}-typography-${width}`,
      screenshot: `${report}-typography-${width}.png`,
      viewport: { width, height: defaultViewportHeight },
      scenario: "populated",
      routePath: report === "history" ? "/reports/history?year=2026" : `/reports/${report}?interval=2026-04`,
    }))),
  ...["hub", "category", "budget", "history"].map((report) => ({
    name: `${report}-russian-360`,
    screenshot: `${report}-russian-360.png`,
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "russian",
    language: "ru",
    routePath: report === "hub" ? "/reports" : report === "history" ? "/reports/history?year=2026" : `/reports/${report}?interval=2026-04`,
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
  })),
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
        return jsonResponse({
          ...fixture.reportsVisualFixtureCategoryReport,
          data: scenario === "empty" ? [] : fixture.reportsVisualFixtureCategoryReport.data,
          metadata: {
            ...fixture.reportsVisualFixtureCategoryReport.metadata,
            currency: scenario === "linked" ? "PLN" : fixture.reportsVisualFixtureCategoryReport.metadata.currency,
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
        if (scenario === "history-skewed" || scenario === "history-sub-cent") {
          const amounts = scenario === "history-skewed" ? [
            { income: 1000, expense: 0, savings: 1000 },
            { income: 50, expense: -55, savings: -5 },
            { income: 7.216494845360825, expense: 0, savings: 7.216494845360825 },
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

async function applyInteraction(client, state) {
  if (state.interaction === "cash-flow-hover") {
    const point = await evaluate(client, `(() => {
      const mark = document.querySelectorAll('.cash-flow-chart__values > g')[3].querySelector('text');
      const bounds = mark.getBoundingClientRect();
      return { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + 30) };
    })()`);
    await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await waitFor(client, "document.querySelector('.cash-flow-chart__detail')?.textContent.includes('1,094.75')");
    await client.send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
    await waitFor(client, "location.pathname.endsWith('/reports/category') && location.search === '?interval=2026-04'");
    await evaluate(client, "history.back()");
    await waitFor(client, "document.querySelectorAll('.cash-flow-chart__values text').length === 36");
    return;
  }

  if (state.interaction === "cash-flow-touch") {
    await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await evaluate(client, "document.querySelector('.cash-flow-actions__more').click()");
    await waitFor(client, "Array.from(document.querySelectorAll('[role=menuitem]')).map((item) => item.textContent).join(',') === 'Share,Export,Print'");
    await evaluate(client, "document.querySelector('.cash-flow-actions__more').click()");
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
    await waitFor(client, `(() => {
      const detail = document.querySelector('.cash-flow-chart__detail')?.getBoundingClientRect();
      const bottomNav = document.querySelector('.r-bottom-nav')?.getBoundingClientRect();
      return detail?.top >= 0 && detail.bottom <= bottomNav.top;
    })()`);

    await evaluate(client, "document.querySelectorAll('.cash-flow-chart__legend button')[1].click()");
    await waitFor(client, "document.querySelectorAll('.cash-flow-chart__values text').length === 24");
    await evaluate(client, "document.querySelectorAll('.cash-flow-chart__legend button')[1].click()");
    await waitFor(client, "document.querySelectorAll('.cash-flow-chart__values text').length === 36");
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
        document.querySelectorAll('.cash-flow-chart__values text').length === 36;
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
    await waitFor(client, "document.body.innerText.includes('No data')");
    return;
  }
  if (state.routePath.startsWith("/reports/category")) {
    await waitFor(client, "document.body.innerText.includes('Living') && document.body.innerText.includes('Category report data summary')");
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
    const statCards = Array.from(document.querySelectorAll(".report-stat"));
    const tableRows = Array.from(document.querySelectorAll(".report-table .ant-table-row"));
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
    const bars = cashFlowScroll?.querySelectorAll(".recharts-bar");
    const barBounds = (bar) => Array.from(bar?.querySelectorAll(".recharts-bar-rectangle path") ?? [], (path) => path.getBoundingClientRect());
    const cashFlow = cashFlowScroll ? {
      labels: cashFlowValues.length,
      months: monthBounds.length,
      labelsAlignWithMonths: monthBounds.every((bounds, index) => {
        const label = labelBoxes[index * 3];
        return label && Math.abs(label.left + label.width / 2 - bounds.left - bounds.width / 2) <= 1;
      }),
      overlappingLabels: overlaps,
      clippedLabels: chartBounds ? labelBoxes.some((label) =>
        label.left < chartBounds.left || label.right > chartBounds.right || label.top < chartBounds.top ||
        label.bottom > Math.min(chartBounds.bottom, monthButtons.top)) : true,
      axisClips: chartBounds ? axisTicks.some((tick) => tick.getBoundingClientRect().left < chartBounds.left) : true,
      uniqueTicks: new Set(axisTicks.map((tick) => tick.textContent)).size === axisTicks.length,
      signedBars: baseline !== undefined && barBounds(bars[0]).length > 0 && barBounds(bars[1]).length > 0 &&
        barBounds(bars[0]).every((bar) => bar.bottom <= baseline + 1) && barBounds(bars[1]).every((bar) => bar.top >= baseline - 1),
      linearPath: /^M[^CQS]+$/.test(netPath ?? "") && (netPath?.match(/L/g)?.length === 11),
      scrolls: cashFlowScroll.scrollWidth > cashFlowScroll.clientWidth,
      summaryHeight: document.querySelector(".cash-flow-summary").getBoundingClientRect().height,
      localizedMonths: cashFlowScroll.querySelector(".cash-flow-chart__months button").textContent,
      titles: document.querySelectorAll(".cash-flow-report h2").length,
      controlsFit: document.querySelector(".cash-flow-actions").getBoundingClientRect().right <= window.innerWidth,
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
      reportPanelCount: reportPanels.length,
      statCardCount: statCards.length,
      tableRowCount: tableRows.length,
      chartSurfaceCount: chartSurfaces.length,
      accessibleSummaryCount: accessibleSummaries.length,
      visibleBottomSummaryCount: accessibleSummaries.filter((summary) => summary.getBoundingClientRect().height > 1).length,
      cashFlow,
      reportCardHeights: reportCards.map((card) => card.getBoundingClientRect().height),
      statLabelSizes: statCards.map((card) => getComputedStyle(card.querySelector(':scope > span')).fontSize),
      statValueSizes: statCards.map((card) => getComputedStyle(card.querySelector('strong [aria-hidden="true"]') ?? card.querySelector('strong')).fontSize),
      statValueMargins: statCards.map((card) => {
        const value = card.querySelector('strong [aria-hidden="true"]');
        return value ? getComputedStyle(value).marginBottom : '0px';
      }),
      overflowingStatValues: statCards.filter((card) => {
        const cardRect = card.getBoundingClientRect();
        return Array.from(card.querySelectorAll('strong span')).some((value) => {
          const rect = value.getBoundingClientRect();
          return rect.left < cardRect.left || rect.right > cardRect.right;
        });
      }).length,
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
    interaction: state.interaction ?? null,
    ...metrics,
  };
}

function runState(args) {
  const { state } = args;
  return runBrowserState({
    ...args,
    state: state.routePath.startsWith("/reports/history") && state.viewport.width >= 1024
      ? { ...state, screenshotMode: "viewport" }
      : state,
    routePath: state.routePath,
    initScript: fixedDateInitScript(args.fixture.reportsVisualFixtureMeta.fixedNow, state.language ?? "en"),
    waitForReady: waitForReportsReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const failures = [];
  for (const state of stateResults) {
    if (state.scenario === "russian" && !state.russianLabelsVisible) failures.push(`${state.name}: Russian labels did not load`);
    if (state.visibleBottomSummaryCount > 0) failures.push(`${state.name}: duplicate bottom summary is visible`);
    if (state.overflowingStatValues > 0) failures.push(`${state.name}: summary values overflow their cards`);
    if (state.statLabelSizes.some((size) => size !== "11px")) failures.push(`${state.name}: summary label size differs from Transactions`);
    if (state.statValueSizes.some((size) => size !== "30px")) failures.push(`${state.name}: summary value size differs from Transactions`);
    if (state.statValueMargins.some((margin) => margin !== "0px")) failures.push(`${state.name}: label spacing leaks into summary values`);
    if (state.reportCardHeights.some((height) => height >= 190)) failures.push(`${state.name}: report list card is not compact`);
    if (state.routePath.startsWith("/reports/history")) {
      const chart = state.cashFlow;
      if (!chart || chart.labels !== 36 || chart.months !== 12) failures.push(`${state.name}: monthly chart values are missing`);
      if (!chart) continue;
      if (!chart.labelsAlignWithMonths) failures.push(`${state.name}: chart labels do not align with their months`);
      if (chart.overlappingLabels.length || chart.clippedLabels || chart.axisClips) failures.push(`${state.name}: chart or axis labels overlap or are clipped (${JSON.stringify(chart.overlappingLabels)})`);
      if (!chart.signedBars) failures.push(`${state.name}: bars do not extend in the correct direction from zero`);
      if (!chart.linearPath) failures.push(`${state.name}: net cash flow path does not contain 11 straight segments`);
      if (!chart.uniqueTicks) failures.push(`${state.name}: y-axis tick labels repeat`);
      if (state.viewport.width >= 1024 && chart.scrolls) failures.push(`${state.name}: desktop chart requires horizontal scrolling`);
      if (state.viewport.width < 500 && !chart.scrolls) failures.push(`${state.name}: mobile chart does not scroll`);
      if (chart.summaryHeight > 140 || chart.titles > 0 || !chart.controlsFit) failures.push(`${state.name}: summary or report chrome exceeds its layout`);
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
