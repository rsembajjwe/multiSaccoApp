import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const envFile = process.env.STAGING_ENV_FILE || ".env";
const required = [
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_PORT",
  "BACKEND_PORT",
  "SACCO_DEMO_LOGINS_ENABLED",
  "SACCO_AUTH_RATE_LIMIT_MAX_FAILURES",
  "SACCO_AUTH_RATE_LIMIT_WINDOW_SECONDS",
  "SACCO_SMS_PROVIDER",
  "SACCO_EMAIL_PROVIDER",
  "SACCO_MOBILE_MONEY_PROVIDER",
  "STAGING_UI_BASE_URL",
  "STAGING_API_BASE_URL"
];

const placeholderValues = new Set([
  "",
  "sacco",
  "sacco_dev_password",
  "replace_with_a_unique_staging_password",
  "password",
  "changeme",
  "change_me",
  "secret",
  "https://staging.example.com",
  "https://staging-api.example.com/api/v1"
]);

const values = { ...process.env };

if (existsSync(envFile)) {
  Object.assign(values, parseEnv(readFileSync(envFile, "utf8")));
} else if (!required.every((name) => process.env[name])) {
  fail(`Staging environment file not found: ${envFile}. Create it with Copy-Item deploy\\staging.env.example .env, then replace placeholders.`);
}

const failures = [];
const warnings = [];

for (const name of required) {
  const value = String(values[name] ?? "").trim();
  if (!value) {
    failures.push(`${name} is required.`);
  }
}

assertNotPlaceholder("POSTGRES_PASSWORD", failures);
assertNotPlaceholder("STAGING_UI_BASE_URL", failures);
assertNotPlaceholder("STAGING_API_BASE_URL", failures);

if (String(values.SACCO_DEMO_LOGINS_ENABLED).toLowerCase() !== "false") {
  failures.push("SACCO_DEMO_LOGINS_ENABLED must be false before staging handoff.");
}

if (String(values.POSTGRES_DB).toLowerCase().includes("dev")) {
  failures.push("POSTGRES_DB should not look like a development database.");
}

if (String(values.POSTGRES_USER).toLowerCase() === "sacco") {
  failures.push("POSTGRES_USER should be staging-specific, not the default sacco user.");
}

const postgresPassword = String(values.POSTGRES_PASSWORD ?? "");
if (postgresPassword.length < 16) {
  failures.push("POSTGRES_PASSWORD should be at least 16 characters for staging.");
}

for (const [name, min, max] of [
  ["POSTGRES_PORT", 1, 65535],
  ["BACKEND_PORT", 1, 65535],
  ["SACCO_AUTH_RATE_LIMIT_MAX_FAILURES", 1, 20],
  ["SACCO_AUTH_RATE_LIMIT_WINDOW_SECONDS", 10, 3600]
]) {
  const parsed = Number.parseInt(values[name], 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    failures.push(`${name} must be an integer between ${min} and ${max}.`);
  }
}

for (const name of ["STAGING_UI_BASE_URL", "STAGING_API_BASE_URL"]) {
  const value = String(values[name] ?? "");
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      failures.push(`${name} must use https for hosted staging.`);
    }
  } catch {
    failures.push(`${name} must be a valid URL.`);
  }
}

for (const name of ["SACCO_SMS_PROVIDER", "SACCO_EMAIL_PROVIDER", "SACCO_MOBILE_MONEY_PROVIDER"]) {
  if (String(values[name] ?? "").startsWith("demo_")) {
    warnings.push(`${name} is still a demo provider. This is acceptable for staging UAT only if recorded in release evidence.`);
  }
}

const gitignore = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
if (!/^\.env$/m.test(gitignore) || !/^\.env\.\*$/m.test(gitignore)) {
  failures.push(".gitignore must ignore .env and .env.*.");
}

const status = spawnSync("git", ["status", "--short", "--", ".env", ".env.*"], { encoding: "utf8" });
if (status.status === 0 && status.stdout.trim()) {
  failures.push(`Environment file appears in git status:\n${status.stdout.trim()}`);
}

if (failures.length > 0) {
  console.error("Staging preflight failed:");
  for (const failure of failures) console.error(`FAIL ${failure}`);
  if (warnings.length > 0) {
    for (const warning of warnings) console.warn(`WARN ${warning}`);
  }
  process.exit(1);
}

console.log(`Staging preflight passed using ${envFile}`);
console.log(`API: ${values.STAGING_API_BASE_URL}`);
console.log(`UI: ${values.STAGING_UI_BASE_URL}`);
console.log(`Database: ${values.POSTGRES_DB} as ${values.POSTGRES_USER}`);
console.log("Demo logins: disabled");
for (const warning of warnings) console.warn(`WARN ${warning}`);

function parseEnv(source) {
  const parsed = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function assertNotPlaceholder(name, targetFailures) {
  const value = String(values[name] ?? "").trim();
  const normalized = value.toLowerCase();
  if (placeholderValues.has(normalized) || normalized.startsWith("replace_with_")) {
    targetFailures.push(`${name} must be replaced with a real staging value.`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
