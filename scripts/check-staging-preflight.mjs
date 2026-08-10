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
  "SACCO_DOCUMENT_STORAGE_PROVIDER",
  "SACCO_DOCUMENT_STORAGE_LOCAL_ROOT",
  "SACCO_BOOTSTRAP_PLATFORM_ADMIN_FULL_NAME",
  "SACCO_BOOTSTRAP_PLATFORM_ADMIN_EMAIL",
  "SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD",
  "SACCO_MOBILE_MONEY_CALLBACK_SECRET",
  "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS",
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
assertNotPlaceholder("SACCO_BOOTSTRAP_PLATFORM_ADMIN_FULL_NAME", failures);
assertNotPlaceholder("SACCO_BOOTSTRAP_PLATFORM_ADMIN_EMAIL", failures);
assertNotPlaceholder("SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD", failures);
assertNotPlaceholder("SACCO_MOBILE_MONEY_CALLBACK_SECRET", failures);
assertNotPlaceholder("SACCO_DOCUMENT_STORAGE_LOCAL_ROOT", failures);

if (String(values.SACCO_DEMO_LOGINS_ENABLED).toLowerCase() !== "false") {
  failures.push("SACCO_DEMO_LOGINS_ENABLED must be false before staging handoff.");
}

if (String(values.SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS).toLowerCase() !== "true") {
  failures.push("SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS must be true before staging handoff.");
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
  const value = String(values[name] ?? "").trim().toLowerCase();
  if (placeholderValues.has(value) || value.startsWith("replace_with_")) {
    failures.push(`${name} must be replaced with a real provider id.`);
  }
  if (value.startsWith("demo_")) {
    failures.push(`${name} must not use a demo provider when demo logins are disabled.`);
  }
}

const documentStorageProvider = String(values.SACCO_DOCUMENT_STORAGE_PROVIDER ?? "").trim().toLowerCase();
if (documentStorageProvider !== "local_filesystem") {
  failures.push("SACCO_DOCUMENT_STORAGE_PROVIDER must be local_filesystem until a cloud object-store adapter is implemented.");
}
if (!String(values.SACCO_DOCUMENT_STORAGE_LOCAL_ROOT ?? "").trim()) {
  failures.push("SACCO_DOCUMENT_STORAGE_LOCAL_ROOT is required for KYC document disposal.");
}

const smsProvider = String(values.SACCO_SMS_PROVIDER ?? "").trim().toLowerCase();
if (smsProvider !== "afrosms") {
  failures.push("SACCO_SMS_PROVIDER must be afrosms for hosted staging.");
} else {
  assertProviderSettings([
    "SACCO_AFROSMS_EMAIL",
    "SACCO_AFROSMS_PASSWORD",
    "SACCO_AFROSMS_SOURCE"
  ], failures);
}

const emailProvider = String(values.SACCO_EMAIL_PROVIDER ?? "").trim().toLowerCase();
if (emailProvider !== "gmail_smtp") {
  failures.push("SACCO_EMAIL_PROVIDER must be gmail_smtp for hosted staging.");
} else {
  assertProviderSettings([
    "SACCO_GMAIL_SMTP_USERNAME",
    "SACCO_GMAIL_SMTP_PASSWORD",
    "SACCO_GMAIL_FROM_ADDRESS"
  ], failures);
}

const mobileMoneyProvider = String(values.SACCO_MOBILE_MONEY_PROVIDER ?? "").trim().toLowerCase();
const supportedMobileMoneyProviders = new Set(["mtn_momo", "airtel_money", "mpesa_daraja"]);
if (!supportedMobileMoneyProviders.has(mobileMoneyProvider)) {
  failures.push("SACCO_MOBILE_MONEY_PROVIDER must be one of: mtn_momo, airtel_money, mpesa_daraja.");
}
if (mobileMoneyProvider === "mtn_momo") {
  assertProviderSettings([
    "SACCO_MTN_MOMO_SUBSCRIPTION_KEY",
    "SACCO_MTN_MOMO_API_USER_ID",
    "SACCO_MTN_MOMO_API_KEY",
    "SACCO_MTN_MOMO_TARGET_ENVIRONMENT"
  ], failures);
}
if (mobileMoneyProvider === "airtel_money") {
  assertProviderSettings([
    "SACCO_AIRTEL_MONEY_CLIENT_ID",
    "SACCO_AIRTEL_MONEY_CLIENT_SECRET",
    "SACCO_AIRTEL_MONEY_COUNTRY_CODE"
  ], failures);
}
if (mobileMoneyProvider === "mpesa_daraja") {
  assertProviderSettings([
    "SACCO_MPESA_DARAJA_CONSUMER_KEY",
    "SACCO_MPESA_DARAJA_CONSUMER_SECRET",
    "SACCO_MPESA_DARAJA_BUSINESS_SHORT_CODE",
    "SACCO_MPESA_DARAJA_PASSKEY",
    "SACCO_MPESA_DARAJA_CALLBACK_URL"
  ], failures);
}

const bootstrapPassword = String(values.SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD ?? "");
if (bootstrapPassword.length < 10 || !/[A-Z]/.test(bootstrapPassword) || !/[a-z]/.test(bootstrapPassword) || !/[0-9]/.test(bootstrapPassword)) {
  failures.push("SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD must be at least 10 characters and include uppercase, lowercase, and a number.");
}

const callbackSecret = String(values.SACCO_MOBILE_MONEY_CALLBACK_SECRET ?? "");
if (callbackSecret.length < 24) {
  failures.push("SACCO_MOBILE_MONEY_CALLBACK_SECRET should be at least 24 characters for staging.");
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

function assertProviderSettings(names, targetFailures) {
  for (const name of names) {
    const value = String(values[name] ?? "").trim();
    const normalized = value.toLowerCase();
    if (!value) {
      targetFailures.push(`${name} is required for ${values.SACCO_MOBILE_MONEY_PROVIDER}.`);
    } else if (placeholderValues.has(normalized) || normalized.startsWith("replace_with_")) {
      targetFailures.push(`${name} must be replaced with a real provider value.`);
    }
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
