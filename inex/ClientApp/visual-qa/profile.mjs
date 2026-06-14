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
  setInputValue,
  wait,
  waitFor,
} from "./harness.mjs";

const { clientRoot, repoRoot } = resolveVisualQaPaths(import.meta.url);
const outputDir = path.join(repoRoot, "docs/implementation/visual-qa/profile");
const fixturePath = path.join(clientRoot, "src/test/fixtures/profileVisualFixture.ts");

const defaultViewportHeight = 900;

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
    name: "profile-form-edit-390",
    screenshot: "profile-form-edit-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "edit-profile-fields",
  },
  {
    name: "security-form-filled-390",
    screenshot: "security-form-filled-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "populated",
    interaction: "fill-security-fields",
  },
  {
    name: "currency-error-390",
    screenshot: "currency-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "currency-error",
  },
  {
    name: "profile-update-error-390",
    screenshot: "profile-update-error-390.png",
    viewport: { width: 390, height: defaultViewportHeight },
    scenario: "profile-update-error",
    interaction: "submit-profile-error",
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
        return jsonResponse(scenario === "profile-updated"
          ? fixture.profileVisualFixtureUpdatedUser
          : fixture.profileVisualFixtureUser);
      }
      if (url.pathname === "/api/currencies" && method === "GET") {
        if (scenario === "currency-error") {
          return problemResponse("Profile currencies fixture failure", "Could not load currencies.", 500);
        }
        return jsonResponse(fixture.profileVisualFixtureCurrencies);
      }
      if (url.pathname.startsWith("/api/exchange/rates/") && method === "GET") {
        return jsonResponse({ data: fixture.profileVisualFixtureRates });
      }
      if (url.pathname === "/api/auth/me" && method === "PUT") {
        if (scenario === "profile-update-error") {
          return problemResponse("Profile update fixture failure", "Controlled Profile update failure.", 500);
        }
        scenarioRef.current = "profile-updated";
        return jsonResponse({ accessToken: "visual-qa-token-updated", expiresIn: 3600 });
      }
      if (url.pathname === "/api/auth/change-password" && method === "POST") {
        return jsonResponse({});
      }
      if (url.pathname === "/api/auth/logout" && method === "POST") {
        return jsonResponse({});
      }
      return null;
    },
  });
}

async function applyInteraction(client, state) {
  switch (state.interaction) {
    case "edit-profile-fields":
      await setInputValue(client, "input[autocomplete='username']", "QA Visual");
      await waitFor(client, "document.querySelector(\"input[autocomplete='username']\")?.value === 'QA Visual'");
      return;
    case "fill-security-fields":
      await evaluate(client, clickButtonByTextExpression("Security"));
      await waitFor(client, "document.body.innerText.includes('Password update')");
      await setInputValue(client, "input[name='currentPassword']", "CurrentPass1!");
      await setInputValue(client, "input[name='newPassword']", "StrongPass1!");
      await setInputValue(client, "input[name='confirmPassword']", "StrongPass1!");
      await waitFor(client, "document.body.innerText.includes('Strength: strong')");
      return;
    case "submit-profile-error":
      await setInputValue(client, "input[autocomplete='username']", "QA Visual");
      await evaluate(client, clickButtonByTextExpression("Save profile"));
      await waitFor(client, "document.body.innerText.includes('Failed to update profile.')");
      return;
    case undefined:
      return;
    default:
      throw new Error(`Unknown interaction: ${state.interaction}`);
  }
}

async function waitForProfileReady(client, state) {
  await waitFor(client, "document.body.innerText.includes('Profile & Settings')");

  if (state.scenario === "currency-error") {
    await waitFor(client, "document.body.innerText.includes('Could not load currencies.')");
    return;
  }

  await waitFor(client, "document.body.innerText.includes('Profile details') && document.body.innerText.includes('Password update') && document.body.innerText.includes('USD - US Dollar')");
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
    const content = document.querySelector(".profile-workspace, .profile-content");
    const contentRect = content ? content.getBoundingClientRect() : null;
    const drawer = document.querySelector(".ant-drawer-content-wrapper");
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    const tabs = Array.from(document.querySelectorAll(".profile-tabs button"));
    const cards = Array.from(document.querySelectorAll(".profile-card"));
    const forms = Array.from(document.querySelectorAll(".profile-form"));
    const overviewMetrics = Array.from(document.querySelectorAll(".profile-overview__metrics > div"));
    const alerts = Array.from(document.querySelectorAll(".profile-alert, .ant-alert"));
    const visibleInputs = Array.from(document.querySelectorAll(".profile-form input, .profile-form .ant-select"))
      .filter((item) => item.getBoundingClientRect().width > 0);
    const activeTab = document.querySelector(".profile-tabs button.is-active");
    const passwordStrength = document.querySelector(".profile-strength [role='progressbar']");

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
      tabCount: tabs.length,
      cardCount: cards.length,
      formCount: forms.length,
      overviewMetricCount: overviewMetrics.length,
      alertCount: alerts.length,
      visibleControlCount: visibleInputs.length,
      activeTabText: activeTab ? activeTab.textContent.trim() : null,
      usernameEdited: document.querySelector("input[autocomplete='username']")?.value === "QA Visual",
      passwordStrengthValue: passwordStrength ? Number(passwordStrength.getAttribute("aria-valuenow")) : null,
      currencyErrorVisible: document.body.innerText.includes("Could not load currencies."),
      profileUpdateErrorVisible: document.body.innerText.includes("Failed to update profile."),
      securityFieldsFilled: Array.from(document.querySelectorAll("input[name='currentPassword'], input[name='newPassword'], input[name='confirmPassword']"))
        .every((input) => input.value.length > 0),
      accountCopyVisible: document.body.innerText.includes("Profile details") && document.body.innerText.includes("Language and currency"),
      securityCopyVisible: document.body.innerText.includes("Password update") && document.body.innerText.includes("Password guidance"),
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
    routePath: "/profile",
    initScript: fixedDateInitScript(args.fixture.profileVisualFixtureMeta.fixedNow, "en"),
    waitForReady: waitForProfileReady,
    applyInteraction,
    collectMetrics,
  });
}

