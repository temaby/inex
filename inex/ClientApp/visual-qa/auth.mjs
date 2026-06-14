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
  runVisualQa,
  wait,
  waitFor,
} from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/auth");
const fixturePath = path.join(clientRoot, "src/test/fixtures/authVisualFixture.ts");

const defaultViewportHeight = 900;

const states = [
  {
    name: "login-1440",
    screenshot: "login-1440.png",
    viewport: { width: 1440, height: 1000 },
    routePath: "/login",
    scenario: "login",
  },
  {
    name: "login-1024",
    screenshot: "login-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    routePath: "/login",
    scenario: "login",
  },
  {
    name: "login-390",
    screenshot: "login-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    routePath: "/login",
    scenario: "login",
  },
  {
    name: "login-360",
    screenshot: "login-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    routePath: "/login",
    scenario: "login",
  },
  {
    name: "login-error-390",
    screenshot: "login-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    routePath: "/login",
    scenario: "login-error",
    interaction: "submit-login-error",
  },
  {
    name: "register-1440",
    screenshot: "register-1440.png",
    viewport: { width: 1440, height: 1000 },
    routePath: "/register",
    scenario: "register",
  },
  {
    name: "register-1024",
    screenshot: "register-1024.png",
    viewport: { width: 1024, height: defaultViewportHeight },
    routePath: "/register",
    scenario: "register",
  },
  {
    name: "register-390",
    screenshot: "register-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    routePath: "/register",
    scenario: "register",
  },
  {
    name: "register-360",
    screenshot: "register-360.png",
    viewport: { width: 360, height: defaultViewportHeight },
    routePath: "/register",
    scenario: "register",
  },
  {
    name: "register-form-filled-390",
    screenshot: "register-form-filled-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    routePath: "/register",
    scenario: "register",
    interaction: "fill-register-form",
  },
  {
    name: "register-error-390",
    screenshot: "register-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    routePath: "/register",
    scenario: "register-error",
    interaction: "submit-register-error",
  },
  {
    name: "register-currency-error-390",
    screenshot: "register-currency-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    routePath: "/register",
    scenario: "currency-error",
  },
];

function createApiHandler(fixture, requestLog, unhandledApiRequests, scenarioRef) {
  return createApiFixtureHandler({
    requestLog,
    unhandledApiRequests,
    scenarioRef,
    handleRequest: ({ url, method, scenario }) => {
      if (url.pathname === "/api/auth/refresh" && method === "POST") {
        return problemResponse("No visual QA auth session", "No fixture session is restored for public auth routes.", 401);
      }
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return jsonResponse(fixture.authVisualFixtureUser);
      }
      if (url.pathname === "/api/currencies" && method === "GET") {
        if (scenario === "currency-error") {
          return problemResponse("Currencies fixture failure", "Currency is invalid", 500);
        }
        return jsonResponse(fixture.authVisualFixtureCurrencies);
      }
      if (url.pathname === "/api/auth/login" && method === "POST") {
        if (scenario === "login-error") {
          return problemResponse("Invalid credentials", "Invalid credentials", 401);
        }
        return jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
      }
      if (url.pathname === "/api/auth/register" && method === "POST") {
        if (scenario === "register-error") {
          return problemResponse("Invalid invite token", "Invite token is invalid or expired", 400);
        }
        return jsonResponse({ accessToken: "visual-qa-token", expiresIn: 3600 });
      }
      return null;
    },
  });
}

