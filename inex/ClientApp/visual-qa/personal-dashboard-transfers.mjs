import path from "node:path";
import { visualQaConfig as dashboard } from "./visual-dashboard.mjs";
import { buildCommonChecks, jsonResponse, runVisualQaScript } from "./harness.mjs";

const outputDir = path.join(dashboard.repoRoot, "docs/implementation/visual-qa/personal-dashboard-transfers");
let activeCase = "both";
const states = [
  ...[1440, 1024, 390, 360].map((width) => ({ name: `both-${width}`, transferCase: "both", width })),
  { name: "incoming-390", transferCase: "incoming", width: 390 },
  { name: "outgoing-390", transferCase: "outgoing", width: 390 },
  { name: "balanced-390", transferCase: "balanced", width: 390 },
  { name: "fractional-390", transferCase: "fractional", width: 390 },
  { name: "empty-390", transferCase: "empty", width: 390 },
  { name: "transfer-only-390", transferCase: "only", scenario: "no-activity", width: 390 },
  { name: "missing-rate-390", transferCase: "missing", width: 390 },
  { name: "russian-360", transferCase: "both", scenario: "russian", width: 360 },
  { name: "flow-russian-360", transferCase: "both", scenario: "russian", width: 360, screenshotMode: "selector", screenshotSelector: "[data-qa=visual-flow]" },
  { name: "flow-1440", transferCase: "both", width: 1440, screenshotMode: "selector", screenshotSelector: "[data-qa=visual-flow]" },
  { name: "long-amounts-360", transferCase: "long", scenario: "russian", width: 360 },
  { name: "linked-390", transferCase: "both", scenario: "linked", interaction: "linked", width: 390 },
  { name: "historical-390", transferCase: "history", scenario: "month-history", width: 390, routePath: "/dashboard?month=2026-03&keep=1" },
].map((state) => ({ ...state, scenario: state.scenario ?? "populated", screenshot: `${state.name}.png`, viewport: { width: state.width, height: state.width >= 1024 ? 1000 : 900 } }));

function bucketsForCase() {
  if (activeCase === "empty") return [];
  if (activeCase === "missing") return [{ date: "2026-04-03", currency: "EUR", amountReceived: 50, amountSent: 100, recordCount: 2 }];
  if (activeCase === "history") return [{ date: "2026-03-03", currency: "PLN", amountReceived: 800, amountSent: 4000, recordCount: 2 }];
  if (activeCase === "incoming") return [{ date: "2026-04-03", currency: "USD", amountReceived: 500, amountSent: 0, recordCount: 1 }];
  if (activeCase === "outgoing") return [{ date: "2026-04-03", currency: "USD", amountReceived: 0, amountSent: 2500, recordCount: 1 }];
  if (activeCase === "balanced") return [{ date: "2026-04-03", currency: "USD", amountReceived: 2500, amountSent: 2500, recordCount: 2 }];
  if (activeCase === "fractional") return [
    { date: "2026-04-03", currency: "USD", amountReceived: 0.1, amountSent: 0.3, recordCount: 2 },
    { date: "2026-04-20", currency: "USD", amountReceived: 0.2, amountSent: 0, recordCount: 1 },
  ];
  if (activeCase === "long") return [{ date: "2026-04-03", currency: "USD", amountReceived: 999999999.99, amountSent: 1234567890.12, recordCount: 2 }];
  return [
    { date: "2026-04-03", currency: "USD", amountReceived: 100, amountSent: 2500, recordCount: 2 },
    { date: "2026-04-20", currency: "PLN", amountReceived: 1600, amountSent: 0, recordCount: 1 },
  ];
}

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  const transferRows = () => bucketsForCase().flatMap((bucket, index) => [
    { id: 9000 + index * 2, amount: bucket.amountReceived },
    { id: 9001 + index * 2, amount: -bucket.amountSent },
  ].filter((row) => row.amount !== 0).map((row) => ({
    ...row, accountId: 14, categoryId: 9001, accountCurrency: bucket.currency,
    created: `${bucket.date}T12:00:00`, comment: null, tags: [], refs: [],
  })));
  const transferFixture = {
    ...fixture,
    get dashboardVisualFixtureCategories() { return [...fixture.dashboardVisualFixtureCategories,
      { id: 9001, key: "internal-transfer", name: "Internal transfer", parentId: null,
        isEnabled: true, isSystem: true, systemCode: "internal-transfer", description: "" },
    ]; },
    get dashboardVisualFixtureTransactions() { return [...fixture.dashboardVisualFixtureTransactions, ...transferRows()]; },
  };
  const handleDashboard = dashboard.createApiHandler(transferFixture, requestLog, unhandledApiRequests, scenarioRef);
  return async (event, client) => {
    const url = new URL(event.request.url);
    if (url.pathname === "/api/transactions" && activeCase === "only") {
      requestLog.push(`${event.request.method} ${url.pathname.replace("/api", "")}${url.search}`);
      const rows = transferRows();
      await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse({ data: rows, metadata: { totalItems: rows.length } }) });
      return;
    }
    if (url.pathname !== "/api/transactions/summary") return handleDashboard(event, client);
    requestLog.push(`${event.request.method} ${url.pathname.replace("/api", "")}${url.search}`);
    const source = activeCase === "only" ? fixture.dashboardVisualFixtureEmptyTransactionSummary : fixture.dashboardVisualFixtureTransactionSummary;
    const buckets = bucketsForCase();
    const count = buckets.reduce((sum, bucket) => sum + bucket.recordCount, 0);
    const cashFlowBuckets = activeCase === "history" ? [
      { date: "2026-03-03", currency: "USD", income: 0, expense: -100, recordCount: 1 },
      { date: "2026-03-03", currency: "PLN", income: 4000, expense: -800, recordCount: 2 },
    ] : source.currentScope.cashFlowBuckets;
    const body = { ...source,
      typeCounts: { ...source.typeCounts, internalTransfer: count },
      currentScope: { ...source.currentScope, cashFlowBuckets, internalTransferBuckets: buckets,
        typeCounts: { ...source.currentScope.typeCounts, internalTransfer: count } },
    };
    await client.send("Fetch.fulfillRequest", { requestId: event.requestId, ...jsonResponse(body) });
  };
}

