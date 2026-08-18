import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { transform } from "esbuild";

const root = process.cwd();
// Canonical, Rollup-free production build. Outputs the single-file bundle to dist-vite/, which is the
// directory server.mjs (SACCO_SERVE_BUNDLE / production) and the Caddyfile serve. `build:vite`
// (Vite/Rollup) remains as an alternative that produces the same artifact.
const dist = path.join(root, "dist-vite");

if (!dist.startsWith(root + path.sep)) {
  throw new Error(`Refusing to build outside the project workspace: ${dist}`);
}

// Cache-busting version for the bundled app script, derived from the current service worker's
// CACHE_VERSION so the built artifact never ships a stale version string.
const serviceWorkerSource = await readText("service-worker.js");
const bundleVersion = (serviceWorkerSource.match(/tereka-shell-v([^"']+)/)?.[1])
  || new Date().toISOString().slice(0, 10).replace(/-/g, "");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const requiredAssets = [
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

const staticAssets = Array.from(new Set([...requiredAssets, ...stylesheetSources]));
const assets = Array.from(new Set([...staticAssets, ...scriptSources]));
const missing = assets.filter((asset) => !existsSync(path.join(root, asset)));
if (missing.length) {
  throw new Error(`Frontend build failed. Missing referenced asset(s): ${missing.join(", ")}`);
}

for (const asset of staticAssets) {
  await copyFile(path.join(root, asset), path.join(dist, asset));
}

const bundle = "tereka-classic-app.js";
await writeFile(path.join(dist, bundle), await classicBundle(scriptSources), "utf8");
await writeFile(path.join(dist, "index.html"), bundledIndex(indexHtml), "utf8");
await writeFile(path.join(dist, "service-worker.js"), bundledServiceWorker(await readText("service-worker.js")), "utf8");

const manifest = {
  app: "Tereka Online",
  mode: "classic-script-bundled",
  builtAt: new Date().toISOString(),
  entry: "index.html",
  bundle,
  sourceScripts: scriptSources,
  assets: [...staticAssets, bundle]
};
await writeFile(path.join(dist, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log(`Frontend build passed (${staticAssets.length + 1} asset(s), 1 bundled app script v${bundleVersion} from ${scriptSources.length} source script(s)) -> dist-vite`);

async function readText(file) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path.join(root, file), "utf8");
}

function stripQuery(source) {
  return source.split("?")[0].replace(/^\//, "");
}

async function classicBundle(scriptSources) {
  const missing = scriptSources.filter((asset) => !existsSync(path.join(root, asset)));
  if (missing.length) {
    throw new Error(`Frontend bundle missing script(s): ${missing.join(", ")}`);
  }
  const source = [
    "(() => {",
    "'use strict';",
    ...await Promise.all(scriptSources.map(async (script) => [
      `\n/* ${script} */`,
      await readText(script)
    ].join("\n"))),
    "})();"
  ].join("\n");
  const result = await transform(source, {
    loader: "js",
    minify: true,
    legalComments: "none"
  });
  return `${result.code}\n`;
}

function bundledIndex(indexHtml) {
  return indexHtml
    .replace(/<script\s+[^>]*src=["']app(?:\.[^"']+)?\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/g, "")
    .replace("</body>", `  <script src="tereka-classic-app.js?v=${bundleVersion}"></script>\n</body>`);
}

function bundledServiceWorker(serviceWorker) {
  return serviceWorker
    .replace(/tereka-shell-v[^"]+/, `tereka-shell-v${bundleVersion}`)
    .replace(
      /\n\s*"\/app\.i18n\.js\?v=[^"]+",\s*\n\s*"\/app\.js\?v=[^"]+",/,
      `\n  "/tereka-classic-app.js?v=${bundleVersion}",`
    );
}
