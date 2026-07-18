import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

const contracts = [
  "Login to your portal",
  "Register SACCO",
  "Forgot password",
  "Platform Administration Portal",
  "SACCO Administration Portal",
  "Member Self-Service Portal",
  "Refresh",
  "Export summary",
  "Total SACCOs",
  "SACCO application list",
  "Subscription list",
  "Member list",
  "Transaction list",
  "Loan application list",
  "Approval queue",
  "Operations command center",
  "Report catalogue",
  "Permission matrix",
  "SERVER-CONFIRMED BALANCES",
  "pendingGuarantors",
  "notifications"
];

const missing = contracts.filter((text) => !app.includes(text));
if (missing.length) {
  console.error(`UI panel contract check failed. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`UI production contract check passed (${contracts.length} markers).`);