function collectAdditionalFailures(stateResults) {
  const fixture = fixtureExports;
  const meta = fixture.profileVisualFixtureMeta;
  const failures = [];

  for (const state of stateResults) {
    if (state.scenario !== "populated") continue;

    if (state.tabCount !== meta.expectedTabCount) {
      failures.push(`${state.name}: expected ${meta.expectedTabCount} profile tabs, found ${state.tabCount}`);
    }
    if (state.cardCount !== meta.expectedCardCount) {
      failures.push(`${state.name}: expected ${meta.expectedCardCount} profile cards, found ${state.cardCount}`);
    }
    if (state.formCount !== meta.expectedFormCount) {
      failures.push(`${state.name}: expected ${meta.expectedFormCount} forms, found ${state.formCount}`);
    }
    if (state.overviewMetricCount !== meta.expectedOverviewMetricCount) {
      failures.push(`${state.name}: expected ${meta.expectedOverviewMetricCount} overview metrics, found ${state.overviewMetricCount}`);
    }
    if (!state.accountCopyVisible || !state.securityCopyVisible) {
      failures.push(`${state.name}: expected account and security copy to be visible`);
    }
  }

  const profileEditState = stateResults.find((state) => state.name === "profile-form-edit-390");
  if (!profileEditState?.usernameEdited) {
    failures.push("profile-form-edit-390: expected edited username field");
  }

  const securityState = stateResults.find((state) => state.name === "security-form-filled-390");
  if (!securityState?.securityFieldsFilled || securityState.passwordStrengthValue < 4) {
    failures.push("security-form-filled-390: expected filled password fields with strong password meter");
  }

  const currencyErrorState = stateResults.find((state) => state.name === "currency-error-390");
  if (!currencyErrorState?.currencyErrorVisible) {
    failures.push("currency-error-390: expected controlled currency error alert");
  }

  const profileUpdateErrorState = stateResults.find((state) => state.name === "profile-update-error-390");
  if (!profileUpdateErrorState?.profileUpdateErrorVisible) {
    failures.push("profile-update-error-390: expected controlled profile update error alert");
  }

  return failures;
}

function buildSummary({ stateResults, requestLog, unhandledApiRequests, failures, clientRoot: root }) {
  const fixture = fixtureExports;
  const meta = fixture.profileVisualFixtureMeta;

  return {
    generatedAt: new Date().toISOString(),
    page: "profile",
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
      source: "inex/ClientApp/src/test/fixtures/profileVisualFixture.ts",
      baseline: meta.baseline,
      expectedTabCount: meta.expectedTabCount,
      expectedCardCount: meta.expectedCardCount,
      expectedFormCount: meta.expectedFormCount,
      expectedOverviewMetricCount: meta.expectedOverviewMetricCount,
      expectedCurrencyCount: meta.expectedCurrencyCount,
      nonApplicableStates: meta.nonApplicableStates,
    },
    screenshots: stateResults.map((state) => state.screenshot),
    apiRequests: requestLog,
    unhandledApiRequests,
    states: stateResults,
    checks: buildCommonChecks(stateResults, failures, unhandledApiRequests),
  };
}

const fixtureExports = loadFixture(fixturePath, `Profile fixture is missing: ${fixturePath}`);

export const visualQaConfig = {
  clientRoot,
  repoRoot,
  outputDir,
  defaultPort: 5205,
  fixture: fixtureExports,
  states,
  createApiHandler,
  runState,
  buildSummary,
  collectAdditionalFailures,
  label: "Profile",
  userDataPrefix: "inex-profile-visual-qa",
};

runVisualQaScript(import.meta.url, visualQaConfig);
