import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envFile = process.env.DEPLOYMENT_ENV_FILE || process.env.STAGING_ENV_FILE || ".env";
const reportDir = join(repoRoot, "reports", "deployment-evidence");
const values = loadValues(envFile);

const preflight = spawnSync(
  process.execPath,
  ["scripts/check-staging-preflight.mjs"],
  {
    cwd: repoRoot,
    env: { ...process.env, STAGING_ENV_FILE: envFile },
    encoding: "utf8"
  }
);

if (preflight.stdout.trim()) process.stdout.write(preflight.stdout);
if (preflight.stderr.trim()) process.stderr.write(preflight.stderr);
if (preflight.status !== 0) {
  process.exit(preflight.status ?? 1);
}

mkdirSync(reportDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `deployment-evidence-${stamp}.md`);
const report = [
  "# Tereka Online Deployment Evidence",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Environment file: ${envFile}`,
  "",
  "## Result",
  "",
  "- Preflight: PASS",
  "- Docker required: no",
  "- Demo logins: disabled",
  "- Provider values: real provider IDs required",
  "- Callback signing: required",
  "",
  "## Redacted Configuration",
  "",
  "| Name | Value |",
  "| --- | --- |",
  ...[
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
    "SACCO_BOOTSTRAP_PLATFORM_ADMIN_PHONE",
    "SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD",
    "SACCO_MOBILE_MONEY_CALLBACK_SECRET",
    "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS",
    "SACCO_MOBILE_MONEY_CALLBACK_TIMESTAMP_TOLERANCE_SECONDS",
    "STAGING_UI_BASE_URL",
    "STAGING_API_BASE_URL"
  ].map((name) => `| ${name} | ${redact(name, values[name])} |`),
  "",
  "## Preflight Output",
  "",
  "```text",
  preflight.stdout.trim(),
  "```",
  ""
].join("\n");

writeFileSync(reportPath, report);
console.log(`Deployment evidence written to ${reportPath}`);

function loadValues(path) {
  const loaded = { ...process.env };
  if (!existsSync(path)) return loaded;
  Object.assign(loaded, parseEnv(readFileSync(path, "utf8")));
  return loaded;
}

function parseEnv(source) {
  const parsed = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function redact(name, value) {
  const text = String(value ?? "").trim();
  if (!text) return "_missing_";
  if (name.includes("PASSWORD") || name.includes("SECRET")) {
    return `${"*".repeat(Math.min(8, text.length))} (${text.length} chars)`;
  }
  if (name.includes("EMAIL")) {
    const [local, domain] = text.split("@");
    if (!domain) return text;
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return text;
}
