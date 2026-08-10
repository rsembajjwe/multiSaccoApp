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
  "vite-entry.html",
  "tereka-classic-app.js",
  "classic-script-bundled-bridge",
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

if (existsSync(new URL("../dist-vite/index.html", import.meta.url))) {
  const distIndex = await readText("dist-vite/index.html");
  const distScriptCount = Array.from(distIndex.matchAll(/<script\s+/g)).length;
  assert.equal(distScriptCount, 1, "dist-vite index should load one bundled app script");
  assert.ok(distIndex.includes("tereka-classic-app.js"), "dist-vite index missing bundled classic app script");
}

console.log(`Vite readiness check passed (${scriptCount} classic script modules bundled through the bridge, vite package installed).`);

async function readText(file) {
  return readFile(new URL(`../${file}`, import.meta.url), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}
