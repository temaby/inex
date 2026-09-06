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
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/transactions");
const fixturePath = path.join(clientRoot, "src/test/fixtures/transactionsVisualFixture.ts");

const authUser = {
  id: 1,
  username: "QA",
  email: "qa@example.test",
  currencyId: 1,
  languageCode: "en",
};

const defaultViewportHeight = 900;
const visualQaViewports = [
  { suffix: "1440", viewport: { width: 1440, height: 1000 } },
  { suffix: "1024", viewport: { width: 1024, height: defaultViewportHeight } },
  { suffix: "390", viewport: { width: 390, height: defaultViewportHeight } },
  { suffix: "360", viewport: { width: 360, height: defaultViewportHeight } },
];
const longRangeRoutePath = "/transactions?filter=start%3A2026-01-01%3Bend%3A2026-04-30%3B";

const delayedResponse = (response, delayMs = 1400) => new Promise((resolve) => {
  setTimeout(() => resolve(response), delayMs);
});

function getScenarioTransactions(fixture, scenario, hasNoMatch, mutationSucceeded = false) {
  if (scenario === "empty" || hasNoMatch || (scenario === "edit-filtered-out" && mutationSucceeded)) return [];

  if (scenario === "progressive-loading" || scenario === "progressive-error" || scenario === "long-range") {
    return Array.from({ length: 25 }, (_, index) => {
      const source = fixture.transactionsVisualFixtureTransactions[index % fixture.transactionsVisualFixtureTransactions.length];
      return {
        ...source,
        id: source.id + (index * 100),
        comment: `${source.comment} ${index + 1}`,
      };
    });
  }

  return fixture.transactionsVisualFixtureTransactions;
}

function createTransactionsSummary(fixture, scenario, hasNoMatch, mutationSucceeded) {
  const transactions = getScenarioTransactions(fixture, scenario, hasNoMatch, mutationSucceeded);
  const categoriesById = new Map(fixture.transactionsVisualFixtureCategories.map((category) => [category.id, category]));
  const currencySummariesByCurrency = new Map();
  const typeCounts = {
    all: transactions.length,
    income: 0,
    expense: 0,
    transfer: 0,
    internalTransfer: 0,
  };

  for (const transaction of transactions) {
    const category = categoriesById.get(transaction.categoryId);
    const kind = category?.systemCode === "internal-transfer"
      ? "internalTransfer"
      : category?.isSystem ? "transfer" : transaction.amount >= 0 ? "income" : "expense";
    typeCounts[kind] += 1;

    if (kind === "transfer" || kind === "internalTransfer") {
      continue;
    }

    const summary = currencySummariesByCurrency.get(transaction.accountCurrency) ?? {
      currency: transaction.accountCurrency,
      income: 0,
      expense: 0,
      net: 0,
    };

    if (kind === "income") {
      summary.income += transaction.amount;
    } else {
      summary.expense += transaction.amount;
    }
    summary.net = summary.income + summary.expense;
    currencySummariesByCurrency.set(transaction.accountCurrency, summary);
  }

  return {
    totalCount: transactions.length,
    typeCounts,
    viewTypeCounts: typeCounts,
    currencySummaries: Array.from(currencySummariesByCurrency.values()),
    baseCurrency: fixture.transactionsVisualFixtureMeta.expectedBaseCurrency,
    currentScope: {
      totalCount: transactions.length,
      typeCounts,
      period: { startDate: "2026-04-01T00:00:00", endDate: "2026-04-30T23:59:59" },
      cashFlowBuckets: transactions.filter((transaction) => !categoriesById.get(transaction.categoryId)?.isSystem).map((transaction) => ({
        date: transaction.created,
        currency: transaction.accountCurrency,
        income: transaction.amount >= 0 ? transaction.amount : 0,
        expense: transaction.amount < 0 ? transaction.amount : 0,
        recordCount: 1,
      })),
    },
    previousScope: {
      totalCount: 0,
      typeCounts: { all: 0, income: 0, expense: 0, transfer: 0, internalTransfer: 0 },
      period: { startDate: "2026-03-01T00:00:00", endDate: "2026-03-31T23:59:59" },
      cashFlowBuckets: [],
    },
  };
}

