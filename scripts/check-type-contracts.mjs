import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const [packageJson, tsconfig, declarations, stateSource] = await Promise.all([
  readJson("package.json"),
  readJson("tsconfig.ui.json"),
  readText("app.types.d.ts"),
  readText("app.state.js"),
]);

assert.equal(packageJson.scripts["type:ui"], "tsc -p tsconfig.ui.json");
assert.equal(packageJson.scripts["type:check"], "node scripts/check-type-contracts.mjs");
assert.equal(packageJson.scripts["type:evidence"], "node scripts/type-evidence.mjs");

assert.equal(tsconfig.compilerOptions.allowJs, true);
assert.equal(tsconfig.compilerOptions.checkJs, true);
assert.equal(tsconfig.compilerOptions.noEmit, true);
assert.equal(tsconfig.compilerOptions.noImplicitReturns, true);
assert.equal(tsconfig.compilerOptions.noFallthroughCasesInSwitch, true);
assert.ok(tsconfig.include.includes("app.types.d.ts"), "tsconfig.ui.json must include shared declarations");
assert.ok(tsconfig.include.includes("app*.js"), "tsconfig.ui.json must include classic frontend scripts");

for (const marker of [
  "interface TerekaState",
  "interface TerekaAppData",
  "interface TerekaMemberData",
  "interface TerekaMemberProfile",
  "interface TerekaPlatformUser",
  "interface TerekaTenantSummary",
  "interface TerekaSubscription",
  "interface TerekaFinancialTransaction",
  "interface TerekaLoan",
  "interface TerekaPaymentRequest",
  "interface TerekaPaymentLifecycleRow",
  "interface TerekaCollectionAccount",
  "interface TerekaComplaintThread",
  "interface TerekaChatMessage",
  "interface TerekaReconciliationData",
  "interface TerekaRegulatoryReport",
  "interface TerekaIntegrationConfig",
  "interface TerekaSecuritySummary",
  "interface TerekaQuickSearchResult",
]) {
  assert.ok(declarations.includes(marker), `app.types.d.ts missing ${marker}`);
}

assert.ok(stateSource.includes("/** @type {TerekaState} */"), "app.state.js must type the global state object");
assert.ok(declarations.includes("data: TerekaAppData;"), "TerekaState.data must use TerekaAppData");
assert.ok(declarations.includes("memberData: TerekaMemberData;"), "TerekaState.memberData must use TerekaMemberData");
assert.ok(declarations.includes("member: TerekaMemberProfile | null;"), "TerekaState.member must use TerekaMemberProfile");
assert.ok(declarations.includes("user: TerekaPlatformUser | null;"), "TerekaState.user must use TerekaPlatformUser");

console.log("Type contract check passed (SPA checkJs configuration, stricter options and domain declarations verified).");

async function readText(file) {
  return readFile(new URL(file, root), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}
