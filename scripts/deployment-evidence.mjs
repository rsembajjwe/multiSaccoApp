import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const envFile = process.env.DEPLOYMENT_ENV_FILE || process.env.STAGING_ENV_FILE || ".env";
const reportDir = join(repoRoot, "reports", "deployment-evidence");
const values = loadValues(envFile);
const hasExplicitEnvFile = Boolean(process.env.DEPLOYMENT_ENV_FILE || process.env.STAGING_ENV_FILE);
const hasEnvFile = existsSync(envFile);
const hasHostedEnv = hasEnvFile || ["STAGING_UI_BASE_URL", "STAGING_API_BASE_URL", "POSTGRES_PASSWORD"].every((name) => process.env[name]);

const checks = [
  {
    name: "Deployment contract",
    command: process.execPath,
    args: ["scripts/check-deployment-contract.mjs"],
  },
  hasHostedEnv
    ? {
      name: "Hosted staging preflight",
      command: process.execPath,
      args: ["scripts/check-staging-preflight.mjs"],
      env: { ...process.env, STAGING_ENV_FILE: envFile },
    }
    : skippedCheck("Hosted staging preflight", hasExplicitEnvFile
      ? `Environment file was explicitly requested but not found: ${envFile}`
      : "No hosted .env or staging environment variables were supplied. Create .env from deploy/staging.env.example to run hosted preflight."),
];

const results = checks.map((check) => check.optional && !check.command ? check : runCheck(check));
const blockingFailures = results.filter((result) => result.status !== 0 && !result.optional);
if (blockingFailures.length > 0) {
  process.exit(1);
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
  ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : result.optional ? "SKIPPED/BLOCKED" : "FAIL"}`),
  "- Docker required: no",
  "- Demo logins: disabled before handoff",
  "- Provider values: real provider IDs required before handoff",
  "- Callback signing: required before handoff",
  "",
  "## Scope",
  "",
  "- Confirms deployment, Hetzner, staging, handoff, release evidence, readiness, package, and CI release-gate contracts are still documented.",
  "- Runs hosted staging preflight only when a real environment file or equivalent variables are supplied.",
  "- Does not prove a live hosted deployment, DNS, HTTPS certificate, managed secret store, or production provider credentials.",
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
  "## Checks",
  "",
  ...results.flatMap((result) => [
    `### ${result.name}`,
    "",
    `Command: \`${result.command ? [result.command, ...(result.args || [])].join(" ") : "not run"}\``,
    `Exit code: ${result.status}`,
    "",
    "```text",
    [result.stdout?.trim(), result.stderr?.trim(), result.error?.trim()].filter(Boolean).join("\n"),
    "```",
    "",
  ]),
].join("\n");

writeFileSync(reportPath, report);
console.log(`Deployment evidence written to ${reportPath}`);

function runCheck(check) {
  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    env: check.env || process.env,
    encoding: "utf8"
  });
  if (result.stdout.trim()) process.stdout.write(result.stdout);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  return {
    ...check,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error ? result.error.message : "",
    optional: Boolean(check.optional),
  };
}

function skippedCheck(name, reason) {
  console.log(`SKIP ${name}: ${reason}`);
  return {
    name,
    status: 1,
    stdout: `SKIP ${reason}`,
    stderr: "",
    error: "",
    optional: true,
  };
}

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
