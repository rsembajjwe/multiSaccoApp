import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const [packageJson, config, indexHtml] = await Promise.all([
  readJson("package.json"),
  readText("vite.config.mjs"),
  readText("index.html")
]);

assert.equal(packageJson.scripts["build:vite"], "vite build --config vite.config.mjs");
assert.equal(packageJson.scripts["dev:vite"], "vite --host 127.0.0.1 --port 5173");
assert.equal(packageJson.scripts["vite:check"], "node scripts/check-vite-readiness.mjs");

for (const marker of [
  "defineConfig",
  "outDir = \"dist-vite\"",
  "classicScriptAssetBridge",
  "vite-classic-manifest.json",
  "service-worker.js",
  "manifest.webmanifest"
]) {
  assert.ok(config.includes(marker), `vite.config.mjs missing marker: ${marker}`);
}

const scriptCount = Array.from(indexHtml.matchAll(/<script\s+[^>]*src=["']app[^"']+\.js/g)).length;
assert.ok(scriptCount >= 30, `Expected classic app script tags while migration is incremental, found ${scriptCount}.`);

const viteInstalled = existsSync(new URL("../node_modules/vite/package.json", import.meta.url));
assert.ok(viteInstalled, "vite package must be installed for frontend build maturity work");

console.log(`Vite readiness check passed (${scriptCount} classic script modules bridged, vite package installed).`);

async function readText(file) {
  return readFile(new URL(`../${file}`, import.meta.url), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}