const states = [
  {
    name: "populated-1440",
    screenshot: "populated-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
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
    name: "internal-transfer-create-390",
    screenshot: "internal-transfer-create-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-internal-transfer-drawer",
  },
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `selected-active-account-create-${suffix}`,
    screenshot: `selected-active-account-create-${suffix}.png`,
    viewport,
    scenario: "populated",
    interaction: "open-add-drawer-and-select-account",
    screenshotMode: "viewport",
  })),
  {
    name: "filter-drawer-open-390",
    screenshot: "filter-drawer-open-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-filter-drawer",
  },
  {
    name: "filter-drawer-open-360",
    screenshot: "filter-drawer-open-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-filter-drawer",
  },
  {
    name: "account-overview-expanded-1440",
    screenshot: "account-overview-expanded-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "expand-account-overview",
  },
  {
    name: "account-overview-expanded-390",
    screenshot: "account-overview-expanded-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "expand-account-overview",
  },
  {
    name: "account-overview-pinned-desktop-1440",
    screenshot: "account-overview-pinned-desktop-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "pin-account-overview",
  },
  {
    name: "account-overview-pinned-mobile-390",
    screenshot: "account-overview-pinned-mobile-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "pin-account-overview",
  },
  {
    name: "account-overview-loading-390",
    screenshot: "account-overview-loading-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-loading",
    interaction: "expand-account-overview",
    settleDelayMs: 2400,
  },
  {
    name: "account-overview-empty-390",
    screenshot: "account-overview-empty-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-empty",
    interaction: "expand-account-overview",
  },
  {
    name: "account-overview-error-390",
    screenshot: "account-overview-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-error",
    interaction: "expand-account-overview",
  },
  {
    name: "account-overview-retry-390",
    screenshot: "account-overview-retry-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "account-balances-error-retry",
    interaction: "expand-account-overview-and-retry",
  },
  {
    name: "expanded-row-1440",
    screenshot: "expanded-row-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "populated",
    interaction: "open-row-edit",
  },
  {
    name: "expanded-row-390",
    screenshot: "expanded-row-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-row-edit",
  },
  {
    name: "edit-success-return-1440",
    screenshot: "edit-success-return-1440.png",
    viewport: { width: 1440, height: 1000 },
    scenario: "edit-success",
    interaction: "save-row-edit",
    expectedFocus: "edited-row",
  },
  {
    name: "edit-success-return-390",
    screenshot: "edit-success-return-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "edit-success",
    interaction: "save-row-edit",
    expectedFocus: "edited-row",
  },
  {
    name: "edit-failure-390",
    screenshot: "edit-failure-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "edit-failure",
    interaction: "save-row-edit",
  },
  {
    name: "edit-filtered-out-return-390",
    screenshot: "edit-filtered-out-return-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "edit-filtered-out",
    interaction: "save-row-edit",
    expectedFocus: "ledger-heading",
  },
  {
    name: "edit-delete-return-390",
    screenshot: "edit-delete-return-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "edit-delete",
    interaction: "delete-row-edit",
    expectedFocus: "ledger-heading",
  },
  {
    name: "edit-delete-confirmation-390",
    screenshot: "edit-delete-confirmation-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "edit-delete",
    interaction: "open-delete-confirmation",
  },
  ...visualQaViewports.filter(({ suffix }) => suffix === "1024" || suffix === "360").map(({ suffix, viewport }) => ({
    name: `expanded-row-${suffix}`,
    screenshot: `expanded-row-${suffix}.png`,
    viewport,
    scenario: "populated",
    interaction: "open-row-edit",
  })),
  {
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "transactions-error",
  },
  {
    name: "initial-retry-390",
    screenshot: "initial-retry-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "transactions-error-retry",
    interaction: "retry-initial",
  },
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `initial-loading-${suffix}`,
    screenshot: `initial-loading-${suffix}.png`,
    viewport,
    scenario: "initial-loading",
    settleDelayMs: 1600,
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `first-use-empty-${suffix}`,
    screenshot: `first-use-empty-${suffix}.png`,
    viewport,
    scenario: "empty",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `filter-empty-${suffix}`,
    screenshot: `filter-empty-${suffix}.png`,
    viewport,
    scenario: "populated",
    interaction: "search-no-match",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `missing-rate-${suffix}`,
    screenshot: `missing-rate-${suffix}.png`,
    viewport,
    scenario: "missing-rate",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `progressive-loading-${suffix}`,
    screenshot: `progressive-loading-${suffix}.png`,
    viewport,
    scenario: "progressive-loading",
    interaction: "load-more-pending",
    settleDelayMs: 1600,
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `long-range-pagination-${suffix}`,
    screenshot: `long-range-pagination-${suffix}.png`,
    viewport,
    scenario: "long-range",
    routePath: longRangeRoutePath,
    interaction: "close-filter-drawer",
  })),
  ...visualQaViewports.map(({ suffix, viewport }) => ({
    name: `refresh-error-${suffix}`,
    screenshot: `refresh-error-${suffix}.png`,
    viewport,
    scenario: "progressive-error",
    interaction: "load-more-error",
    settleDelayMs: 1600,
  })),
  {
    name: "refresh-retry-390",
    screenshot: "refresh-retry-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "progressive-error",
    interaction: "load-more-error-and-retry",
  },
];

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  return createApiFixtureHandler({
    requestLog,
    unhandledApiRequests,
    scenarioRef,
    handleRequest: ({ url, method, scenario }) => {
      const hasNoMatch = url.searchParams.get("search") === "zzzz-no-match";
      if (url.pathname === "/api/auth/refresh" && method === "POST") {
        return jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
      }
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return jsonResponse(authUser);
      }
      if (url.pathname === "/api/accounts" && method === "GET") {
        return jsonResponse({ data: fixture.transactionsVisualFixtureAccounts });
      }
      if (url.pathname === "/api/accounts/details" && method === "GET") {
        const requestKey = "account-balances";
        scenarioRef.requestCounts[requestKey] = (scenarioRef.requestCounts[requestKey] ?? 0) + 1;
        const requestAttempt = scenarioRef.requestCounts[requestKey];

        if (scenario === "account-balances-error" || (scenario === "account-balances-error-retry" && requestAttempt === 1)) {
          return problemResponse("Account balance fixture failure", "Controlled account balance failure.", 500);
        }

        const response = jsonResponse({
          data: scenario === "account-balances-empty" ? [] : fixture.transactionsVisualFixtureAccountSummaries,
        });
        return scenario === "account-balances-loading" ? delayedResponse(response, 2200) : response;
      }
      if (url.pathname === "/api/categories" && method === "GET") {
        return jsonResponse({ data: fixture.transactionsVisualFixtureCategories });
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: scenario === "missing-rate" ? [] : fixture.transactionsVisualFixtureRates });
      }
      const mutationSucceeded = (scenarioRef.requestCounts["transaction-mutation"] ?? 0) > 0;
      if (url.pathname === "/api/transactions/summary" && method === "GET") {
        if (scenario === "transactions-error") {
          return problemResponse("Transactions fixture failure", "Controlled Transactions summary failure.", 500);
        }

        const response = jsonResponse(createTransactionsSummary(fixture, scenario, hasNoMatch, mutationSucceeded));
        return scenario === "initial-loading" ? delayedResponse(response) : response;
      }
      if (url.pathname === "/api/transactions" && method === "GET") {
        const page = Number(url.searchParams.get("page") ?? "1");
        const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
        const requestKey = `transactions-page-${page}`;
        scenarioRef.requestCounts[requestKey] = (scenarioRef.requestCounts[requestKey] ?? 0) + 1;
        const requestAttempt = scenarioRef.requestCounts[requestKey];

        if (scenario === "transactions-error" || (scenario === "transactions-error-retry" && requestAttempt === 1)) {
          return problemResponse("Transactions fixture failure", "Controlled Transactions load failure.", 500);
        }

        const data = getScenarioTransactions(fixture, scenario, hasNoMatch, mutationSucceeded);
        const response = jsonResponse({
          data: data.slice((page - 1) * pageSize, page * pageSize),
          metadata: { totalItems: data.length },
        });

        if (scenario === "initial-loading" || (scenario === "progressive-loading" && page > 1)) {
          return delayedResponse(response);
        }

        if (scenario === "progressive-error" && page > 1 && requestAttempt === 1) {
          return delayedResponse(problemResponse("Transactions fixture failure", "Controlled progressive page failure.", 500));
        }

        return response;
      }
      if (url.pathname.startsWith("/api/transactions/") && (method === "PUT" || method === "DELETE")) {
        scenarioRef.requestCounts["transaction-mutation"] = (scenarioRef.requestCounts["transaction-mutation"] ?? 0) + 1;
        if (scenario === "edit-failure") {
          return problemResponse("Transaction update fixture failure", "Controlled transaction update failure.", 422);
        }
        return jsonResponse({});
      }
      return null;
    },
  });
}

