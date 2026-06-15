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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/categories");
const fixturePath = path.join(clientRoot, "src/test/fixtures/categoriesVisualFixture.ts");

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const defaultViewportHeight = 900;

const states = [
  {
    name: "populated-1440",
    screenshot: "populated-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
  },
  {
    name: "populated-spend-1024",
    screenshot: "populated-spend-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "select-spend-view",
  },
  {
    name: "populated-390",
    screenshot: "populated-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
  },
  {
    name: "populated-360",
    screenshot: "populated-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
  },
  {
    name: "filter-empty-390",
    screenshot: "filter-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "search-no-match",
  },
  {
    name: "first-use-empty-390",
    screenshot: "first-use-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "empty",
  },
  {
    name: "drawer-open-390",
    screenshot: "drawer-open-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-add-drawer",
  },
  {
    name: "drawer-open-360",
    screenshot: "drawer-open-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-add-drawer",
  },
  {
    name: "expanded-row-1440",
    screenshot: "expanded-row-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "expand-first-row",
  },
  {
    name: "expanded-row-390",
    screenshot: "expanded-row-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "expand-first-row",
  },
  {
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "categories-error",
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
        return jsonResponse(authUser);
      }
      if (url.pathname === "/api/currencies" && method === "GET") {
        return jsonResponse(fixture.categoriesVisualFixtureCurrencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.categoriesVisualFixtureRates });
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        if (scenario === "categories-error") {
          return problemResponse("Categories fixture failure", "Controlled Categories load failure.", 500);
        }
        return jsonResponse({
          data: scenario === "empty" ? [] : fixture.categoriesVisualFixtureCategories,
        });
      }
      if (url.pathname === "/api/budgets" && method === "GET") {
        return jsonResponse({
          data: scenario === "empty" ? [] : fixture.categoriesVisualFixtureBudgets,
        });
      }
      if (url.pathname === "/api/transactions" && method === "GET") {
        const data = scenario === "empty" ? [] : fixture.categoriesVisualFixtureTransactions;
        return jsonResponse({
          data,
          metadata: { totalItems: data.length },
        });
      }
      return null;
    },
  });
}

