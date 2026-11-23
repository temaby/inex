import path from "node:path";

import {
  buildCommonChecks,
  clickButtonByTextExpression,
  createApiFixtureHandler,
  evaluate,
  fixedDateInitScript,
  formDrawerLayoutExpression,
  jsonResponse,
  loadFixture,
  playwrightInstalled,
  problemResponse,
  resolveVisualQaPaths,
  runBrowserState,
  runVisualQaScript,
  verifyAdaptiveDrawerDisclosure,
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
const categoryInformationSelector = '[data-qa="category-drawer-information"]';

const states = [
  {
    name: "linked-readonly-1440",
    screenshot: "linked-readonly-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "linked",
    interaction: "select-linked-account",
  },
  {
    name: "linked-readonly-1024",
    screenshot: "linked-readonly-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "linked",
    interaction: "select-linked-account",
  },
  {
    name: "linked-readonly-390",
    screenshot: "linked-readonly-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "linked",
    interaction: "select-linked-account",
  },
  {
    name: "linked-readonly-360",
    screenshot: "linked-readonly-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "linked",
    interaction: "select-linked-account",
  },
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
    name: "populated-all-ru-360",
    screenshot: "populated-all-ru-360.png",
    viewport: { width: 360, height: 800 },
    scenario: "populated-ru",
    interaction: "show-all",
    locale: "ru",
  },
  {
    name: "collapsed-branch-1440",
    screenshot: "collapsed-branch-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "collapse-first-branch",
  },
  {
    name: "collapsed-branch-390",
    screenshot: "collapsed-branch-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "collapse-first-branch",
  },
  {
    name: "collapsed-branch-360",
    screenshot: "collapsed-branch-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "collapse-first-branch",
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
    name: "drawer-open-1440",
    screenshot: "drawer-open-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "open-add-drawer",
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
    name: "edit-drawer-1440",
    screenshot: "edit-drawer-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "open-edit-drawer",
  },
  {
    name: "edit-drawer-spend-1024",
    screenshot: "edit-drawer-spend-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-edit-from-spend",
  },
  {
    name: "edit-drawer-390",
    screenshot: "edit-drawer-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-edit-drawer",
  },
  {
    name: "edit-drawer-information-ru-360",
    screenshot: "edit-drawer-information-ru-360.png",
    viewport: { width: 360, height: 800 },
    scenario: "populated-ru",
    interaction: "open-edit-information",
    locale: "ru",
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
        return jsonResponse(scenario === "populated-ru" ? { ...authUser, languageCode: "ru" } : authUser);
      }
      if (url.pathname === "/api/auth/link-state" && method === "GET" && scenario === "linked") {
        return jsonResponse({
          state: "master",
          masterAccount: null,
          linkedAccounts: [{
            id: 2,
            username: "Linked QA",
            email: "linked@example.test",
            baseCurrency: "PLN",
          }],
        });
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
        const categories = fixture.categoriesVisualFixtureCategories;
        return jsonResponse({
          data: scenario === "empty" ? [] : categories.map((category) => {
            if (scenario !== "populated-ru") return category;
            if (category.key === "archived") return { ...category, name: "Архивные покупки и расходы на содержание дома" };
            if (category.key === "home") return { ...category, name: "Жильё, коммунальные услуги и содержание дома" };
            return category;
          }),
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
    case "select-linked-account":
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
      await waitFor(client, "document.body.innerText.includes(\"Linked QA's financial workspace\")");
      return;
    case "select-spend-view":
      await evaluate(client, clickButtonByTextExpression("By spend"));
      await waitFor(client, `(() => {
        const firstRow = document.querySelector(".category-row");
        return firstRow && firstRow.textContent && firstRow.textContent.includes("Rent");
      })()`);
      return;
    case "show-all":
      await evaluate(client, clickButtonByTextExpression("Все"));
      await waitFor(client, "Boolean(document.querySelector('.category-row.is-disabled'))");
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
    case "open-edit-from-spend":
      await evaluate(client, clickButtonByTextExpression("By spend"));
      await waitFor(client, "document.querySelector('button.category-row__edit')?.textContent.includes('Rent')");
      await openEditDrawer(client, "Rent");
      return;
    case "open-edit-drawer":
      await openEditDrawer(client, "Groceries");
      return;
    case "open-edit-information":
      await openEditDrawer(client, "Groceries");
      await verifyAdaptiveDrawerDisclosure(client, state.viewport, categoryInformationSelector);
      await evaluate(client, `(() => {
        const summary = document.querySelector(${JSON.stringify(`${categoryInformationSelector} > summary`)});
        summary.click();
        const drawerBody = summary.closest('.ant-drawer-body');
        drawerBody.scrollTop = drawerBody.scrollHeight;
      })()`);
      await waitFor(client, `Boolean(document.querySelector(${JSON.stringify(`${categoryInformationSelector}[open]`)}))`);
      return;
    case "collapse-first-branch":
      await evaluate(client, `(() => {
        const toggle = document.querySelector(".category-row__branch-toggle[aria-expanded='true']");
        if (!toggle) return false;
        toggle.click();
        return true;
      })()`);
      await waitFor(client, "document.querySelector(\".category-row__branch-toggle[aria-expanded='false']\") !== null && !document.body.innerText.includes('Groceries')");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function openEditDrawer(client, name) {
  await evaluate(client, `(() => {
    const rows = Array.from(document.querySelectorAll('.category-row'));
    const row = rows.find((item) => item.querySelector('.category-row__title strong')?.textContent === ${JSON.stringify(name)});
    window.categoryRowsBeforeEdit = rows.map((item) => item.getBoundingClientRect().height);
    row.querySelector('button.category-row__edit').click();
  })()`);
  await waitFor(client, `document.querySelector('.ant-drawer-open #category-editor_name')?.value === ${JSON.stringify(name)}`);
}

async function waitForCategoriesReady(client, state) {
  const title = state.locale === "ru" ? "Категории" : "Categories";
  await waitFor(client, `document.body?.innerText.includes(${JSON.stringify(title)})`);

  if (state.scenario === "categories-error") {
    await waitFor(client, "document.body.innerText.includes('Failed to load categories')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('Create your first category')");
  } else {
    const period = state.locale === "ru" ? "апрель 2026" : "April 2026";
    await waitFor(client, `document.querySelector('[data-qa="hero-primary-label"]')?.textContent.includes(${JSON.stringify(period)}) &&
      document.body.innerText.includes('Groceries') && Boolean(document.querySelector('.category-row__operations time'))`);
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
    const drawerBody = drawer?.querySelector('.ant-drawer-body');
    const drawerFooter = drawer?.querySelector('.ant-drawer-footer');
    const drawerFooterRect = drawerFooter?.getBoundingClientRect();
    const drawerLayout = ${formDrawerLayoutExpression};
    const information = drawer?.querySelector(${JSON.stringify(categoryInformationSelector)});
    const rows = Array.from(document.querySelectorAll(".category-row"));
    const columnHeaders = Array.from(document.querySelectorAll(".categories-list .inex-list-panel__columns span"));
    const firstRowCells = rows[0]
      ? Array.from(rows[0].querySelectorAll(":scope > .category-row__edit > span:not([hidden])"))
      : [];
    const branchToggles = Array.from(document.querySelectorAll(".category-row__branch-toggle"));
    const expandedRows = branchToggles.filter((toggle) => toggle.getAttribute("aria-expanded") === "true");
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
    const incomeRow = rows.find((row) => row.querySelector('.category-row__title strong')?.textContent === 'Income');
    const otherRootRow = rows.find((row) => row !== incomeRow && !row.classList.contains('category-row--child'));
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
      drawerBodyOverflow: Boolean(drawerBody && drawerBody.scrollWidth > drawerBody.clientWidth),
      drawerFooterVisible: Boolean(drawerFooterRect && drawerRect && drawerFooterRect.top >= 0
        && drawerRect.bottom <= window.innerHeight + 1),
      drawerFooterFollowsContent: drawerLayout?.positioned ?? false,
      drawerSaveDisabled: Boolean(drawerFooter?.querySelector('button[type="submit"][disabled]')),
      drawerHasDelete: Boolean(drawerFooter?.querySelector('.ant-btn-dangerous')),
      drawerHasSwitch: Boolean(drawerBody?.querySelector('button[role="switch"]')),
      drawerParentReadOnly: Boolean(drawerBody?.querySelector('#category-parent-readonly[readonly]')),
      drawerInformation: information ? (information.open ? 'expanded' : 'collapsed') : null,
      drawerPreservesRowHeights: window.categoryRowsBeforeEdit
        ? JSON.stringify(window.categoryRowsBeforeEdit) === JSON.stringify(rows.map((row) => row.getBoundingClientRect().height))
        : null,
      rowHasBudgetBadge: rows.some((row) => row.querySelector('.category-row__chip--budget')),
      rowHasSpendSubtitle: rows.some((row) => row.querySelector('.category-row__spent small')),
      drawerHasGroceriesBudget: Boolean(information?.textContent.includes('Groceries cap')),
      incomeRowMatchesRootBackground: incomeRow && colorOf(incomeRow) === colorOf(otherRootRow),
      incomeRowMarkerColor: colorOf(incomeRow?.querySelector('.category-row__swatch')),
      operationsHeader: columnHeaders[2]?.textContent,
      visibleOperationDates: rows.flatMap((row) => {
        const date = row.querySelector('.category-row__operations time');
        return date?.getClientRects().length ? [date.textContent] : [];
      }),
      operationTextDoesNotFit: rows.some((row) => {
        const operations = row.querySelector('.category-row__operations');
        const count = operations.querySelector('strong:not(.category-row__placeholder)');
        if (!count) return false;
        const column = operations.getBoundingClientRect();
        return [count, operations.querySelector('time')].some((element) => {
          if (!element) return true;
          const text = document.createRange();
          text.selectNodeContents(element);
          const [bounds, extraLine] = text.getClientRects();
          return !bounds || Boolean(extraLine) || bounds.left < column.left - 1 || bounds.right > column.right + 1;
        });
      }),
      smallestRowHeight: rows.length ? Math.min(...rows.map((row) => row.querySelector('.category-row__edit').getBoundingClientRect().height)) : null,
      rowCount: rows.length,
      expandedRowCount: expandedRows.length,
      branchToggleCount: branchToggles.length,
      collapsedBranchCount: branchToggles.filter((toggle) => toggle.getAttribute("aria-expanded") === "false").length,
      heroSummaryWidth: heroSummaryRect ? heroSummaryRect.width : null,
      heroDividerOffset: heroContentLeft !== null && heroSummaryRect ? heroSummaryRect.right - heroContentLeft : null,
      distributionEyebrow: styleSample(distributionEyebrow),
      toolbarSearchWidth: searchRect ? searchRect.width : null,
      toolbarSearchRightOffset: toolbarContentRight !== null && searchRect ? toolbarContentRight - searchRect.right : null,
      distributionSegmentCount: distributionSegments.length,
      distributionLegendItemCount: legendItems.length,
      distributionSegmentColors: distributionSegments.map(colorOf),
      distributionLegendMarkerColors: legendMarkers.map(colorOf),
      distributionLegendLabels: legendItems.map((item) => item.querySelector(".categories-hero__legend-label")?.textContent.trim()),
      distributionLegendAmounts: legendItems.map((item) => item.querySelector(".categories-hero__legend-amount")?.textContent.replace(/\\s+/g, " ").trim()),
      distributionLegendShares: legendItems.map((item) => item.querySelector(".categories-hero__legend-share")?.textContent.trim()),
      distributionSegmentLabels: distributionSegments.map((segment) => segment.getAttribute("aria-label")),
      heroHasInternalOverflow: Array.from(hero?.querySelectorAll(
        ".categories-hero__amount, .categories-hero__note, .categories-hero__legend-item",
      ) ?? []).some((element) => element.scrollWidth > element.clientWidth + 1),
      heroPrimaryValueText: heroPrimaryValue ? heroPrimaryValue.textContent.trim().replace(/\\s+/g, " ") : "",
      heroSecondaryText: heroSecondaryText ? heroSecondaryText.textContent.trim().replace(/\\s+/g, " ") : "",
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
      linkedSelectorVisible: Boolean(document.querySelector('[aria-label="Financial workspace"]')),
      readOnlyNoticeVisible: document.body.innerText.includes("read-only mode"),
      addCategoryVisible: document.body.innerText.includes("Add category"),
      editControlCount: document.querySelectorAll("button.category-row__edit").length,
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
    locale: state.locale ?? "en",
    interaction: state.interaction ?? null,
    ...metrics,
  };
}

function runState(args) {
  return runBrowserState({
    ...args,
    state: {
      ...args.state,
      screenshotMode: args.state.interaction?.startsWith("open-") ? "viewport" : undefined,
    },
    routePath: "/categories",
    initScript: `${fixedDateInitScript(args.fixture.categoriesVisualFixtureMeta.fixedNow, args.state.locale ?? "en")}
      localStorage.removeItem("inex.tree-expansion.categories.user-1");
      localStorage.removeItem("inex.tree-expansion.categories.user-2");`,
    waitForReady: waitForCategoriesReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const failures = [];

  for (const state of stateResults) {
    if (state.scenario === "linked" && !state.linkedSelectorVisible) {
      failures.push(`${state.name}: linked-account selector is not visible`);
    }
    if (state.scenario === "linked" && !state.readOnlyNoticeVisible) {
      failures.push(`${state.name}: linked read-only notice is not visible`);
    }
    if (state.scenario === "linked" && state.addCategoryVisible) {
      failures.push(`${state.name}: Add category mutation control is visible in linked mode`);
    }
    if (state.scenario === "linked" && state.editControlCount > 0) {
      failures.push(`${state.name}: category edit controls are visible in linked mode`);
    }
    const populatedState = state.scenario.startsWith("populated");
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
    if (!state.distributionLegendLabels.includes(state.locale === "ru" ? "Другое" : "Other")) {
      failures.push(`${state.name}: Categories distribution fixture did not render Other segment`);
    }
    if (state.usdEquivalentVisibleInHeroDistribution) {
      failures.push(`${state.name}: Categories hero distribution still shows visible USD equivalent label`);
    }
    const formatAmount = (value) => `${new Intl.NumberFormat(state.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace(/\s+/g, " ")} USD`;
    const distributionAmounts = [1450, 186.5, 90, 80, 130];
    const total = 1936.5;
    const shareFormatter = new Intl.NumberFormat(state.locale, { style: "percent", maximumFractionDigits: 1 });
    if (state.heroPrimaryValueText !== formatAmount(total) ||
        !state.heroSecondaryText.includes(formatAmount(1450)) ||
        !state.heroSecondaryText.includes(shareFormatter.format(1450 / total).replace(/\s+/g, " "))) {
      failures.push(`${state.name}: Categories hero total or largest expense has incorrect locale formatting`);
    }
    if (state.distributionLegendItemCount !== distributionAmounts.length || distributionAmounts.some((value, index) =>
      state.distributionLegendAmounts[index] !== formatAmount(value) ||
      state.distributionLegendShares[index] !== shareFormatter.format(value / total) ||
      state.distributionSegmentLabels[index] !== `${state.distributionLegendLabels[index]} ${state.distributionLegendShares[index]}`
    )) {
      failures.push(`${state.name}: Categories legend amounts or chart percentages have incorrect locale formatting`);
    }
    if (state.heroHasInternalOverflow) {
      failures.push(`${state.name}: Categories hero contents exceed their section or legend item`);
    }
    if (state.heroComparisonVisible) {
      failures.push(`${state.name}: Categories hero still shows visible Change from period copy`);
    }
    if (state.interaction === "collapse-first-branch" && state.collapsedBranchCount !== 1) {
      failures.push(`${state.name}: Categories collapsed branch state was not rendered`);
    }
    if (state.interaction === "collapse-first-branch" && state.drawerOpen) {
      failures.push(`${state.name}: using the branch control unexpectedly opened the editor`);
    }
    if (state.toolbarLabels.length !== 1) {
      failures.push(`${state.name}: Categories should display only the status label`);
    }
    if (state.rowHasBudgetBadge || state.rowHasSpendSubtitle) {
      failures.push(`${state.name}: a row still shows a budget badge or a spend period subtitle`);
    }
    if (state.rowCount > 0) {
      const operationsHeader = state.locale === "ru" ? "Операции" : "Transactions";
      if (state.operationsHeader !== operationsHeader || state.visibleOperationDates.length === 0 || state.operationTextDoesNotFit ||
          state.smallestRowHeight < 44) {
        failures.push(`${state.name}: the operations label, visible dates, or row targets did not match`);
      }
      const incomeVisible = [null, "show-all", "collapse-first-branch"].includes(state.interaction);
      if (incomeVisible && (!state.incomeRowMatchesRootBackground || state.incomeRowMarkerColor !== "rgb(147, 51, 234)")) {
        failures.push(`${state.name}: Income does not use the standard root background and its original fixture marker color`);
      }
    }
    if (state.interaction === "open-edit-information" && !state.drawerHasGroceriesBudget) {
      failures.push(`${state.name}: the drawer no longer shows the Groceries budget`);
    }
    const editing = state.interaction?.startsWith("open-edit-");
    if (editing || state.interaction === "open-add-drawer") {
      const expectedWidth = state.viewport.width <= 768 ? state.viewport.width : 460;
      if (state.drawerBounds?.width !== expectedWidth || !state.drawerWithinViewport ||
          state.drawerBodyOverflow || !state.drawerFooterVisible || !state.drawerHasSwitch) {
        failures.push(`${state.name}: drawer width, viewport, switch, or footer check failed`);
      }
      if (!state.drawerFooterFollowsContent) {
        failures.push(`${state.name}: footer spacing, separator, or position does not match form overflow`);
      }
      const info = state.interaction === "open-edit-information" ? "expanded" : "collapsed";
      if (editing && (!state.drawerHasDelete || !state.drawerSaveDisabled || !state.drawerParentReadOnly ||
          !state.drawerPreservesRowHeights || state.drawerInformation !== info)) {
        failures.push(`${state.name}: edit drawer fields, tree geometry, or information state did not match`);
      }
      if (!editing && (state.drawerHasDelete || state.drawerInformation !== null)) {
        failures.push(`${state.name}: create drawer displayed edit-only controls`);
      }
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
      "hero total, largest expense, and legend amounts use localized currency precision",
      "legend percentages and chart labels use the same localized shares without overflowing",
      "visible Change from period copy is absent from the Categories hero summary",
      "visible USD equivalent label is absent from Categories hero distribution",
      "only Status uses the visible uppercase small-label treatment",
      "category create and edit drawers match the shared width and keep their footers accessible",
      "drawer actions follow the form or stay at the bottom when the form scrolls",
      "opening the editor preserves row heights and the chevron only toggles its branch",
      "desktop hero summary column and divider are 320px from the hero card edge",
      "desktop search control is 260px wide and right-aligned in the toolbar",
      "desktop category table headers align with rendered row columns",
      "rows omit budget badges and period subtitles while the drawer retains the budget",
      "operation counts stay on one line and last-operation dates remain visible on mobile",
      "the income root uses the standard root background and retains its category marker",
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
