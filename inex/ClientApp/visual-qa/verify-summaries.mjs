import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(clientRoot, "../..");
const visualQaRoot = path.join(repoRoot, "docs/implementation/visual-qa");

const defaultMaxAgeHours = 24;

const canonicalSummaries = [
  {
    folder: "accounts",
    page: "accounts",
    routes: ["/accounts"],
    screenshots: [
      "populated-1440.png",
      "populated-flat-1024.png",
      "populated-390.png",
      "populated-360.png",
      "filter-empty-390.png",
      "first-use-empty-390.png",
      "drawer-open-390.png",
      "drawer-open-360.png",
      "expanded-row-1440.png",
      "expanded-row-390.png",
      "collapsed-group-1440.png",
      "collapsed-group-390.png",
      "load-error-390.png",
    ],
  },
  {
    folder: "auth",
    page: "auth",
    routes: ["/login", "/register"],
    screenshots: [
      "login-1440.png",
      "login-1024.png",
      "login-390.png",
      "login-360.png",
      "login-error-390.png",
      "register-1440.png",
      "register-1024.png",
      "register-390.png",
      "register-360.png",
      "register-form-filled-390.png",
      "register-error-390.png",
      "register-currency-error-390.png",
    ],
  },
  {
    folder: "budgets",
    page: "budgets",
    routes: ["/budgets?year=2026&month=4"],
    screenshots: [
      "populated-1440.png",
      "populated-amount-1024.png",
      "populated-390.png",
      "populated-360.png",
      "filter-empty-390.png",
      "first-use-empty-390.png",
      "drawer-open-390.png",
      "drawer-open-360.png",
      "expanded-row-1440.png",
      "expanded-row-390.png",
      "load-error-390.png",
    ],
  },
  {
    folder: "categories",
    page: "categories",
    routes: ["/categories"],
    screenshots: [
      "populated-1440.png",
      "populated-spend-1024.png",
      "populated-390.png",
      "populated-360.png",
      "filter-empty-390.png",
      "first-use-empty-390.png",
      "drawer-open-390.png",
      "drawer-open-360.png",
      "expanded-row-1440.png",
      "expanded-row-390.png",
      "load-error-390.png",
    ],
  },
  {
    folder: "dashboard",
    page: "dashboard",
    routes: ["/dashboard"],
    screenshots: [
      "populated-1440.png",
      "populated-1024.png",
      "populated-390.png",
      "populated-360.png",
      "first-use-empty-390.png",
      "summary-error-390.png",
      "net-worth-error-390.png",
    ],
  },
  {
    folder: "hero-consistency",
    page: "hero-consistency",
    routes: ["/transactions", "/accounts", "/categories", "/budgets?year=2026&month=4", "/dashboard"],
    screenshots: [
      "transactions-hero-1440.png",
      "accounts-hero-1440.png",
      "categories-hero-1440.png",
      "budgets-hero-1440.png",
      "dashboard-hero-1440.png",
      "transactions-hero-390.png",
      "accounts-hero-390.png",
      "categories-hero-390.png",
      "budgets-hero-390.png",
      "dashboard-hero-390.png",
    ],
  },
  {
    folder: "profile",
    page: "profile",
    routes: ["/profile"],
    screenshots: [
      "populated-1440.png",
      "populated-1024.png",
      "populated-390.png",
      "populated-360.png",
      "profile-form-edit-390.png",
      "security-form-filled-390.png",
      "currency-error-390.png",
      "profile-update-error-390.png",
    ],
  },
  {
    folder: "reports",
    page: "reports",
    routes: [
      "/reports",
      "/reports/category?interval=2026-04",
      "/reports/budget?interval=2026-04",
      "/reports/history?year=2026",
      "/reports/heatmap?interval=2026-04",
    ],
    screenshots: [
      "hub-populated-1440.png",
      "hub-populated-1024.png",
      "hub-populated-390.png",
      "hub-populated-360.png",
      "category-report-1440.png",
      "category-empty-390.png",
      "budget-report-390.png",
      "budget-error-390.png",
      "history-report-1440.png",
      "heatmap-report-390.png",
      "heatmap-error-390.png",
    ],
  },
  {
    folder: "transactions",
    page: "transactions",
    routes: ["/transactions"],
    screenshots: [
      "populated-1440.png",
      "populated-1024.png",
      "populated-390.png",
      "populated-360.png",
      "filter-empty-390.png",
      "first-use-empty-390.png",
      "drawer-open-390.png",
      "drawer-open-360.png",
      "expanded-row-1440.png",
      "expanded-row-390.png",
      "load-error-390.png",
    ],
  },
];

