import { createVisualQaEnvironment, runVisualQa } from "./harness.mjs";

import { visualQaConfig as accounts } from "./accounts.mjs";
import { visualQaConfig as auth } from "./auth.mjs";
import { visualQaConfig as budgets } from "./budgets.mjs";
import { visualQaConfig as categories } from "./categories.mjs";
import { visualQaConfig as dashboard } from "./dashboard.mjs";
import { visualQaConfig as heroConsistency } from "./hero-consistency.mjs";
import { visualQaConfig as profile } from "./profile.mjs";
import { visualQaConfig as reports } from "./reports.mjs";
import { visualQaConfig as transactions } from "./transactions.mjs";

const configs = [
  accounts,
  auth,
  budgets,
  categories,
  dashboard,
  heroConsistency,
  profile,
  reports,
  transactions,
];

const environment = await createVisualQaEnvironment({
  clientRoot: configs[0].clientRoot,
  defaultPort: 5210,
  userDataPrefix: "inex-visual-qa-suite",
});

try {
  for (const config of configs) {
    await runVisualQa({
      ...config,
      environment,
    });
  }
} catch (error) {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
} finally {
  await environment.close();
}
