import { readdir, readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const deployDir = new URL("deploy/", root);
const docs = await readFile(new URL("docs/secrets-management.md", root), "utf8");
const files = (await readdir(deployDir))
  .filter((file) => file.endsWith(".env.example"))
  .sort();

const secretNamePattern = /(PASSWORD|SECRET|API_KEY|CLIENT_SECRET|CONSUMER_SECRET|PASSKEY|SUBSCRIPTION_KEY|TOKEN|PRIVATE_KEY)/i;
const allowedPlaceholderPattern = /^(|[*]|change_this.*|replace_with.*|example.*|your_.*|strong_.*|test_.*)$/i;
const failures = [];

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

if (failures.length) {
  throw new Error(`Secrets management check failed:\n${failures.join("\n")}`);
}

console.log(`Secrets management contract check passed (${files.length} deployment example files scanned).`);