function parseArgs(argv) {
  const options = {
    maxAgeHours: defaultMaxAgeHours,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    const maxAgeMatch = arg.match(/^--max-age-hours=(\d+(?:\.\d+)?)$/);
    if (maxAgeMatch) {
      options.maxAgeHours = Number(maxAgeMatch[1]);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isFinite(options.maxAgeHours) || options.maxAgeHours <= 0) {
    throw new Error("--max-age-hours must be a positive number.");
  }

  return options;
}

function relativeFromRepo(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
}

function readSummary(summaryPath) {
  try {
    return JSON.parse(readFileSync(summaryPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON: ${error.message}`);
  }
}

function routeMatches(actualRoute, expectedRoute) {
  return actualRoute === expectedRoute;
}

function inferRouteCoverage(summary, expectedRoute) {
  if (summary.page === "hero-consistency") {
    const routePage = expectedRoute.split(/[/?]/).filter(Boolean)[0];
    return Array.isArray(summary.states) && summary.states.some((state) => state.page === routePage);
  }

  if (summary.page === "budgets" && expectedRoute.startsWith("/budgets")) {
    return true;
  }

  return expectedRoute === `/${summary.page}`;
}

function collectStateRoutes(summary) {
  if (!Array.isArray(summary.states)) {
    return [];
  }

  return summary.states
    .map((state) => state.routePath)
    .filter((routePath) => typeof routePath === "string" && routePath.length > 0);
}

function validateSummary(config, options, now) {
  const folderPath = path.join(visualQaRoot, config.folder);
  const summaryPath = path.join(folderPath, "qa-summary.json");
  const issues = [];

  if (!existsSync(summaryPath)) {
    return {
      folder: config.folder,
      generatedAt: null,
      screenshotCount: 0,
      issues: [`missing ${relativeFromRepo(summaryPath)}`],
    };
  }

  let summary;
  try {
    summary = readSummary(summaryPath);
  } catch (error) {
    return {
      folder: config.folder,
      generatedAt: null,
      screenshotCount: 0,
      issues: [`${relativeFromRepo(summaryPath)}: ${error.message}`],
    };
  }

  if (summary.page !== config.page) {
    issues.push(`page expected ${config.page}, got ${summary.page ?? "missing"}`);
  }

  if (summary.dataMode !== "fixture") {
    issues.push(`dataMode expected fixture, got ${summary.dataMode ?? "missing"}`);
  }

  if (summary.harness?.realBackendCalled !== false) {
    issues.push("harness.realBackendCalled must be false");
  }

  if (summary.checks?.hasFailures !== false) {
    issues.push("checks.hasFailures must be false");
  }

  if (!Array.isArray(summary.unhandledApiRequests) || summary.unhandledApiRequests.length !== 0) {
    issues.push("unhandledApiRequests must be []");
  }

  if (!Array.isArray(summary.states) || summary.states.length === 0) {
    issues.push("states must be a non-empty array");
  } else {
    const nonFixtureState = summary.states.find((state) => state.dataMode !== "fixture");
    if (nonFixtureState) {
      issues.push(`state ${nonFixtureState.name ?? "unknown"} dataMode must be fixture`);
    }
  }

  const generatedAt = typeof summary.generatedAt === "string" ? new Date(summary.generatedAt) : null;
  if (!generatedAt || Number.isNaN(generatedAt.valueOf())) {
    issues.push("generatedAt must be a valid ISO timestamp");
  } else {
    const ageHours = (now.valueOf() - generatedAt.valueOf()) / 3_600_000;
    if (ageHours < -0.05) {
      issues.push(`generatedAt is in the future: ${summary.generatedAt}`);
    } else if (ageHours > options.maxAgeHours) {
      issues.push(`summary is stale: ${ageHours.toFixed(1)}h old, max ${options.maxAgeHours}h`);
    }
  }

  const summaryScreenshots = Array.isArray(summary.screenshots) ? new Set(summary.screenshots) : new Set();
  if (!Array.isArray(summary.screenshots)) {
    issues.push("screenshots must be an array");
  }

  for (const screenshot of config.screenshots) {
    if (!summaryScreenshots.has(screenshot)) {
      issues.push(`summary missing screenshot entry ${screenshot}`);
    }

    const screenshotPath = path.join(folderPath, screenshot);
    if (!existsSync(screenshotPath)) {
      issues.push(`missing screenshot file ${relativeFromRepo(screenshotPath)}`);
      continue;
    }

    const stats = statSync(screenshotPath);
    if (!stats.isFile() || stats.size === 0) {
      issues.push(`screenshot file is empty ${relativeFromRepo(screenshotPath)}`);
    }
  }

  const stateScreenshots = Array.isArray(summary.states)
    ? new Set(summary.states.map((state) => state.screenshot).filter(Boolean))
    : new Set();
  for (const screenshot of config.screenshots) {
    if (!stateScreenshots.has(screenshot)) {
      issues.push(`states missing screenshot reference ${screenshot}`);
    }
  }

  const explicitRoutes = collectStateRoutes(summary);
  for (const expectedRoute of config.routes) {
    const hasExplicitMatch = explicitRoutes.some((route) => routeMatches(route, expectedRoute));
    if (!hasExplicitMatch && !inferRouteCoverage(summary, expectedRoute)) {
      issues.push(`missing required route ${expectedRoute}`);
    }
  }

  return {
    folder: config.folder,
    generatedAt: summary.generatedAt ?? null,
    screenshotCount: config.screenshots.length,
    issues,
  };
}

function printHelp() {
  process.stdout.write(`Usage: node visual-qa/verify-summaries.mjs [--max-age-hours=24]\n`);
}

function printResults(results, options) {
  const failed = results.filter((result) => result.issues.length > 0);
  const screenshotCount = results.reduce((total, result) => total + result.screenshotCount, 0);

  if (failed.length === 0) {
    process.stdout.write("PASS visual QA summaries\n");
    process.stdout.write(`folders: ${results.length} canonical, screenshots: ${screenshotCount}, freshness: <= ${options.maxAgeHours}h\n`);
    process.stdout.write(`summaries: ${results.map((result) => result.folder).join(", ")}\n`);
    return;
  }

  process.stdout.write("FAIL visual QA summaries\n");
  process.stdout.write(`folders: ${results.length} canonical, failed: ${failed.length}, freshness: <= ${options.maxAgeHours}h\n`);
  for (const result of failed) {
    process.stdout.write(`- ${result.folder}: ${result.issues.join("; ")}\n`);
  }
  process.stdout.write("Run npm run visual-qa:all, then npm run visual-qa:verify.\n");
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const results = canonicalSummaries.map((config) => validateSummary(config, options, new Date()));
  printResults(results, options);

  if (results.some((result) => result.issues.length > 0)) {
    process.exit(1);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