async function setInputValue(client, selector, value) {
  await evaluate(client, `(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
}

async function fillLoginForm(client) {
  await setInputValue(client, "input[name='email']", "qa@example.test");
  await setInputValue(client, "input[name='password']", "WrongPassword1!");
}

async function fillRegisterForm(client) {
  await setInputValue(client, "input[name='username']", "qa.visual");
  await setInputValue(client, "input[name='email']", "qa@example.test");
  await setInputValue(client, "input[name='new-password']", "StrongPass1!");
  await setInputValue(client, "input[name='new-password-confirm']", "StrongPass1!");
  await setInputValue(client, "input[name='invite-token']", "bad-token");
  await waitFor(client, "document.body.innerText.includes('Strong')");
}

async function applyInteraction(client, state) {
  switch (state.interaction) {
    case "submit-login-error":
      await fillLoginForm(client);
      await evaluate(client, clickButtonByTextExpression("Sign In"));
      await waitFor(client, "document.body.innerText.includes('Invalid credentials')");
      return;
    case "fill-register-form":
      await fillRegisterForm(client);
      return;
    case "submit-register-error":
      await fillRegisterForm(client);
      await evaluate(client, clickButtonByTextExpression("Create Account"));
      await waitFor(client, "document.body.innerText.includes('Invite token is invalid or expired')");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function waitForAuthReady(client, state) {
  const isRegister = state.routePath === "/register";
  await waitFor(client, isRegister
    ? "document.body.innerText.includes('Create your InEx account')"
    : "document.body.innerText.includes('Sign in to InEx')");

  if (state.scenario === "currency-error") {
    await waitFor(client, "document.body.innerText.includes('Please select a valid currency')");
    return;
  }

  if (isRegister) {
    await waitFor(client, "document.body.innerText.includes('Create Account') && document.body.innerText.includes('EUR - Euro')");
    return;
  }

  await waitFor(client, "document.body.innerText.includes('Sign In') && Boolean(document.querySelector(\"input[name='email']\"))");
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
    const content = document.querySelector(".r-auth-shell, .r-auth-form-wrap, .r-auth-form-panel");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const brand = document.querySelector(".r-auth-brand");
    const brandStyle = brand ? window.getComputedStyle(brand) : null;
    const mobileLogo = document.querySelector(".r-auth-mobile-logo");
    const mobileLogoStyle = mobileLogo ? window.getComputedStyle(mobileLogo) : null;
    const form = document.querySelector(".r-auth-form-panel form");
    const features = Array.from(document.querySelectorAll(".r-auth-feature"));
    const alerts = Array.from(document.querySelectorAll("[role='alert']"));
    const passwordSegments = Array.from(document.querySelectorAll(".auth-password-strength__segment"));
    const selectedCurrency = document.querySelector(".ant-select-selection-item");

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
      expectsMobileBottomNav: false,
      routePath: ${JSON.stringify(state.routePath)},
      brandVisible: Boolean(brand && brandStyle && brandStyle.display !== "none" && brand.getBoundingClientRect().width > 0),
      mobileLogoVisible: Boolean(mobileLogo && mobileLogoStyle && mobileLogoStyle.display !== "none" && mobileLogo.getBoundingClientRect().width > 0),
      featureCount: features.length,
      formCount: form ? 1 : 0,
      inputCount: Array.from(document.querySelectorAll(".r-auth-form-panel input")).length,
      submitButtonCount: Array.from(document.querySelectorAll(".r-auth-form-panel button[type='submit']")).length,
      alertCount: alerts.length,
      passwordStrengthSegmentCount: passwordSegments.length,
      selectedCurrencyText: selectedCurrency ? selectedCurrency.textContent.trim() : null,
      loginCopyVisible: document.body.innerText.includes("Sign in to InEx") && document.body.innerText.includes("Use your account credentials"),
      registerCopyVisible: document.body.innerText.includes("Create your InEx account") && document.body.innerText.includes("Bring your accounts together"),
      loginErrorVisible: document.body.innerText.includes("Invalid credentials"),
      registerErrorVisible: document.body.innerText.includes("Invite token is invalid or expired"),
      currencyErrorVisible: document.body.innerText.includes("Please select a valid currency"),
      registerFormFilled: document.querySelector("input[name='username']")?.value === "qa.visual"
        && document.querySelector("input[name='email']")?.value === "qa@example.test"
        && document.querySelector("input[name='new-password']")?.value.length > 0
        && document.querySelector("input[name='new-password-confirm']")?.value.length > 0
        && document.querySelector("input[name='invite-token']")?.value.length > 0,
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
  return runBrowserState({
    ...args,
    routePath: args.state.routePath,
    initScript: fixedDateInitScript(args.fixture.authVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForAuthReady,
    applyInteraction,
    collectMetrics,
  });
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;
  const pageFailures = failures;
  const meta = fixture.authVisualFixtureMeta;

  for (const state of stateResults) {
    if (state.routePath === "/login") {
      if (state.formCount !== meta.expectedLoginFormCount) {
        pageFailures.push(`${state.name}: expected ${meta.expectedLoginFormCount} login form, found ${state.formCount}`);
      }
      if (!state.loginCopyVisible) {
        pageFailures.push(`${state.name}: expected login copy to be visible`);
      }
    }

    if (state.routePath === "/register") {
      if (state.formCount !== meta.expectedRegisterFormCount) {
        pageFailures.push(`${state.name}: expected ${meta.expectedRegisterFormCount} register form, found ${state.formCount}`);
      }
      if (!state.registerCopyVisible) {
        pageFailures.push(`${state.name}: expected register copy to be visible`);
      }
    }

    if (state.viewport.width >= 1024 && state.featureCount !== meta.expectedFeatureCount) {
      pageFailures.push(`${state.name}: expected ${meta.expectedFeatureCount} brand features, found ${state.featureCount}`);
    }
    if (state.viewport.width >= 1024 && !state.brandVisible) {
      pageFailures.push(`${state.name}: expected desktop brand panel to be visible`);
    }
    if ([390, 360].includes(state.viewport.width) && !state.mobileLogoVisible) {
      pageFailures.push(`${state.name}: expected mobile auth logo to be visible`);
    }
  }

  const loginErrorState = stateResults.find((state) => state.name === "login-error-390");
  if (!loginErrorState?.loginErrorVisible) {
    pageFailures.push("login-error-390: expected controlled invalid credentials alert");
  }

  const registerFilledState = stateResults.find((state) => state.name === "register-form-filled-390");
  if (!registerFilledState?.registerFormFilled || registerFilledState.passwordStrengthSegmentCount !== 5) {
    pageFailures.push("register-form-filled-390: expected filled register form with password strength meter");
  }

  const registerErrorState = stateResults.find((state) => state.name === "register-error-390");
  if (!registerErrorState?.registerErrorVisible) {
    pageFailures.push("register-error-390: expected controlled invite-token error alert");
  }

  const currencyErrorState = stateResults.find((state) => state.name === "register-currency-error-390");
  if (!currencyErrorState?.currencyErrorVisible) {
    pageFailures.push("register-currency-error-390: expected controlled currency error");
  }

  return {
    generatedAt: new Date().toISOString(),
    page: "auth",
    dataMode: "fixture",
    harness: {
      runner: "Node CDP headless browser",
      playwrightInstalled: playwrightInstalled(root),
      note: "Playwright is not installed in this project. This harness uses Chrome DevTools Protocol with request interception; add Playwright in a dedicated dependency PR if a Playwright suite is desired.",
      viteMode: "test",
      apiIsolation: "All /api requests are fulfilled by the harness; unhandled /api requests fail with status 502.",
      realBackendCalled: false,
      fixedNow: meta.fixedNow,
    },
    fixture: {
      source: "inex/ClientApp/src/test/fixtures/authVisualFixture.ts",
      baseline: meta.baseline,
      expectedFeatureCount: meta.expectedFeatureCount,
      expectedLoginFormCount: meta.expectedLoginFormCount,
      expectedRegisterFormCount: meta.expectedRegisterFormCount,
      expectedCurrencyCount: meta.expectedCurrencyCount,
      nonApplicableStates: meta.nonApplicableStates,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, pageFailures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Auth fixture is missing: ${fixturePath}`);

runVisualQa({
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5206,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  label: "Auth",
  userDataPrefix: "inex-auth-visual-qa",
}).catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
