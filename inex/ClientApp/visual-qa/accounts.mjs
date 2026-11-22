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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/accounts");
const fixturePath = path.join(clientRoot, "src/test/fixtures/accountsVisualFixture.ts");

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const defaultViewportHeight = 900;
const drawerViewports = [
  { width: 1440, height: 1000 },
  { width: 1024, height: defaultViewportHeight },
  { width: 390, height: defaultViewportHeight },
  { width: 360, height: defaultViewportHeight },
];
const drawerLabels = {
  en: { add: "Add account", edit: "Edit account", create: "Create account", save: "Save", cancel: "Cancel", delete: "Delete" },
  ru: { add: "Добавить счёт", edit: "Редактировать счёт", create: "Создать счёт", save: "Сохранить", cancel: "Отмена", delete: "Удалить" },
};
const accountInformationSelector = '[data-qa="account-drawer-information"]';
const accountListStateExpression = `JSON.stringify({
  groups: Array.from(document.querySelectorAll(".accounts-group__toggle"), (button) => button.getAttribute("aria-expanded")),
  rows: Array.from(document.querySelectorAll(".accounts-row__name"), (name) => name.textContent),
})`;

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
    name: "populated-flat-1024",
    screenshot: "populated-flat-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "select-flat-view",
  },
  {
    name: "populated-1024",
    screenshot: "populated-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
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
  ...drawerViewports.flatMap((viewport) => [
    {
      name: `drawer-open-${viewport.width}`,
      screenshot: `drawer-open-${viewport.width}.png`,
      screenshotMode: "viewport",
      viewport,
      scenario: "populated",
      interaction: "open-drawer",
      drawerMode: "create",
    },
    {
      name: `edit-drawer-${viewport.width}`,
      screenshot: `edit-drawer-${viewport.width}.png`,
      screenshotMode: "viewport",
      viewport,
      scenario: "populated",
      interaction: "open-edit-drawer",
      drawerMode: "edit",
    },
  ]),
  {
    name: "edit-drawer-information-ru-360",
    screenshot: "edit-drawer-information-ru-360.png",
    screenshotMode: "viewport",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "drawer-info-ru",
    interaction: "open-edit-drawer-with-information",
    drawerMode: "edit",
    language: "ru",
    editAccountName: "PLN card",
  },
  {
    name: "collapsed-group-1440",
    screenshot: "collapsed-group-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "collapse-fixture-group",
  },
  {
    name: "collapsed-group-390",
    screenshot: "collapsed-group-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "collapse-fixture-group",
  },
  {
    name: "filtered-group-390",
    screenshot: "filtered-group-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "search-usd-operating",
  },
  {
    name: "disabled-zero-balance-390",
    screenshot: "disabled-zero-balance-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "select-all-scope",
  },
  {
    name: "incomplete-rate-360",
    screenshot: "incomplete-rate-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "incomplete-rate",
  },
  {
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "accounts-error",
  },
];

function withCurrencyNames(currencies) {
  return currencies.map((currency) => ({
    ...currency,
    name: currency.key,
  }));
}

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  const currencies = withCurrencyNames(fixture.accountsVisualFixtureCurrencies);

  return createApiFixtureHandler({
    requestLog,
    unhandledApiRequests,
    scenarioRef,
    handleRequest: ({ url, method, scenario }) => {
      if (url.pathname === "/api/auth/refresh" && method === "POST") {
        return jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
      }
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return jsonResponse(scenario === "drawer-info-ru" ? { ...authUser, languageCode: "ru" } : authUser);
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
        return jsonResponse(currencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({
          data: scenario === "incomplete-rate"
            ? fixture.accountsVisualFixtureRates.filter((rate) => rate.currencyTo !== "GEL")
            : fixture.accountsVisualFixtureRates,
        });
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        if (scenario === "accounts-error") {
          return problemResponse("Accounts fixture failure", "Controlled Accounts load failure.", 500);
        }
        return jsonResponse({
          data: scenario === "empty" ? [] : fixture.accountsVisualFixtureAccounts,
        });
      }
      if (url.pathname === "/api/accounts/details" && method === "GET") {
        const summaries = fixture.accountsVisualFixtureSummaries;
        return jsonResponse({
          data: scenario === "empty" ? [] : summaries.map((account) => (
            scenario === "drawer-info-ru" && account.name === "PLN card"
              ? { ...account, value: -9_999_999_999.99 }
              : account
          )),
        });
      }
      return null;
    },
  });
}