async function applyInteraction(client, state) {
  switch (state.interaction) {
    case "select-spend-view":
      await evaluate(client, clickButtonByTextExpression("By spend"));
      await waitFor(client, `(() => {
        const firstRow = document.querySelector(".category-row");
        return firstRow && firstRow.textContent && firstRow.textContent.includes("Rent");
      })()`);
      return;
    case "search-no-match":
      await evaluate(client, `(() => {
        const input = document.querySelector("input[type='search'][aria-label='Search categories']");
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "zzzz-no-match");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('No categories match these filters')");
      return;
    case "open-add-drawer":
      await evaluate(client, clickButtonByTextExpression("Add category"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Add Category')");
      return;
    case "expand-first-row":
      await evaluate(client, `(() => {
        const row = document.querySelector(".category-row:not(.category-row--parent)");
        if (!row) return false;
        row.click();
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('Edit category')");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function waitForCategoriesReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Categories')");

  if (state.scenario === "categories-error") {
    await waitFor(client, "document.body.innerText.includes('Failed to load categories')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('Create your first category')");
  } else {
    await waitFor(client, "document.body.innerText.includes('Groceries') && document.body.innerText.includes('April 2026')");
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
    const content = document.querySelector(".categories-workspace, .categories-list, .r-categories-hero");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const rows = Array.from(document.querySelectorAll(".category-row"));
    const columnHeaders = Array.from(document.querySelectorAll(".categories-list .inex-list-panel__columns span"));
    const firstRowCells = rows[0]
      ? Array.from(rows[0].children).filter((child) => child instanceof HTMLElement)
      : [];
    const expandedRows = rows.filter((row) => row.getAttribute("aria-expanded") === "true");
    const inlineEdit = document.querySelector(".category-inline-edit");
    const hero = document.querySelector('[data-qa="hero-card"]');
    const heroSummary = document.querySelector(".categories-hero__summary");
    const heroPrimaryValue = document.querySelector('[data-qa="hero-primary-value"] [role="text"] > span') ?? document.querySelector('[data-qa="hero-primary-value"]');
    const heroSecondaryText = document.querySelector('[data-qa="hero-secondary-text"]');
    const distributionSegments = Array.from(document.querySelectorAll(".categories-hero__distribution-segment"));
    const legendItems = Array.from(document.querySelectorAll(".categories-hero__legend-item"));
    const legendMarkers = legendItems.map((item) => item.querySelector(".categories-hero__legend-swatch"));
    const distribution = document.querySelector(".categories-hero__distribution");
    const distributionEyebrow = document.querySelector('[data-qa="hero-distribution-eyebrow"]');
    const search = document.querySelector("input[type='search'][aria-label='Search categories']")?.parentElement;
    const toolbarFilters = document.querySelector(".categories-list .inex-list-panel__filters");
    const toolbarLabels = Array.from(document.querySelectorAll(".categories-list [role='group'] > span[id]")).map((label) => {
      const style = window.getComputedStyle(label);
      return {
        text: label.textContent.trim().replace(/\\s+/g, " "),
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
      };
    });
    const styleSample = (element) => {
      if (!element) return null;
      const style = window.getComputedStyle(element);
      return {
        text: element.textContent.trim().replace(/\\s+/g, " "),
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
      };
    };
    const geometry = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    };
    const colorOf = (element) => element ? window.getComputedStyle(element).backgroundColor : null;
    const heroRect = geometry(hero);
    const heroSummaryRect = geometry(heroSummary);
    const heroStyle = hero ? window.getComputedStyle(hero) : null;
    const heroContentLeft = heroRect && heroStyle
      ? heroRect.left + Number.parseFloat(heroStyle.borderLeftWidth || "0")
      : null;
    const toolbarRect = geometry(toolbarFilters);
    const searchRect = geometry(search);
    const toolbarStyle = toolbarFilters ? window.getComputedStyle(toolbarFilters) : null;
    const toolbarContentRight = toolbarRect && toolbarStyle
      ? toolbarRect.right - Number.parseFloat(toolbarStyle.paddingRight || "0")
      : null;
    const columnAlignmentDeltas = columnHeaders.map((header, index) => {
      const rowCell = firstRowCells[index];
      const headerRect = header.getBoundingClientRect();
      const rowCellRect = rowCell ? rowCell.getBoundingClientRect() : null;
      return rowCellRect
        ? {
          header: header.textContent.trim().replace(/\\s+/g, " "),
          left: Math.round(headerRect.left - rowCellRect.left),
          right: Math.round(headerRect.right - rowCellRect.right),
          width: Math.round(headerRect.width - rowCellRect.width),
        }
        : null;
    });

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
      drawerOpen: Boolean(drawer),
      drawerWithinViewport: drawerRect ? drawerRect.left >= 0 && drawerRect.right <= window.innerWidth : null,
      drawerBounds: drawerRect ? { left: drawerRect.left, right: drawerRect.right, width: drawerRect.width } : null,
      rowCount: rows.length,
      expandedRowCount: expandedRows.length,
      inlineEditOpen: Boolean(inlineEdit),
      heroSummaryWidth: heroSummaryRect ? heroSummaryRect.width : null,
      heroDividerOffset: heroContentLeft !== null && heroSummaryRect ? heroSummaryRect.right - heroContentLeft : null,
      distributionEyebrow: styleSample(distributionEyebrow),
      toolbarSearchWidth: searchRect ? searchRect.width : null,
      toolbarSearchRightOffset: toolbarContentRight !== null && searchRect ? toolbarContentRight - searchRect.right : null,
      distributionSegmentCount: distributionSegments.length,
      distributionLegendItemCount: legendItems.length,
      distributionSegmentColors: distributionSegments.map(colorOf),
      distributionLegendMarkerColors: legendMarkers.map(colorOf),
      distributionLegendLabels: legendItems.map((item) => {
        const label = item.querySelector(".categories-hero__legend-copy strong");
        return label ? label.textContent.trim() : "";
      }),
      heroPrimaryValueText: heroPrimaryValue ? heroPrimaryValue.textContent.trim().replace(/\\s+/g, " ") : "",
      heroPrimaryValueHasDecimal: heroPrimaryValue ? /\\d[\\d,]*\\.\\d/.test(heroPrimaryValue.textContent) : null,
      heroSecondaryText: heroSecondaryText ? heroSecondaryText.textContent.trim().replace(/\\s+/g, " ") : "",
      heroSecondaryTextHasDecimal: heroSecondaryText ? /\\d[\\d,]*\\.\\d/.test(heroSecondaryText.textContent) : null,
      heroComparisonVisible: heroSecondaryText ? /\\bChange from\\b/.test(heroSecondaryText.textContent) : false,
      toolbarLabels,
      columnAlignmentDeltas,
      distributionText: distribution ? distribution.innerText.replace(/\\s+/g, " ").trim() : "",
      usdEquivalentVisibleInHeroDistribution: distribution ? distribution.innerText.includes("USD equivalent") : false,
      maxRowHeight: rows.length ? Math.max(...rows.map((row) => row.getBoundingClientRect().height)) : null,
      addDrawerOpen: document.body.innerText.includes("Add Category"),
      loadErrorVisible: document.body.innerText.includes("Failed to load categories"),
      filterEmptyVisible: document.body.innerText.includes("No categories match these filters"),
      firstUseEmptyVisible: document.body.innerText.includes("Create your first category"),
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
    interaction: state.interaction ?? null,
    ...metrics,
  };
}

function runState(args) {
  return runBrowserState({
    ...args,
    routePath: "/categories",
    initScript: fixedDateInitScript(args.fixture.categoriesVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForCategoriesReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const failures = [];

  for (const state of stateResults) {
    const populatedState = state.scenario === "populated";
    if (!populatedState) continue;

    if (state.distributionSegmentCount !== state.distributionLegendItemCount) {
      failures.push(`${state.name}: Categories distribution segment count ${state.distributionSegmentCount} does not match legend item count ${state.distributionLegendItemCount}`);
    }
    if (new Set(state.distributionSegmentColors).size !== state.distributionSegmentColors.length) {
      failures.push(`${state.name}: Categories displayed legend colors are not unique`);
    }
    if (state.distributionSegmentColors.some((color, index) => color !== state.distributionLegendMarkerColors[index])) {
      failures.push(`${state.name}: Categories legend marker colors do not match bar segment colors`);
    }
    if (!state.distributionLegendLabels.includes("Other")) {
      failures.push(`${state.name}: Categories distribution fixture did not render Other segment`);
    }
    if (state.usdEquivalentVisibleInHeroDistribution) {
      failures.push(`${state.name}: Categories hero distribution still shows visible USD equivalent label`);
    }
    if (state.heroPrimaryValueHasDecimal) {
      failures.push(`${state.name}: Categories primary hero value still shows decimal digits: ${state.heroPrimaryValueText}`);
    }
    if (state.heroSecondaryTextHasDecimal) {
      failures.push(`${state.name}: Categories secondary hero value still shows decimal digits: ${state.heroSecondaryText}`);
    }
    if (state.heroComparisonVisible) {
      failures.push(`${state.name}: Categories hero still shows visible Change from period copy`);
    }
    for (const label of state.toolbarLabels) {
      const normalLetterSpacing = label.letterSpacing === "0px" || label.letterSpacing === "normal";
      if (label.fontSize !== "11px" ||
        label.fontWeight !== "700" ||
        !normalLetterSpacing ||
        label.textTransform !== "uppercase") {
        failures.push(`${state.name}: Categories ${label.text} label does not match Accounts toolbar label typography`);
      }
    }
    if (state.viewport.width >= 1024 && state.heroSummaryWidth !== 320) {
      failures.push(`${state.name}: Categories hero summary column width ${state.heroSummaryWidth} does not match 320px`);
    }
    if (state.viewport.width >= 1024 && state.heroDividerOffset !== 320) {
      failures.push(`${state.name}: Categories hero divider offset ${state.heroDividerOffset} does not match 320px`);
    }
    if (state.viewport.width >= 1024 && state.toolbarSearchWidth !== 260) {
      failures.push(`${state.name}: Categories search width ${state.toolbarSearchWidth} does not match 260px`);
    }
    if (state.viewport.width >= 1024 && !nearZero(state.toolbarSearchRightOffset)) {
      failures.push(`${state.name}: Categories search right offset ${state.toolbarSearchRightOffset} is not aligned to the toolbar edge`);
    }
    if (state.viewport.width >= 1024) {
      const misalignedColumn = state.columnAlignmentDeltas
        .filter(Boolean)
        .find((delta) => !nearZero(delta.left, 1) || !nearZero(delta.right, 1) || !nearZero(delta.width, 1));
      if (misalignedColumn) {
        failures.push(`${state.name}: Categories ${misalignedColumn.header || "action"} column header is not aligned with row cells (${JSON.stringify(misalignedColumn)})`);
      }
    }
  }

  return failures;
}

function nearZero(value, tolerance = 2) {
  return typeof value === "number" && Math.abs(value) <= tolerance;
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "categories",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.categoriesVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/categoriesVisualFixture.ts",
      baseline: fixture.categoriesVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.categoriesVisualFixtureMeta.expectedBaseCurrency,
      expectedCategoryCount: fixture.categoriesVisualFixtureMeta.expectedCategoryCount,
      expectedTransactionCount: fixture.categoriesVisualFixtureMeta.expectedTransactionCount,
      rowInteraction: fixture.categoriesVisualFixtureMeta.rowInteraction,
    },
    assertions: [
      "displayed category legend colors are unique",
      "legend marker colors match corresponding bar segment colors",
      "Other segment is rendered from the fixture distribution",
      "primary hero value is rounded with no visible decimal digits",
      "secondary hero top-category amount is rounded with no visible decimal digits",
      "visible Change from period copy is absent from the Categories hero summary",
      "visible USD equivalent label is absent from Categories hero distribution",
      "Status and View labels use the shared uppercase small-label treatment",
      "desktop hero summary column and divider are 320px from the hero card edge",
      "desktop search control is 260px wide and right-aligned in the toolbar",
      "desktop category table headers align with rendered row columns",
    ],
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Categories fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5200,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Categories",
  userDataPrefix: "inex-categories-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