function collectAdditionalFailures(results) {
  const failures = dashboard.collectAdditionalFailures(results);
  const number = (text, russian) => Number((russian ? text?.replace(",", ".") : text)?.replace(/[^\d.\-+]/g, ""));
  for (const state of results) {
    if (state.transferCase === "empty") {
      if (state.transferSection) failures.push(`${state.name}: empty transfer section visible`);
      continue;
    }
    if (!state.transferSection || !state.transferDetailsVisible) failures.push(`${state.name}: transfer summary or details action absent`);
    if (state.transferCase === "missing") {
      if (state.transferSent || state.transferReceived || state.transferNet || !state.transferSection?.includes("EUR")) failures.push(`${state.name}: missing transfer FX presented as complete`);
      if (!state.flowResult?.includes("2,000")) failures.push(`${state.name}: missing transfer FX hides ordinary flow`);
      continue;
    }
    if (state.transferCase === "long") continue;
    const expected = state.transferCase === "incoming" ? [0, 500, 500]
      : state.transferCase === "outgoing" ? [2500, 0, -2500]
      : state.transferCase === "balanced" ? [2500, 2500, 0]
      : state.transferCase === "fractional" ? [0.3, 0.3, 0]
      : state.transferCase === "history" ? [500, 100, -400] : [2500, 500, -2000];
    const actual = [state.transferSent, state.transferReceived, state.transferNet].map((text) => number(text, state.scenario === "russian"));
    if (actual.some((value, index) => value !== expected[index])) failures.push(`${state.name}: unexpected sent/received/net ${actual.join("/")}`);
    if (expected[2] > 0 && !state.transferNet?.includes("+")) failures.push(`${state.name}: positive net lacks explicit sign`);
    if (expected[2] === 0 && /[+-]/.test(state.transferNet ?? "")) failures.push(`${state.name}: balanced net has a false sign`);
    if (state.transferCase === "only" && !state.flowResult?.includes("No income or expenses")) failures.push(`${state.name}: transfers changed ordinary monthly result`);
    if (["both", "balanced", "incoming", "outgoing"].includes(state.transferCase) && state.scenario !== "russian" && !state.flowResult?.includes("2,000")) failures.push(`${state.name}: transfers changed ordinary result`);
  }
  return failures;
}

export const visualQaConfig = {
  ...dashboard, outputDir, states, createApiHandler, collectAdditionalFailures,
  label: "Personal dashboard transfers", userDataPrefix: "inex-personal-transfers-qa", defaultPort: 53147,
  runState: (args) => { activeCase = args.state.transferCase; return dashboard.runState(args); },
  buildSummary: ({ stateResults, requestLog, unhandledApiRequests, failures }) => ({
    generatedAt: new Date().toISOString(), page: "personal-dashboard-transfers", dataMode: "fixture",
    harness: { realBackendCalled: false, apiIsolation: "All API requests intercepted; providers never called." },
    screenshots: stateResults.map((state) => state.screenshot), states: stateResults,
    apiRequests: requestLog, unhandledApiRequests, checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  }),
};
runVisualQaScript(import.meta.url, visualQaConfig);
