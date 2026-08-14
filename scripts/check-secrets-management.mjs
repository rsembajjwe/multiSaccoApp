import { readdir, readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const deployDir = new URL("deploy/", root);
const docs = await readFile(new URL("docs/secrets-management.md", root), "utf8");
const inventory = await readFile(new URL("docs/secrets-inventory.md", root), "utf8");
const stagingGuide = await readFile(new URL("docs/staging-environment.md", root), "utf8");
const files = (await readdir(deployDir))
  .filter((file) => file.endsWith(".env.example"))
  .sort();

const secretNamePattern = /(PASSWORD|SECRET|API_KEY|CLIENT_SECRET|CONSUMER_SECRET|PASSKEY|SUBSCRIPTION_KEY|TOKEN|PRIVATE_KEY)/i;
const allowedPlaceholderPattern = /^(|[*]|change_this.*|replace_with.*|example.*|your_.*|strong_.*|test_.*)$/i;
const failures = [];
const requiredSecretNames = [
  "SPRING_DATASOURCE_PASSWORD",
  "POSTGRES_PASSWORD",
  "SACCO_PII_ENCRYPTION_KEY",
  "SACCO_DOCUMENT_STORAGE_LOCAL_ROOT",
  "SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD",
  "SACCO_MOBILE_MONEY_CALLBACK_SECRET",
  "SACCO_AFROSMS_EMAIL",
  "SACCO_AFROSMS_PASSWORD",
  "SACCO_AFROSMS_SOURCE",
  "SACCO_GMAIL_SMTP_USERNAME",
  "SACCO_GMAIL_SMTP_PASSWORD",
  "SACCO_GMAIL_FROM_ADDRESS",
  "SACCO_MTN_MOMO_SUBSCRIPTION_KEY",
  "SACCO_MTN_MOMO_API_USER_ID",
  "SACCO_MTN_MOMO_API_KEY",
  "SACCO_MTN_MOMO_TARGET_ENVIRONMENT",
  "SACCO_AIRTEL_MONEY_CLIENT_ID",
  "SACCO_AIRTEL_MONEY_CLIENT_SECRET",
  "SACCO_AIRTEL_MONEY_COUNTRY_CODE",
  "SACCO_MPESA_DARAJA_CONSUMER_KEY",
  "SACCO_MPESA_DARAJA_CONSUMER_SECRET",
  "SACCO_MPESA_DARAJA_BUSINESS_SHORT_CODE",
  "SACCO_MPESA_DARAJA_PASSKEY",
  "SACCO_MPESA_DARAJA_CALLBACK_URL",
  "SACCO_REDIS_URL"
];

for (const file of files) {
  const content = await readFile(new URL(file, deployDir), "utf8");
  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (!secretNamePattern.test(key)) continue;
    const value = rest.join("=").trim();
    if (!allowedPlaceholderPattern.test(value)) {
      failures.push(`${file}:${index + 1} ${key} must use a placeholder or be empty`);
    }
  }
}

for (const marker of [
  "## Rotation Schedule",
  "## Rotation Procedure",
  "## Emergency Rotation",
  "ProductionSecretReadinessValidator",
  "IntegrationProviderReadinessValidator",
  "DocumentStorageReadinessValidator"
]) {
  if (!docs.includes(marker)) {
    failures.push(`docs/secrets-management.md missing ${marker}`);
  }
}

for (const marker of [
  "## Managed Store Evidence",
  "## Required Production Secrets",
  "## Rotation Evidence Template",
  "## Emergency Disclosure Rule"
]) {
  if (!inventory.includes(marker)) {
    failures.push(`docs/secrets-inventory.md missing ${marker}`);
  }
}

for (const secretName of requiredSecretNames) {
  if (!inventory.includes(`\`${secretName}\``)) {
    failures.push(`docs/secrets-inventory.md missing ${secretName}`);
  }
  if (!stagingGuide.includes(`\`${secretName}\``) && !["SACCO_REDIS_URL"].includes(secretName)) {
    failures.push(`docs/staging-environment.md missing ${secretName}`);
  }
}

const deployExamplesContent = await Promise.all(files.map(async (file) => readFile(new URL(file, deployDir), "utf8")));
const combinedDeployExamples = deployExamplesContent.join("\n");
for (const secretName of requiredSecretNames.filter((name) => !name.startsWith("SPRING_DATASOURCE_"))) {
  if (!combinedDeployExamples.includes(`${secretName}=`)) {
    failures.push(`deploy/*.env.example missing ${secretName}`);
  }
}

if (failures.length) {
  throw new Error(`Secrets management check failed:\n${failures.join("\n")}`);
}

console.log(`Secrets management contract check passed (${files.length} deployment example files scanned, ${requiredSecretNames.length} production secret names inventoried).`);
