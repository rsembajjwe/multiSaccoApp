import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");

const requiredIgnoreMarkers = [
  "node_modules/",
  "dist/",
  "dist-vite/",
  "coverage/",
  "target/",
  "backups/",
  "logs/",
  "reports/release-evidence/*",
  ".env",
  ".env.*",
  "*.log",
  "tmp-*.log",
  ".idea/",
  ".local-pids/",
  "Thumbs.db",
  ".DS_Store",
];

const forbiddenTrackedPatterns = [
  /(^|\/)\.idea(\/|$)/,
  /(^|\/)\.local-pids(\/|$)/,
  /(^|\/)logs(\/|$)/,
  /(^|\/)backups(\/|$)/,
  /(^|\/)coverage(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)dist-vite(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)target(\/|$)/,
  /(^|\/)tmp-[^/]*\.log$/,
  /(^|\/)[^/]*\.log$/,
  /(^|\/)Thumbs\.db$/,
  /(^|\/)\.DS_Store$/,
  /(^|\/)\.env(\..*)?$/,
  /(^|\/)reports\/[^/]+\/(?!\.gitkeep$).+/,
];

const failures = [];
for (const marker of requiredIgnoreMarkers) {
  if (!gitignore.includes(marker)) {
    failures.push(`.gitignore missing marker: ${marker}`);
  }
}

const tracked = runGit(["ls-files"]).split(/\r?\n/).filter(Boolean);
for (const file of tracked) {
  if (forbiddenTrackedPatterns.some((pattern) => pattern.test(file))) {
    failures.push(`Generated or local-only file is tracked: ${file}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Repository hygiene check failed:\n${failures.join("\n")}`);
}

console.log(`Repository hygiene check passed (${requiredIgnoreMarkers.length} ignore markers, ${tracked.length} tracked files scanned).`);

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}
