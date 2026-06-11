import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createRequire } from "node:module";

import { createServer as createViteServer } from "vite";

const require = createRequire(import.meta.url);
const WebSocket = require("ws");
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(clientRoot, "../..");
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/stage-4-accounts");
const fixturePath = path.join(clientRoot, "src/test/fixtures/accountsVisualFixture.ts");

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
    name: "populated-flat-1024",
    screenshot: "populated-flat-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "select-flat-view",
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
    interaction: "open-drawer",
  },
  {
    name: "drawer-open-360",
    screenshot: "drawer-open-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "open-drawer",
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
    name: "load-error-390",
    screenshot: "load-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "accounts-error",
  },
];

function loadFixture() {
  const source = ts.sys.readFile(fixturePath);
  if (!source) {
    throw new Error(`Accounts fixture is missing: ${fixturePath}`);
  }

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;

  const module = { exports: {} };
  const context = {
    exports: module.exports,
    module,
    require,
  };
  vm.runInNewContext(transpiled, context, { filename: fixturePath });

  return module.exports;
}

function withCurrencyNames(currencies) {
  return currencies.map((currency) => ({
    ...currency,
    name: currency.key,
  }));
}

function jsonResponse(body, status = 200) {
  return {
    responseCode: status,
    responseHeaders: [
      { name: "access-control-allow-origin", value: "*" },
      { name: "content-type", value: "application/json; charset=utf-8" },
      { name: "cache-control", value: "no-store" },
    ],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  };
}

function problemResponse(title, detail, status) {
  return jsonResponse({
    type: "about:blank",
    title,
    status,
    detail,
  }, status);
}

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  const currencies = withCurrencyNames(fixture.accountsVisualFixtureCurrencies);

  return async function handleApiRequest(event, client) {
    const url = new URL(event.request.url);
    const route = `${event.request.method} ${url.pathname}${url.search}`;
    requestLog.push(route.replace("/api", ""));

    let response;

    if (url.pathname === "/api/auth/refresh" && event.request.method === "POST") {
      response = jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
    } else if (url.pathname === "/api/auth/me" && event.request.method === "GET") {
      response = jsonResponse(authUser);
    } else if (url.pathname === "/api/currencies" && event.request.method === "GET") {
      response = jsonResponse(currencies);
    } else if (url.pathname.startsWith("/api/exchange/rates/") && event.request.method === "GET") {
      response = jsonResponse({ data: fixture.accountsVisualFixtureRates });
    } else if (url.pathname === "/api/accounts" && event.request.method === "GET") {
      if (scenarioRef.current === "accounts-error") {
        response = problemResponse("Accounts fixture failure", "Controlled Accounts load failure.", 500);
      } else {
        response = jsonResponse({
          data: scenarioRef.current === "empty" ? [] : fixture.accountsVisualFixtureAccounts,
        });
      }
    } else if (url.pathname === "/api/accounts/details" && event.request.method === "GET") {
      response = jsonResponse({
        data: scenarioRef.current === "empty" ? [] : fixture.accountsVisualFixtureSummaries,
      });
    } else {
      unhandledApiRequests.push(route);
      response = problemResponse("Unhandled visual QA API fixture", route, 599);
    }

    await client.send("Fetch.fulfillRequest", {
      requestId: event.requestId,
      ...response,
    });
  };
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Could not allocate a local port."));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, timeoutMs = 10000) {
  const started = Date.now();
  let lastError;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`HTTP ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
    }
    await wait(100);
  }

  throw lastError ?? new Error(`Timed out fetching ${url}`);
}

function candidateBrowserPaths() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ];

  return candidates.filter(Boolean);
}

function findBrowserExecutable() {
  const executable = candidateBrowserPaths().find((candidate) => existsSync(candidate));
  if (!executable) {
    throw new Error(
      "No headless Chromium browser was found. Set CHROME_PATH or EDGE_PATH, or add Playwright in a dedicated PR and run its browser install.",
    );
  }
  return executable;
}

class CdpClient {
  constructor(webSocketUrl, onEvent) {
    this.nextId = 1;
    this.pending = new Map();
    this.onEvent = onEvent;
    this.ws = new WebSocket(webSocketUrl);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.once("open", resolve);
      this.ws.once("error", reject);
    });

    this.ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          reject(new Error(`${message.error.message}: ${message.error.data ?? ""}`));
        } else {
          resolve(message.result ?? {});
        }
        return;
      }

      this.onEvent?.(message);
    });
  }

  async send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });

    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.ws.send(payload);
    return promise;
  }

  async close() {
    if (this.ws.readyState === WebSocket.CLOSED) {
      return;
    }

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.ws.terminate();
        resolve();
      }, 1000);

      this.ws.once("close", () => {
        clearTimeout(timeout);
        resolve();
      });

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      } else {
        this.ws.terminate();
      }
    });
  }
}

async function launchBrowser() {
  const executable = findBrowserExecutable();
  const port = await getFreePort();
  const userDataDir = path.join(process.env.TEMP ?? clientRoot, `inex-visual-qa-${process.pid}`);
  await mkdir(userDataDir, { recursive: true });

  const browserProcess = spawn(executable, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: "ignore",
    windowsHide: true,
  });
  browserProcess.unref();

  browserProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`Headless browser exited with code ${code}.\n`);
    }
  });

  await fetchJson(`http://127.0.0.1:${port}/json/version`);

  return {
    port,
    process: browserProcess,
    userDataDir,
    async close() {
      if (!browserProcess.killed && browserProcess.pid) {
        browserProcess.kill("SIGKILL");
        if (process.platform === "win32") {
          await new Promise((resolve) => {
            const taskkill = spawn("taskkill.exe", ["/pid", String(browserProcess.pid), "/t", "/f"], {
              stdio: "ignore",
              windowsHide: true,
            });
            taskkill.on("close", resolve);
            taskkill.on("error", resolve);
          });
        }
      }
      await rm(userDataDir, { recursive: true, force: true });
    },
  };
}