async function applyInteraction(client, state) {
  switch (state.interaction) {
    case "search-no-match":
      await evaluate(client, `(() => {
        const input = document.querySelector("input[type='search'][aria-label='Search']");
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "zzzz-no-match");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('No transactions match these filters')");
      return;
    case "open-add-drawer":
      await evaluate(client, clickButtonByTextExpression("Add transaction"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('New transaction')");
      return;
    case "open-add-drawer-and-select-account":
      await evaluate(client, clickButtonByTextExpression("Add transaction"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('New transaction')");
      await evaluate(client, `(() => {
        const trigger = Array.from(document.querySelectorAll(".ant-menu-submenu-title")).find((item) => item.textContent?.includes("Select account"));
        if (!trigger) return false;
        trigger.click();
        return true;
      })()`);
      await waitFor(client, "Array.from(document.querySelectorAll('.ant-menu-item')).some((item) => item.textContent?.includes('Emergency reserve for long-term household commitments')) && !Array.from(document.querySelectorAll('.ant-menu-item')).some((item) => item.textContent?.includes('USD archive'))");
      await evaluate(client, `(() => {
        const account = Array.from(document.querySelectorAll(".ant-menu-item")).find((item) => item.textContent?.includes("Emergency reserve for long-term household commitments"));
        if (!account) return false;
        account.click();
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('Emergency reserve for long-term household commitments') && !document.body.innerText.includes('Native balance') && !document.querySelector('[data-qa=selected-account-native-balance]')");
      return;
    case "open-internal-transfer-drawer":
      await evaluate(client, clickButtonByTextExpression("Add transaction"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('New transaction')");
      await evaluate(client, `(() => {
        const tab = Array.from(document.querySelectorAll(".transactions-create-form button")).find((item) => item.textContent?.trim() === "Internal transfer");
        if (!tab) return false;
        tab.click();
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('Direction') && document.body.innerText.includes('Sent') && document.body.innerText.includes('Received')");
      return;
    case "open-filter-drawer":
      await evaluate(client, clickButtonByTextExpression("Filters"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Advanced filters')");
      return;
    case "expand-account-overview":
      await evaluate(client, clickButtonByTextExpression("Expand"));
      if (state.scenario === "account-balances-loading") {
        await waitFor(client, "document.body.innerText.includes('Loading account balances')");
      } else if (state.scenario === "account-balances-empty") {
        await waitFor(client, "document.body.innerText.includes('No active accounts to display')");
      } else if (state.scenario === "account-balances-error") {
        await waitFor(client, "document.body.innerText.includes('Could not load account balances')");
      } else {
        await waitFor(client, "document.body.innerText.includes('Emergency reserve for long-term household commitments')");
      }
      return;
    case "expand-account-overview-and-retry":
      await evaluate(client, clickButtonByTextExpression("Expand"));
      await waitFor(client, "document.body.innerText.includes('Could not load account balances')");
      await activateRetryButton(client);
      await waitFor(client, "document.body.innerText.includes('Emergency reserve for long-term household commitments')");
      return;
    case "pin-account-overview":
      await evaluate(client, clickButtonByTextExpression("Pin overview"));
      await waitFor(client, "document.body.innerText.includes('Emergency reserve for long-term household commitments')");
      return;
    case "open-row-edit":
      await openRowEdit(client);
      return;
    case "save-row-edit":
      await openRowEdit(client);
      await changeCommentAndSave(client);
      if (state.scenario === "edit-failure") {
        await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Controlled transaction update failure')");
      } else if (state.expectedFocus === "edited-row") {
        await waitFor(client, `!document.querySelector('.ant-drawer-open') && document.activeElement?.getAttribute('data-transaction-id') === '${fixtureExports.transactionsVisualFixtureTransactions[0].id}'`);
      } else {
        await waitFor(client, "!document.querySelector('.ant-drawer-open') && document.activeElement?.id === 'transactions-ledger-heading'");
      }
      return;
    case "delete-row-edit":
      await openRowEdit(client);
      await evaluate(client, clickButtonByTextExpression("Delete"));
      await waitFor(client, "Boolean(document.querySelector('.ant-popconfirm'))");
      state.deleteConfirmationSeen = await evaluate(client, "Boolean(document.querySelector('.ant-popconfirm'))");
      await evaluate(client, clickButtonByTextExpression("Yes"));
      await waitFor(client, "!document.querySelector('.ant-drawer-open') && document.activeElement?.id === 'transactions-ledger-heading'");
      return;
    case "open-delete-confirmation":
      await openRowEdit(client);
      await evaluate(client, clickButtonByTextExpression("Delete"));
      await waitFor(client, "Boolean(document.querySelector('.ant-popconfirm'))");
      return;
    case "load-more-pending":
      await evaluate(client, clickButtonByTextExpression("Load more"));
      await waitFor(client, "document.body.innerText.includes('Refreshing ledger') && document.querySelectorAll('.transactions-ledger-row').length === 20");
      return;
    case "load-more-error":
      await evaluate(client, clickButtonByTextExpression("Load more"));
      await waitFor(client, "document.body.innerText.includes('Could not refresh the ledger') && document.querySelectorAll('.transactions-ledger-row').length === 20");
      return;
    case "retry-initial":
      await activateRetryButton(client);
      await waitFor(client, "document.querySelectorAll('.transactions-ledger-row').length === 6 && !document.body.innerText.includes('Failed to load transactions')");
      return;
    case "load-more-error-and-retry":
      await evaluate(client, clickButtonByTextExpression("Load more"));
      await waitFor(client, "document.body.innerText.includes('Could not refresh the ledger') && document.querySelectorAll('.transactions-ledger-row').length === 20");
      await activateRetryButton(client);
      await waitFor(client, "document.querySelectorAll('.transactions-ledger-row').length === 25 && !document.body.innerText.includes('Could not refresh the ledger')");
      return;
    case "close-filter-drawer":
      await evaluate(client, "(() => { const button = document.querySelector('.ant-drawer-close'); if (!button) return false; button.click(); return true; })()");
      await waitFor(client, "!document.querySelector('.ant-drawer-open') && Boolean(document.querySelector('.ant-pagination'))");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function openRowEdit(client) {
  await evaluate(client, `(() => {
          const row = document.querySelector(".transactions-ledger-row");
          if (!row) return false;
          row.click();
          return true;
        })()`);
  await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open')) && document.body.innerText.includes('Edit transaction') && !document.body.innerText.includes('Native balance') && !document.querySelector('[data-qa=selected-account-native-balance]')");
}

async function changeCommentAndSave(client) {
  await evaluate(client, `(() => {
    const input = Array.from(document.querySelectorAll('.ant-drawer-body input')).find((item) => item instanceof HTMLInputElement && item.value.includes("BIEDRONKA groceries"));
    if (!(input instanceof HTMLInputElement)) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, input.value + " updated");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await evaluate(client, clickButtonByTextExpression("Save"));
}

async function activateRetryButton(client) {
  const activated = await evaluate(client, `(() => {
    const button = Array.from(document.querySelectorAll("button")).find((item) => {
      if (item.textContent?.trim() !== "Retry") return false;
      const style = window.getComputedStyle(item);
      const rect = item.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
    if (!button) return false;
    button.focus();
    if (document.activeElement !== button) return false;
    button.click();
    return true;
  })()`);
  if (!activated) throw new Error("Could not focus and activate the Retry control.");
}

async function waitForTransactionsReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Transactions')");

  if (state.scenario === "initial-loading") {
    await waitFor(client, "Boolean(document.querySelector('.transactions-loading')) && Boolean(document.querySelector('.transactions-kpi__skeleton'))");
  } else if (state.scenario === "transactions-error" || state.scenario === "transactions-error-retry") {
    await waitFor(client, "document.body.innerText.includes('Failed to load transactions')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No transactions to display')");
  } else {
    await waitFor(client, "document.body.innerText.includes('BIEDRONKA groceries')");
  }
}

async function collectMetrics(client, state, apiRequestCount) {
  const initialViewport = await evaluate(client, `(() => {
    const retry = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === "Retry");
    const bottomNav = document.querySelector(".r-bottom-nav");
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    const bottomNavVisible = Boolean(bottomNav && bottomNavStyle && bottomNavStyle.display !== "none" && bottomNav.getBoundingClientRect().height > 0);
    const retryRect = retry?.getBoundingClientRect();
    const bottomNavRect = bottomNavVisible ? bottomNav.getBoundingClientRect() : null;
    return {
      recoveryActionVisibleAtStart: Boolean(retryRect && retryRect.bottom > 0 && retryRect.top < window.innerHeight),
      recoveryActionOccludedAtStart: Boolean(retryRect && bottomNavRect && retryRect.bottom > bottomNavRect.top),
    };
  })()`);
  await evaluate(client, "window.scrollTo(0, document.documentElement.scrollHeight)");
  await wait(150);

  const metrics = await evaluate(client, `(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const bottomNav = document.querySelector(".r-bottom-nav");
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    const bottomNavVisible = Boolean(bottomNav && bottomNavStyle && bottomNavStyle.display !== "none" && bottomNav.getBoundingClientRect().height > 0);
    const bottomNavRect = bottomNavVisible ? bottomNav.getBoundingClientRect() : null;
    const content = document.querySelector(".transactions-ledger, .transactions-empty-wrap, .transactions-ledger-card");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const ledgerCard = document.querySelector(".transactions-ledger-card");
    const ledgerCardRect = ledgerCard ? ledgerCard.getBoundingClientRect() : null;
    const ledgerColumns = Array.from(document.querySelectorAll(".transactions-ledger-head > div"));
    const drawer = document.querySelector(".ant-drawer-open .ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const rows = Array.from(document.querySelectorAll(".transactions-ledger-row"));
    const groups = Array.from(document.querySelectorAll(".transactions-day-group"));
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
      dayGroupCount: groups.length,
      maxRowHeight: rows.length ? Math.max(...rows.map((row) => row.getBoundingClientRect().height)) : null,
      addDrawerOpen: document.body.innerText.includes("New transaction"),
      advancedFilterDrawerOpen: document.body.innerText.includes("Advanced filters"),
      rowEditDrawerOpen: document.body.innerText.includes("Edit transaction"),
      accountBalancesInlineVisible: Boolean(document.querySelector(".transactions-account-balances--inline")),
      accountBalancesRailVisible: Boolean(document.querySelector(".transactions-account-balances--rail")),
      accountBalancesExpanded: Boolean(document.querySelector(".transactions-account-balances__list, .transactions-account-balances__state")),
      accountBalancesPinned: Boolean(document.querySelector(".transactions-account-balances [aria-pressed='true']")),
      accountBalancesRailSticky: (() => {
        const rail = document.querySelector(".transactions-account-balances-rail");
        return rail ? window.getComputedStyle(rail).position === "sticky" : false;
      })(),
      accountBalancesZeroVisible: document.body.innerText.includes("0.00 PLN"),
      ledgerColumnsFullyVisible: Boolean(ledgerCardRect && ledgerColumns.length === 4 && ledgerColumns.every((column) => {
        const rect = column.getBoundingClientRect();
        return rect.left >= ledgerCardRect.left && rect.right <= ledgerCardRect.right;
      })),
      ledgerColumnLabels: ledgerColumns.map((column) => column.textContent?.trim() ?? ""),
      rowsKeyboardOperable: rows.every((row) => row.getAttribute("role") === "button" && row.tabIndex === 0),
      mobileAmountFirst: rows.every((row) => {
        const amount = row.querySelector(".transactions-row-amount");
        const main = row.querySelector(".transactions-row-main");
        const account = row.querySelector(".transactions-row-account");
        const date = row.querySelector(".transactions-row-date");
        if (!amount || !main || !account || !date) return false;
        const amountTop = amount.getBoundingClientRect().top;
        return amountTop <= main.getBoundingClientRect().top
          && main.getBoundingClientRect().top <= account.getBoundingClientRect().top
          && account.getBoundingClientRect().top <= date.getBoundingClientRect().top;
      }),
      baseEquivalentCount: document.querySelectorAll(".transactions-row-amount-equivalent").length,
      hasTrailingRowChevron: Boolean(document.querySelector(".transactions-ledger-row .transactions-row-chevron")),
      rowContentWithinBounds: rows.every((row) => {
        const rowRect = row.getBoundingClientRect();
        return Array.from(row.querySelectorAll(".transactions-row-title, .transactions-row-token, [role='text']")).every((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left >= rowRect.left - 1 && rect.right <= rowRect.right + 1;
        });
      }),
      loadErrorVisible: document.body.innerText.includes("Failed to load transactions"),
      initialLoadingVisible: Boolean(document.querySelector(".transactions-loading")),
      progressiveLoadingVisible: document.body.innerText.includes("Refreshing ledger") && rows.length === 20,
      refreshErrorVisible: document.body.innerText.includes("Could not refresh the ledger") && rows.length === 20,
      paginationVisible: Boolean(document.querySelector(".ant-pagination")),
      filterEmptyVisible: document.body.innerText.includes("No transactions match these filters"),
      firstUseEmptyVisible: document.body.innerText.includes("No transactions to display"),
      dataModeLabel: ${JSON.stringify("fixture")},
      apiRequestCount: ${apiRequestCount},
      ...${JSON.stringify(initialViewport)},
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
    routePath: args.state.routePath ?? "/transactions",
    initScript: `${fixedDateInitScript(args.fixture.transactionsVisualFixtureMeta.fixedNow, "en")}
      localStorage.removeItem("inex.transactions.account-balances-pinned");`,
    waitForReady: waitForTransactionsReady,
    applyInteraction,
    collectMetrics,
  });
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;

  return {
    generatedAt: new Date().toISOString(),
    page: "transactions",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: fixture.transactionsVisualFixtureMeta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/transactionsVisualFixture.ts",
      baseline: fixture.transactionsVisualFixtureMeta.baseline,
      expectedBaseCurrency: fixture.transactionsVisualFixtureMeta.expectedBaseCurrency,
      expectedTransactionCount: fixture.transactionsVisualFixtureMeta.expectedTransactionCount,
      rowInteraction: fixture.transactionsVisualFixtureMeta.rowInteraction,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: {
      ...buildCommonChecks(stateResults, failures, unhandledApiRequests),
      amountFilterRemoved: stateResults
        .filter((state) => state.interaction === "open-filter-drawer")
        .every((state) => !state.textSample.includes("Amount equivalent")),
      recoveryActionsClearMobileNav: stateResults
        .filter((state) => state.loadErrorVisible || state.refreshErrorVisible)
        .every((state) => !state.recoveryActionOccludedAtStart),
      accountBalancesInitiallyCollapsed: stateResults
        .filter((state) => state.name === "populated-1440" || state.name === "populated-1024" || state.name === "populated-390" || state.name === "populated-360")
        .every((state) => state.accountBalancesInlineVisible && !state.accountBalancesExpanded && !state.accountBalancesRailVisible),
      accountBalancesInlinePresentation: stateResults
        .filter((state) => state.name.startsWith("account-overview-expanded-") || state.name.startsWith("account-overview-loading-") || state.name.startsWith("account-overview-empty-") || state.name.startsWith("account-overview-error-") || state.name.startsWith("account-overview-retry-"))
        .every((state) => state.accountBalancesInlineVisible && state.accountBalancesExpanded && !state.accountBalancesRailVisible),
      accountBalancesPinnedDesktopRail: stateResults
        .filter((state) => state.name === "account-overview-pinned-desktop-1440")
        .every((state) => state.accountBalancesRailVisible && state.accountBalancesExpanded && state.accountBalancesRailSticky && !state.accountBalancesInlineVisible),
      accountBalancesPinnedMobileInline: stateResults
        .filter((state) => state.name === "account-overview-pinned-mobile-390")
        .every((state) => state.accountBalancesInlineVisible && state.accountBalancesExpanded && !state.accountBalancesRailVisible),
      desktopLedgerScanOrder: stateResults
        .filter((state) => state.name === "populated-1440" || state.name === "populated-1024")
        .every((state) => state.ledgerColumnLabels.join("|") === "Description|Account|Date|Amount"
          && state.ledgerColumnsFullyVisible
          && state.rowsKeyboardOperable
          && !state.hasTrailingRowChevron
          && state.rowContentWithinBounds),
      mobileLedgerScanOrder: stateResults
        .filter((state) => state.name === "populated-390" || state.name === "populated-360")
        .every((state) => state.mobileAmountFirst && state.rowsKeyboardOperable && !state.hasTrailingRowChevron && state.rowContentWithinBounds),
      baseEquivalentsRespectCachedDate: stateResults
        .filter((state) => state.name === "populated-1440")
        .every((state) => state.baseEquivalentCount > 0)
        && stateResults.filter((state) => state.name === "missing-rate-1440")
          .every((state) => state.baseEquivalentCount === 0),
    },
  };
}

const fixtureExports = loadFixture(fixturePath, `Transactions fixture is missing: ${fixturePath}`);
const stateFilter = process.env.INEX_VISUAL_QA_STATE_FILTER;
const configuredStates = stateFilter
  ? states.filter((state) => state.name.startsWith(stateFilter))
  : states;

if (configuredStates.length === 0) {
  throw new Error(`No Transactions visual-QA states match "${stateFilter}".`);
}

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5199,
  fixture: fixtureExports,
  states: configuredStates,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures: (stateResults) => {
    const failures = [];
    for (const state of stateResults.filter((item) => item.name === "populated-1440" || item.name === "populated-1024")) {
      if (state.ledgerColumnLabels.join("|") !== "Description|Account|Date|Amount") {
        failures.push(`${state.name}: desktop ledger order is not Description, Account, Date, Amount`);
      }
      if (!state.rowsKeyboardOperable || state.hasTrailingRowChevron) {
        failures.push(`${state.name}: ledger rows are not keyboard-operable button rows without a trailing chevron`);
      }
      if (!state.rowContentWithinBounds) {
        failures.push(`${state.name}: long row content exceeds the ledger bounds`);
      }
    }

    for (const state of stateResults.filter((item) => item.name === "populated-390" || item.name === "populated-360")) {
      if (!state.mobileAmountFirst || !state.rowsKeyboardOperable || state.hasTrailingRowChevron || !state.rowContentWithinBounds) {
        failures.push(`${state.name}: mobile ledger row order or keyboard semantics are incorrect`);
      }
    }

    const populated = stateResults.find((item) => item.name === "populated-1440");
    const missingRate = stateResults.find((item) => item.name === "missing-rate-1440");
    if (populated && populated.baseEquivalentCount === 0) {
      failures.push("populated-1440: available cached rates did not render base equivalents");
    }
    if (missingRate && missingRate.baseEquivalentCount !== 0) {
      failures.push("missing-rate-1440: unavailable cached rates rendered base equivalents");
    }

    for (const state of stateResults.filter((item) => item.name.startsWith("account-overview-"))) {
      if (state.hasHorizontalOverflow) {
        failures.push(`${state.name}: account overview introduces horizontal overflow`);
      }
    }

    const pinnedDesktop = stateResults.find((item) => item.name === "account-overview-pinned-desktop-1440");
    if (pinnedDesktop && (!pinnedDesktop.accountBalancesRailVisible || !pinnedDesktop.accountBalancesRailSticky || pinnedDesktop.accountBalancesInlineVisible)) {
      failures.push("account-overview-pinned-desktop-1440: pinned overview is not a single sticky right rail");
    }

    const pinnedMobile = stateResults.find((item) => item.name === "account-overview-pinned-mobile-390");
    if (pinnedMobile && (!pinnedMobile.accountBalancesInlineVisible || pinnedMobile.accountBalancesRailVisible)) {
      failures.push("account-overview-pinned-mobile-390: pinned overview is not rendered inline");
    }

    return failures;
  },
  label: "Transactions",
  userDataPrefix: "inex-transactions-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
