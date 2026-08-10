import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

if (!dist.startsWith(root + path.sep)) {
  throw new Error(`Refusing to build outside the project workspace: ${dist}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const requiredAssets = [
  "index.html",
  "styles.css",
  "favicon.svg",
  "manifest.webmanifest",
  "service-worker.js"
];
const indexHtml = await readText("index.html");
const scriptSources = Array.from(indexHtml.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/g))
  .map((match) => stripQuery(match[1]))
  .filter((source) => source.startsWith("app") && source.endsWith(".js"));
const stylesheetSources = Array.from(indexHtml.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g))
  .map((match) => stripQuery(match[1]))
  .filter((source) => source.endsWith(".css") || source.endsWith(".svg") || source.endsWith(".webmanifest"));

const assets = Array.from(new Set([...requiredAssets, ...stylesheetSources, ...scriptSources]));
const missing = assets.filter((asset) => !existsSync(path.join(root, asset)));
if (missing.length) {
  throw new Error(`Frontend build failed. Missing referenced asset(s): ${missing.join(", ")}`);
}

for (const asset of assets) {
  await copyFile(path.join(root, asset), path.join(dist, asset));
}

const manifest = {
  app: "Tereka Online",
  builtAt: new Date().toISOString(),
  entry: "index.html",
  scripts: scriptSources,
  assets
};
await writeFile(path.join(dist, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Frontend build passed (${assets.length} asset(s), ${scriptSources.length} script module(s)) -> dist`);

async function readText(file) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path.join(root, file), "utf8");
}

function stripQuery(source) {
  return source.split("?")[0].replace(/^\//, "");
}