async function createPage(browserPort, onEvent) {
  const response = await fetch(`http://127.0.0.1:${browserPort}/json/new?about:blank`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Could not create browser tab: HTTP ${response.status}`);
  }
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl, onEvent);
  await client.open();
  return client;
}

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed.");
  }

  return result.result?.value;
}

async function waitFor(client, predicateExpression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(client, predicateExpression)) {
      return;
    }
    await wait(100);
  }
  throw new Error(`Timed out waiting for browser condition: ${predicateExpression}`);
}

function clickButtonByTextExpression(label) {
  return `(() => {
    const label = ${JSON.stringify(label)};
    const button = Array.from(document.querySelectorAll("button"))
      .find((item) => item.textContent && item.textContent.trim().includes(label));
    if (!button) return false;
    button.click();
    return true;
  })()`;
}

async function applyInteraction(client, state, fixtureMeta) {
  switch (state.interaction) {
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
    case "open-drawer":
      await evaluate(client, clickButtonByTextExpression("Add account"));
      await waitFor(client, "Boolean(document.querySelector('.ant-drawer-open'))");
      return;
    case "expand-first-row":
      await evaluate(client, `(() => {
        const row = document.querySelector(".accounts-row");
        if (!row) return false;
        row.click();
        return true;
      })()`);
      await waitFor(client, "document.body.innerText.includes('SNAPSHOT')");
      return;
    case "collapse-fixture-group":
      await evaluate(client, `(() => {
        const currency = ${JSON.stringify(fixtureMeta.collapsedStateCurrency)};
        const button = Array.from(document.querySelectorAll(".accounts-group__head"))
          .find((item) => item.textContent && item.textContent.includes(currency));
        if (!button) return false;
        button.click();
        return true;
      })()`);
      await waitFor(client, `(() => {
        const currency = ${JSON.stringify(fixtureMeta.collapsedStateCurrency)};
        const button = Array.from(document.querySelectorAll(".accounts-group__head"))
          .find((item) => item.textContent && item.textContent.includes(currency));
        return button && button.getAttribute("aria-expanded") === "false";
      })()`);
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
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
    const rows = Array.from(document.querySelectorAll(".accounts-row"));
    const groupButtons = Array.from(document.querySelectorAll(".accounts-group__head"));
    const collapsedGroups = groupButtons
      .filter((button) => button.getAttribute("aria-expanded") === "false")
      .map((button) => button.textContent.trim().replace(/\\s+/g, " ").slice(0, 80));

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
      maxRowHeight: rows.length ? Math.max(...rows.map((row) => row.getBoundingClientRect().height)) : null,
      collapsedGroups,
      loadErrorVisible: document.body.innerText.includes("Accounts could not be loaded"),
      filterEmptyVisible: document.body.innerText.includes("No accounts match"),
      firstUseEmptyVisible: document.body.innerText.includes("No accounts yet"),
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

async function captureScreenshot(client, filePath) {
  await evaluate(client, "window.scrollTo(0, 0)");
  await wait(100);

  const layout = await client.send("Page.getLayoutMetrics");
  const width = Math.ceil(layout.contentSize.width);
  const height = Math.ceil(layout.contentSize.height);
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  });
  await writeFile(filePath, Buffer.from(screenshot.data, "base64"));

  return { width, height };
}

async function runState({ browser, appUrl, state, fixture, apiHandler, scenarioRef }) {
  const stateRequestLog = [];
  const consoleMessages = [];
  let client;

  client = await createPage(browser.port, async (message) => {
    if (message.method === "Fetch.requestPaused") {
      await apiHandler(message.params, client);
    }
    if (message.method === "Runtime.consoleAPICalled") {
      consoleMessages.push(message.params.args.map((arg) => arg.value).filter(Boolean).join(" "));
    }
  });

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Fetch.enable", {
    patterns: [{ urlPattern: "*://127.0.0.1:*/api/*", requestStage: "Request" }],
  });
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: state.viewport.width,
    height: state.viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: "localStorage.setItem('i18n_lang', 'en');",
  });

  scenarioRef.current = state.scenario;
  const requestLogStart = fixture.requestLog.length;

  await client.send("Page.navigate", { url: `${appUrl}/accounts` });
  await waitFor(client, "document.body.innerText.includes('Accounts') || document.body.innerText.includes('No accounts yet')");

  if (state.scenario === "accounts-error") {
    await waitFor(client, "document.body.innerText.includes('Accounts could not be loaded')");
  } else if (state.scenario === "empty") {
    await waitFor(client, "document.body.innerText.includes('No accounts yet')");
  } else {
    await waitFor(client, "document.body.innerText.includes('UZS main wallet')");
  }

  await applyInteraction(client, state, fixture.accountsVisualFixtureMeta);
  await wait(250);

  stateRequestLog.push(...fixture.requestLog.slice(requestLogStart));

  const screenshotPath = path.join(outputDir, state.screenshot);
  const pngDimensions = await captureScreenshot(client, screenshotPath);
  const metrics = await collectMetrics(client, state, stateRequestLog.length);

  await client.close();

  return {
    ...metrics,
    pngDimensions,
    requestLog: stateRequestLog,
    consoleMessages: consoleMessages.filter(Boolean),
  };
}

async function main() {
  if (!WebSocket) {
    throw new Error("The visual QA harness requires a WebSocket client. The local ws package is missing.");
  }

  const fixtureExports = loadFixture();
  const requestLog = [];
  const unhandledApiRequests = [];
  const scenarioRef = { current: "populated" };
  const apiHandler = createApiHandler(fixtureExports, requestLog, unhandledApiRequests, scenarioRef);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const vite = await createViteServer({
    root: clientRoot,
    mode: "test",
    server: {
      host: "127.0.0.1",
      port: Number(process.env.INEX_VISUAL_QA_PORT ?? 5198),
      strictPort: false,
    },
    logLevel: "error",
  });

  let browser;
  try {
    await vite.listen();
    const appUrl = vite.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
    if (!appUrl) {
      throw new Error("Vite did not expose a local URL.");
    }

    browser = await launchBrowser();

    const stateResults = [];
    for (const state of states) {
      const stateFixture = {
        ...fixtureExports,
        requestLog,
      };
      const result = await runState({
        browser,
        appUrl,
        state,
        fixture: stateFixture,
        apiHandler,
        scenarioRef,
      });
      stateResults.push(result);
    }

    const failures = stateResults.flatMap((state) => {
      const stateFailures = [];
      if (state.hasHorizontalOverflow) {
        stateFailures.push(`${state.name}: horizontal overflow`);
      }
      if ([390, 360].includes(state.viewport.width) && !state.bottomNavVisible && !state.drawerOpen) {
        stateFailures.push(`${state.name}: mobile bottom nav not visible`);
      }
      if ([390, 360].includes(state.viewport.width) && state.bottomNavOccludesLastContent && !state.drawerOpen) {
        stateFailures.push(`${state.name}: bottom nav occludes final content`);
      }
      if (state.drawerOpen && state.drawerWithinViewport === false) {
        stateFailures.push(`${state.name}: drawer outside viewport`);
      }
      return stateFailures;
    });

    if (unhandledApiRequests.length > 0) {
      failures.push(`Unhandled API requests: ${unhandledApiRequests.join(", ")}`);
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      page: "accounts",
      dataMode: "fixture",
      harness: {
        runner: "Node CDP headless browser",
        playwrightInstalled: existsSync(path.join(clientRoot, "node_modules/playwright")),
        note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
        viteMode: "test",
        apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 599.",
        realBackendCalled: false,
      },
      fixture: {
        source: "inex/ClientApp/src/test/fixtures/accountsVisualFixture.ts",
        baseline: fixtureExports.accountsVisualFixtureMeta.baseline,
        expectedBaseCurrency: fixtureExports.accountsVisualFixtureMeta.expectedBaseCurrency,
        expectedNetWorth: fixtureExports.accountsVisualFixtureMeta.expectedNetWorth,
        expectedDistributionOrder: fixtureExports.accountsVisualFixtureMeta.expectedDistributionOrder,
        collapsedStateCurrency: fixtureExports.accountsVisualFixtureMeta.collapsedStateCurrency,
      },
      screenshots: stateResults.map((state) => state.screenshot),
      apiRequests: requestLog,
      unhandledApiRequests,
      states: stateResults,
      checks: {
        hasFailures: failures.length > 0,
        failures,
        mobile390NoHorizontalOverflow: stateResults
          .filter((state) => state.viewport.width === 390)
          .every((state) => !state.hasHorizontalOverflow),
        mobile360NoHorizontalOverflow: stateResults
          .filter((state) => state.viewport.width === 360)
          .every((state) => !state.hasHorizontalOverflow),
        mobileBottomNavClear: stateResults
          .filter((state) => [390, 360].includes(state.viewport.width) && !state.drawerOpen)
          .every((state) => state.bottomNavVisible && !state.bottomNavOccludesLastContent),
        fixtureModeAvoidedBackendApis: unhandledApiRequests.length === 0,
      },
    };

    await writeFile(path.join(outputDir, "qa-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

    if (failures.length > 0) {
      throw new Error(`Visual QA failed:\n${failures.join("\n")}`);
    }

    process.stdout.write(`Accounts visual QA complete: ${path.relative(repoRoot, outputDir)}\n`);
  } finally {
    await browser?.close();
    await vite.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
