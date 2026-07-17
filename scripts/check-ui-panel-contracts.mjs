import { readFileSync } from "node:fs";

const app = readFileSync("app.js", "utf8");

const contracts = [
  "Dashboard data source",
  "SACCO registration data source",
  "Subscriptions data source",
  "Members data source",
  "Operations data source",
  "Reports data source",
  "Member portal data source",
  "Source",
  "Last sync",
  "Refresh backend data",
  "Refresh member data",
  "Java-backed",
  "API-backed",
  "Local demo",
  "could not refresh from the backend",
  "could not refresh from the member API",
  "Balances and requests will update",
  "Sync drafts",
  "pendingGuarantors",
  "notifications"
];

const missing = contracts.filter((text) => !app.includes(text));
if (missing.length) {
  console.error(`UI panel contract check failed. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`UI panel contract check passed (${contracts.length} source/sync markers).`);