async function applyInteraction(client, state, fixture) {
  const labels = drawerLabels[state.language ?? "en"];
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
    case "select-flat-view":
      await evaluate(client, clickButtonByTextExpression("Flat list"));
      await waitFor(client, "document.body.innerText.includes('UZS main wallet')");
      return;
    case "search-no-match":
      await evaluate(client, `(() => {
        const input = document.querySelector("input[type='search'][aria-label='Search accounts']");
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "zzzz-no-match");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('No accounts match')");
      return;
    case "search-usd-operating":
      await evaluate(client, `(() => {
        const input = document.querySelector("input[type='search'][aria-label='Search accounts']");
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "USD operating");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('USD operating') && !document.body.innerText.includes('UZS main wallet')");
      return;
    case "open-drawer":
      await evaluate(client, clickButtonByTextExpression(labels.add));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open form'))");
      return;
    case "open-edit-drawer":
    case "open-edit-drawer-with-information": {
      const openInformation = state.interaction === "open-edit-drawer-with-information";
      await waitFor(client, `Boolean(document.querySelector('[data-qa="hero-distribution-bar"]'))`);
      if (openInformation) {
        await applyInteraction(client, { ...state, interaction: "collapse-fixture-group" }, fixture);
      }
      const listBeforeEdit = await evaluate(client, accountListStateExpression);
      const editLabelSelector = state.editAccountName
        ? `[aria-label="${labels.edit} ${state.editAccountName}"]`
        : `[aria-label^="${labels.edit} "]`;
      const editActionSelector = `button.accounts-row${editLabelSelector}, .accounts-row button${editLabelSelector}`;
      const findEditAction = `document.querySelector(${JSON.stringify(editActionSelector)})`;
      await waitFor(client, `Boolean(${findEditAction})`);
      await evaluate(client, `${findEditAction}.click()`);
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open form'))");
      const listAfterEdit = await evaluate(client, accountListStateExpression);
      if (listAfterEdit !== listBeforeEdit) {
        throw new Error(`${state.name}: account list changed from ${listBeforeEdit} to ${listAfterEdit}`);
      }
      if (openInformation) {
        await evaluate(client, `document.querySelector(${JSON.stringify(`${accountInformationSelector} > summary`)})?.click()`);
        await waitFor(client, `Boolean(document.querySelector(${JSON.stringify(`${accountInformationSelector}[open]`)}))`);
        await evaluate(client, `document.querySelector(${JSON.stringify(accountInformationSelector)})?.scrollIntoView({ block: "end" })`);
      }
      return;
    }
    case "select-all-scope":
      await evaluate(client, clickButtonByTextExpression("All"));
      await waitFor(client, "document.body.innerText.includes('USD closed card')");
      return;
    case "collapse-fixture-group":
      await evaluate(client, `(() => {
        const currency = ${JSON.stringify(fixture.accountsVisualFixtureMeta.collapsedStateCurrency)};
        const button = Array.from(document.querySelectorAll(".accounts-group__toggle"))
          .find((item) => item.parentElement?.textContent?.includes(currency));
        if (!button) return false;
        button.click();
        return true;
      })()`);
      await waitFor(client, `(() => {
        const currency = ${JSON.stringify(fixture.accountsVisualFixtureMeta.collapsedStateCurrency)};
        const button = Array.from(document.querySelectorAll(".accounts-group__toggle"))
          .find((item) => item.parentElement?.textContent?.includes(currency));
        return button && button.getAttribute("aria-expanded") === "false";
      })()`);
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function waitForAccountsReady(client, state) {
  if (state.scenario === "accounts-error") {
    await waitFor(client, "document.body.innerText.includes('Accounts could not be loaded')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No accounts yet')");
  } else {
    await waitFor(client, "document.body.innerText.includes('UZS main wallet')");
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
    const content = document.querySelector(".accounts-workspace, .accounts-first-empty, .accounts-card");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const drawerBody = drawer?.querySelector(".ant-drawer-body");
    const drawerFooter = drawer?.querySelector(".inex-drawer-actions");
    const drawerTitleLines = drawer?.querySelector(".ant-drawer-title > div")?.children;
    const drawerActions = Array.from(drawerFooter?.querySelectorAll("button") ?? []);
    const footerBounds = drawerFooter?.getBoundingClientRect();
    const [deleteBounds, cancelBounds, saveBounds] = drawerActions.map((button) => button.getBoundingClientRect());
    const centerY = (rect) => (rect.top + rect.bottom) / 2;
    const editActionsAligned = drawerActions.length === 3 && footerBounds
      && Math.abs(deleteBounds.left - footerBounds.left) <= 1
      && Math.abs(saveBounds.right - footerBounds.right) <= 1
      && deleteBounds.right < cancelBounds.left && cancelBounds.right < saveBounds.left
      && Math.abs(centerY(deleteBounds) - centerY(saveBounds)) <= 1
      && Math.abs(centerY(cancelBounds) - centerY(saveBounds)) <= 1;
    const accountInformation = drawer?.querySelector(${JSON.stringify(accountInformationSelector)});
    const snapshotAmountsFit = Array.from(accountInformation?.querySelectorAll(".accounts-snapshot__metric dd") ?? []).every((metric) => {
      const range = document.createRange();
      range.selectNodeContents(metric);
      const metricRect = metric.getBoundingClientRect();
      return Array.from(range.getClientRects()).every((rect) => rect.left >= metricRect.left - 1 && rect.right <= metricRect.right + 1);
    });
    const actionsWithinViewport = drawerActions.every((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth
        && rect.top >= 0 && rect.bottom <= window.innerHeight
        && button.scrollWidth <= button.clientWidth + 1;
    });
    const rows = Array.from(document.querySelectorAll(".accounts-row"));
    const groupButtons = Array.from(document.querySelectorAll(".accounts-group__toggle"));
    const groupShareBars = Array.from(document.querySelectorAll(".accounts-group__bar"));
    const hero = document.querySelector('[data-qa="hero-card"]');
    const heroSummary = document.querySelector(".accounts-hero__net");
    const heroPrimaryValue = document.querySelector('[data-qa="hero-primary-value"] [role="text"] > span') ?? document.querySelector('[data-qa="hero-primary-value"]');
    const heroSecondaryText = document.querySelector('[data-qa="hero-secondary-text"]');
    const heroDeltaMain = document.querySelector(".accounts-hero__delta-main");
    const heroDeltaPeriod = document.querySelector(".accounts-hero__delta-period");
    const distribution = document.querySelector(".accounts-distribution");
    const distributionEyebrow = document.querySelector('[data-qa="hero-distribution-eyebrow"]');
    const distributionSegments = Array.from(document.querySelectorAll(".accounts-distribution__segment"));
    const legendItems = Array.from(document.querySelectorAll(".accounts-distribution__item"));
    const legendMarkers = legendItems.map((item) => item.querySelector(".accounts-currency-dot"));
    const search = document.querySelector("input[type='search'][aria-label='Search accounts']")?.parentElement;
    const toolbarFilters = document.querySelector(".accounts-toolbar__filters");
    const colorOf = (element) => element ? window.getComputedStyle(element).backgroundColor : null;
    const geometry = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    };
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
    const collapsedGroups = groupButtons
      .filter((button) => button.getAttribute("aria-expanded") === "false")
      .map((button) => button.parentElement?.textContent?.trim().replace(/\\s+/g, " ").slice(0, 80) ?? "");

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
      drawerTitle: drawerTitleLines?.[0]?.textContent ?? null,
      drawerSubtitle: drawerTitleLines?.[1]?.textContent ?? null,
      drawerAccountName: drawer?.querySelector('#account-editor input[id$="_name"]')?.value ?? null,
      drawerHasClose: Boolean(drawer?.querySelector(".ant-drawer-close")),
      drawerActions: drawerActions.map((button) => button.innerText.trim()),
      editActionsAligned: Boolean(editActionsAligned),
      drawerActionsWithinViewport: actionsWithinViewport,
      drawerBodyOverflow: Boolean(drawerBody && drawerBody.scrollWidth > drawerBody.clientWidth),
      drawerSwitchCount: drawer?.querySelectorAll('[role="switch"]').length ?? 0,
      accountInformationPresent: Boolean(accountInformation),
      accountInformationExpanded: accountInformation?.open ?? null,
      accountInformationText: accountInformation?.innerText ?? null,
      snapshotAmountsFit,
      inlineEditPanelPresent: Boolean(document.querySelector(".accounts-edit-panel")),
      editableAccountRows: document.querySelectorAll('button.accounts-row[aria-label^="Edit account "], .accounts-row button[aria-label^="Edit account "]').length,
      rowCount: rows.length,
      heroSummaryWidth: heroSummaryRect ? heroSummaryRect.width : null,
      heroDividerOffset: heroContentLeft !== null && heroSummaryRect ? heroSummaryRect.right - heroContentLeft : null,
      distributionEyebrow: styleSample(distributionEyebrow),
      toolbarSearchWidth: searchRect ? searchRect.width : null,
      toolbarSearchRightOffset: toolbarContentRight !== null && searchRect ? toolbarContentRight - searchRect.right : null,
      groupShareBarCount: groupShareBars.length,
      heroDistributionBarCount: document.querySelectorAll('[data-qa="hero-distribution-bar"]').length,
      distributionSegmentCount: distributionSegments.length,
      distributionLegendItemCount: legendItems.length,
      distributionSegmentColors: distributionSegments.map(colorOf),
      distributionLegendMarkerColors: legendMarkers.map(colorOf),
      distributionLegendLabels: legendItems.map((item) => {
        const label = item.querySelector(".accounts-distribution__copy strong");
        return label ? label.textContent.trim() : "";
      }),
      heroDistributionText: distribution ? distribution.innerText.replace(/\\s+/g, " ").trim() : "",
      momVisible: /\\bMoM\\b/.test(document.body.innerText),
      previousMonthVisible: document.body.innerText.includes(${JSON.stringify("from May 2026")}),
      heroPrimaryValueText: heroPrimaryValue ? heroPrimaryValue.textContent.trim().replace(/\\s+/g, " ") : "",
      heroPrimaryValueHasDecimal: heroPrimaryValue ? /\\d[\\d,]*\\.\\d/.test(heroPrimaryValue.textContent) : null,
      heroSecondaryText: heroSecondaryText ? heroSecondaryText.textContent.trim().replace(/\\s+/g, " ") : "",
      heroSecondaryTextHasDecimal: heroSecondaryText ? /\\d[\\d,]*\\.\\d/.test(heroSecondaryText.textContent) : null,
      heroDeltaPeriodOnOwnLine: Boolean(heroDeltaMain && heroDeltaPeriod && heroDeltaPeriod.getBoundingClientRect().top >= heroDeltaMain.getBoundingClientRect().bottom - 1),
      usdEquivalentVisibleInHeroDistribution: distribution ? distribution.innerText.includes("USD equivalent") : false,
      byCurrentBalanceVisibleInHeroDistribution: distribution ? distribution.innerText.includes("By current balance") : false,
      maxRowHeight: rows.length ? Math.max(...rows.map((row) => row.getBoundingClientRect().height)) : null,
      collapsedGroups,
      loadErrorVisible: document.body.innerText.includes("Accounts could not be loaded"),
      filterEmptyVisible: document.body.innerText.includes("No accounts match"),
      firstUseEmptyVisible: document.body.innerText.includes("No accounts yet"),
      linkedSelectorVisible: Boolean(document.querySelector('[aria-label="Financial workspace"]')),
      readOnlyNoticeVisible: document.body.innerText.includes("read-only mode"),
      addAccountVisible: document.body.innerText.includes("Add account"),
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
    drawerMode: state.drawerMode ?? null,
    language: state.language ?? "en",
    ...metrics,
  };
}

function collectAdditionalFailures(stateResults) {
  const failures = [];

  for (const state of stateResults) {
    if (state.drawerMode) {
      const labels = drawerLabels[state.language];
      const isEdit = state.drawerMode === "edit";
      const expectedWidth = Math.min(460, state.viewport.width);
      if (!state.drawerOpen || Math.abs(state.drawerBounds.width - expectedWidth) > 1) {
        failures.push(`${state.name}: drawer width must match the transaction drawer (${expectedWidth}px)`);
      }
      if (state.drawerTitle !== (isEdit ? labels.edit : labels.add) || !state.drawerHasClose) {
        failures.push(`${state.name}: drawer title or close button is missing`);
      }
      if (isEdit && (!state.drawerSubtitle || state.drawerAccountName !== state.drawerSubtitle)) {
        failures.push(`${state.name}: edited account name is missing from the header or form`);
      }
      const expectedActions = isEdit ? [labels.delete, labels.cancel, labels.save] : [labels.cancel, labels.create];
      if (state.drawerBodyOverflow || !state.drawerActionsWithinViewport || (isEdit && !state.editActionsAligned)
        || JSON.stringify(state.drawerActions) !== JSON.stringify(expectedActions)) {
        failures.push(`${state.name}: drawer body or footer overflows, or footer actions are incorrect`);
      }
      if (state.drawerSwitchCount !== 2 || state.inlineEditPanelPresent) {
        failures.push(`${state.name}: expected two account settings switches and no inline edit panel`);
      }
      const expectedInformationExpanded = state.interaction === "open-edit-drawer-with-information";
      if (state.accountInformationPresent !== isEdit || (isEdit && state.accountInformationExpanded !== expectedInformationExpanded)) {
        failures.push(`${state.name}: account information availability or expansion is incorrect`);
      }
      if (expectedInformationExpanded) {
        const expectedInformation = ["Текущий баланс", "-9 999 999 999,99 PLN", "Эквивалент в USD", "-2 500 000 000,00 USD", "Курс", "0,2500 USD / PLN", "ID счёта", "#203"];
        const informationText = state.accountInformationText?.replace(/\s+/g, " ");
        if (!expectedInformation.every((text) => informationText?.includes(text))) {
          failures.push(`${state.name}: expanded account information is missing the expected PLN balance, USD equivalent, exchange rate, or ID`);
        }
        if (!state.snapshotAmountsFit) failures.push(`${state.name}: an account information value overflows its column`);
      }
    }
    if (state.scenario === "linked" && !state.linkedSelectorVisible) {
      failures.push(`${state.name}: linked-account selector is not visible`);
    }
    if (state.scenario === "linked" && !state.readOnlyNoticeVisible) {
      failures.push(`${state.name}: linked read-only notice is not visible`);
    }
    if (state.scenario === "linked" && state.addAccountVisible) {
      failures.push(`${state.name}: Add account mutation control is visible in linked mode`);
    }
    if (state.scenario === "linked" && state.editableAccountRows > 0) {
      failures.push(`${state.name}: Edit account mutation control is visible in linked mode`);
    }
    const groupedPopulatedState = state.scenario === "populated" && state.interaction !== "select-flat-view";
    if (groupedPopulatedState && state.groupShareBarCount > 0) {
      failures.push(`${state.name}: currency groups still render per-group share bars`);
    }
    if (groupedPopulatedState && state.name.startsWith("populated") && state.heroDistributionBarCount < 1) {
      failures.push(`${state.name}: missing Accounts hero distribution bar`);
    }
    if (groupedPopulatedState && state.distributionSegmentCount !== state.distributionLegendItemCount) {
      failures.push(`${state.name}: Accounts distribution segment count ${state.distributionSegmentCount} does not match legend item count ${state.distributionLegendItemCount}`);
    }
    if (groupedPopulatedState && new Set(state.distributionSegmentColors).size !== state.distributionSegmentColors.length) {
      failures.push(`${state.name}: Accounts distribution segment colors are not unique`);
    }
    if (groupedPopulatedState && state.distributionSegmentColors.some((color, index) => color !== state.distributionLegendMarkerColors[index])) {
      failures.push(`${state.name}: Accounts legend marker colors do not match bar segment colors`);
    }
    if (groupedPopulatedState && state.momVisible) {
      failures.push(`${state.name}: Accounts hero still shows MoM`);
    }
    if (groupedPopulatedState && !state.previousMonthVisible) {
      failures.push(`${state.name}: Accounts hero is missing "from May 2026"`);
    }
    if (groupedPopulatedState && state.heroPrimaryValueHasDecimal) {
      failures.push(`${state.name}: Accounts primary hero value still shows decimal digits: ${state.heroPrimaryValueText}`);
    }
    if (groupedPopulatedState && state.heroSecondaryTextHasDecimal) {
      failures.push(`${state.name}: Accounts secondary hero value still shows decimal digits: ${state.heroSecondaryText}`);
    }
    if (groupedPopulatedState && !state.heroDeltaPeriodOnOwnLine) {
      failures.push(`${state.name}: Accounts hero period label is not on a separate line from the delta`);
    }
    if (groupedPopulatedState && state.usdEquivalentVisibleInHeroDistribution) {
      failures.push(`${state.name}: Accounts hero distribution still shows visible USD equivalent label`);
    }
    if (groupedPopulatedState && state.byCurrentBalanceVisibleInHeroDistribution) {
      failures.push(`${state.name}: Accounts hero distribution still shows visible By current balance label`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && state.heroSummaryWidth !== 320) {
      failures.push(`${state.name}: Accounts hero summary column width ${state.heroSummaryWidth} does not match 320px`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && state.heroDividerOffset !== 320) {
      failures.push(`${state.name}: Accounts hero divider offset ${state.heroDividerOffset} does not match 320px`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && state.toolbarSearchWidth !== 260) {
      failures.push(`${state.name}: Accounts search width ${state.toolbarSearchWidth} does not match 260px`);
    }
    if (groupedPopulatedState && state.viewport.width >= 1024 && !nearZero(state.toolbarSearchRightOffset)) {
      failures.push(`${state.name}: Accounts search right offset ${state.toolbarSearchRightOffset} is not aligned to the toolbar edge`);
    }
    if (groupedPopulatedState && state.name.startsWith("populated")) {
      const expectedOrder = fixtureExports.accountsVisualFixtureMeta.expectedDistributionOrder;
      if (JSON.stringify(state.distributionLegendLabels) !== JSON.stringify(expectedOrder)) {
        failures.push(`${state.name}: Accounts distribution legend order ${JSON.stringify(state.distributionLegendLabels)} does not match ${JSON.stringify(expectedOrder)}`);
      }
    }
  }

  return failures;
}

function nearZero(value, tolerance = 2) {
  return typeof value === "number" && Math.abs(value) <= tolerance;
}

function runState(args) {
  return runBrowserState({
    ...args,
    routePath: "/accounts",
    initScript: `${fixedDateInitScript(args.fixture.accountsVisualFixtureMeta.fixedNow, args.state.language ?? "en")}
      localStorage.removeItem("inex.tree-expansion.accounts.user-1");
      localStorage.removeItem("inex.tree-expansion.accounts.user-2");`,
    waitForReady: waitForAccountsReady,
    applyInteraction,
    collectMetrics,
  });
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "accounts",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/accountsVisualFixture.ts",
      baseline: fixture.accountsVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.accountsVisualFixtureMeta.expectedBaseCurrency,
      expectedNetWorth: fixture.accountsVisualFixtureMeta.expectedNetWorth,
      expectedDistributionOrder: fixture.accountsVisualFixtureMeta.expectedDistributionOrder,
      fixedNow: fixture.accountsVisualFixtureMeta.fixedNow,
      expectedPreviousMonthLabel: fixture.accountsVisualFixtureMeta.expectedPreviousMonthLabel,
      collapsedStateCurrency: fixture.accountsVisualFixtureMeta.collapsedStateCurrency,
    },
    assertions: [
      "distribution bar segment count equals legend item count",
      "displayed currency segment colors are unique",
      "legend marker colors match corresponding bar segment colors",
      "MoM is absent",
      "from May 2026 appears for the fixed visual QA date",
      "primary hero value is rounded with no visible decimal digits",
      "secondary hero amount and percent values are rounded with no visible decimal digits",
      "from May 2026 period label is on a separate line from the delta amount/percent",
      "visible USD equivalent label is absent from Accounts hero distribution",
      "visible By current balance label is absent from Accounts hero distribution",
      "desktop hero summary column and divider are 320px from the hero card edge",
      "desktop search control is 260px wide and right-aligned in the toolbar",
      "create and edit drawers match the transaction drawer width and fit the viewport",
      "drawer buttons and settings switches fit desktop and mobile screens",
      "edit drawer actions align with Delete on the left and Cancel and Save on the right",
      "expanded account information uses localized Russian balances and exchange rates",
      "account information starts collapsed and expands without changing the grouped list",
    ],
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Accounts fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5198,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Accounts",
  userDataPrefix: "inex-accounts-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
