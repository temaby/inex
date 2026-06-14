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

export function resolveVisualQaPaths(scriptImportMetaUrl) {
  const scriptDir = path.dirname(fileURLToPath(scriptImportMetaUrl));
  const clientRoot = path.resolve(scriptDir, "..");
  const repoRoot = path.resolve(clientRoot, "../..");

  return { clientRoot, repoRoot, scriptDir };
}

export function loadFixture(fixturePath, missingMessage) {
  const source = ts.sys.readFile(fixturePath);
  if (!source) {
    throw new Error(missingMessage);
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

export function jsonResponse(body, status = 200) {
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

export function problemResponse(title, detail, status) {
  return jsonResponse({
    type: "about:blank",
    title,
    status,
    detail,
  }, status);
}

export function createApiFixtureHandler({
  requestLog,
  unhandledApiRequests,
  scenarioRef,
  handleRequest,
}) {
  return async function handleApiRequest(event, client) {
    const url = new URL(event.request.url);
    const method = event.request.method;
    const route = `${method} ${url.pathname}${url.search}`;
    const loggedRoute = route.replace("/api", "");
    requestLog.push(loggedRoute);

    const response = handleRequest({
      url,
      method,
      route,
      loggedRoute,
      scenario: scenarioRef.current,
    }) ?? (() => {
      unhandledApiRequests.push(route);
      return problemResponse("Unhandled visual QA API fixture", route, 502);
    })();

    await client.send("Fetch.fulfillRequest", {
      requestId: event.requestId,
      ...response,
    });
  };
}

export async function wait(ms) {
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

async function launchBrowser(clientRoot, userDataPrefix = "inex-visual-qa") {
  const executable = findBrowserExecutable();
  const port = await getFreePort();
  const userDataDir = path.join(process.env.TEMP ?? clientRoot, `${userDataPrefix}-${process.pid}`);
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

export async function evaluate(client, expression, awaitPromise = false) {
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

export async function waitFor(client, predicateExpression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(client, predicateExpression)) {
      return;
    }
    await wait(100);
  }
  throw new Error(`Timed out waiting for browser condition: ${predicateExpression}`);
}

export function clickButtonByTextExpression(label) {
  return `(() => {
    const label = ${JSON.stringify(label)};
    const button = Array.from(document.querySelectorAll("button"))
      .find((item) => item.textContent && item.textContent.trim().includes(label));
    if (!button) return false;
    button.click();
    return true;
  })()`;
}

export function localeInitScript(language = "en") {
  return `localStorage.setItem('i18n_lang', ${JSON.stringify(language)});`;
}

export function fixedDateInitScript(fixedNow, language = "en") {
  return `
    ${localeInitScript(language)}
    (() => {
      const fixedNow = new Date(${JSON.stringify(fixedNow)}).valueOf();
      const NativeDate = Date;
      class FixedDate extends NativeDate {
        constructor(...args) {
          if (args.length === 0) {
            super(fixedNow);
            return;
          }
          super(...args);
        }
        static now() { return fixedNow; }
        static parse(value) { return NativeDate.parse(value); }
        static UTC(...args) { return NativeDate.UTC(...args); }
      }
      FixedDate.prototype = NativeDate.prototype;
      window.Date = FixedDate;
    })();
  `;
}

export async function captureScreenshot(client, filePath) {
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

export async function runBrowserState({
  browser,
  appUrl,
  state,
  fixture,
  apiHandler,
  scenarioRef,
  outputDir,
  routePath,
  initScript = localeInitScript(),
  waitForReady,
  applyInteraction,
  collectMetrics,
  interactionDelayMs = 250,
}) {
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
    source: initScript,
  });

  scenarioRef.current = state.scenario;
  const requestLogStart = fixture.requestLog.length;

  await client.send("Page.navigate", { url: `${appUrl}${routePath}` });
  await waitForReady(client, state, fixture);
  await applyInteraction(client, state, fixture);
  await wait(interactionDelayMs);

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

function collectCommonFailures(stateResults, unhandledApiRequests) {
  const failures = stateResults.flatMap((state) => {
    const stateFailures = [];
    const expectsMobileBottomNav = state.expectsMobileBottomNav !== false;
    if (state.hasHorizontalOverflow) {
      stateFailures.push(`${state.name}: horizontal overflow`);
    }
    if ([390, 360].includes(state.viewport.width) && expectsMobileBottomNav && !state.bottomNavVisible && !state.drawerOpen) {
      stateFailures.push(`${state.name}: mobile bottom nav not visible`);
    }
    if ([390, 360].includes(state.viewport.width) && expectsMobileBottomNav && state.bottomNavOccludesLastContent && !state.drawerOpen) {
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

  return failures;
}

export function buildCommonChecks(stateResults, failures, unhandledApiRequests) {
  return {
    hasFailures: failures.length > 0,
    failures,
    mobile390NoHorizontalOverflow: stateResults
      .filter((state) => state.viewport.width === 390)
      .every((state) => !state.hasHorizontalOverflow),
    mobile360NoHorizontalOverflow: stateResults
      .filter((state) => state.viewport.width === 360)
      .every((state) => !state.hasHorizontalOverflow),
    mobileBottomNavClear: stateResults
      .filter((state) => [390, 360].includes(state.viewport.width) && state.expectsMobileBottomNav !== false && !state.drawerOpen)
      .every((state) => state.bottomNavVisible && !state.bottomNavOccludesLastContent),
    fixtureModeAvoidedBackendApis: unhandledApiRequests.length === 0,
  };
}

export async function runVisualQa({
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort,
  fixture,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures = () => [],
  label,
  userDataPrefix,
}) {
  if (!WebSocket) {
    throw new Error("The visual QA harness requires a WebSocket client. The local ws package is missing.");
  }

  const requestLog = [];
  const unhandledApiRequests = [];
  const scenarioRef = { current: "populated" };
  const apiHandler = createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const vite = await createViteServer({
    root: clientRoot,
    mode: "test",
    server: {
      host: "127.0.0.1",
      port: Number(process.env.INEX_VISUAL_QA_PORT ?? defaultPort),
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

    browser = await launchBrowser(clientRoot, userDataPrefix);

    const stateResults = [];
    for (const state of states) {
      const stateFixture = {
        ...fixture,
        requestLog,
      };
      const result = await runState({
        browser,
        appUrl,
        state,
        fixture: stateFixture,
        apiHandler,
        scenarioRef,
        outputDir,
      });
      stateResults.push(result);
    }

    const failures = [
      ...collectCommonFailures(stateResults, unhandledApiRequests),
      ...collectAdditionalFailures(stateResults),
    ];
    const summary = buildSummary({
      stateResults,
      requestLog,
      unhandledApiRequests,
      failures,
      clientRoot,
    });

    await writeFile(path.join(outputDir, "qa-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

    if (failures.length > 0) {
      throw new Error(`Visual QA failed:\n${failures.join("\n")}`);
    }

    process.stdout.write(`${label} visual QA complete: ${path.relative(repoRoot, outputDir)}\n`);
  } finally {
    await browser?.close();
    await vite.close();
  }
}

export function playwrightInstalled(clientRoot) {
  return existsSync(path.join(clientRoot, "node_modules/playwright"));
}
