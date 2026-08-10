import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { transform } from "esbuild";

const root = process.cwd();
const outDir = "dist-vite";

export default defineConfig({
  root,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(root, "vite-entry.html")
    }
  },
  plugins: [classicScriptAssetBridge()]
});

function classicScriptAssetBridge() {
  return {
    name: "tereka-classic-script-asset-bridge",
    apply: "build",
    async closeBundle() {
      const outputRoot = path.join(root, outDir);
      const indexHtml = await readText("index.html");
      const { scriptSources, linkSources } = referencedAssets(indexHtml);
      const assets = Array.from(new Set([
        ...linkSources,
        "favicon.svg",
        "manifest.webmanifest",
        "service-worker.js",
        "styles.css"
      ]));

      const missing = assets.filter((asset) => !existsSync(path.join(root, asset)));
      if (missing.length) {
        throw new Error(`Vite classic-script bridge missing asset(s): ${missing.join(", ")}`);
      }

      await mkdir(outputRoot, { recursive: true });
      for (const asset of assets) {
        await copyFile(path.join(root, asset), path.join(outputRoot, asset));
      }

      const bundled = await classicBundle(scriptSources);
      await writeFile(path.join(outputRoot, "tereka-classic-app.js"), bundled, "utf8");
      await writeFile(path.join(outputRoot, "index.html"), bundledIndex(indexHtml), "utf8");
      await writeFile(path.join(outputRoot, "service-worker.js"), bundledServiceWorker(await readText("service-worker.js")), "utf8");
      await rm(path.join(outputRoot, "vite-entry.html"), { force: true });

      await writeFile(path.join(outputRoot, "vite-classic-manifest.json"), JSON.stringify({
        app: "Tereka Online",
        mode: "classic-script-bundled-bridge",
        builtAt: new Date().toISOString(),
        entry: "index.html",
        bundle: "tereka-classic-app.js",
        sourceScripts: scriptSources,
        assets: [...assets, "tereka-classic-app.js"]
      }, null, 2) + "\n", "utf8");
    }
  };
}

async function readText(file) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path.join(root, file), "utf8");
}

function referencedAssets(indexHtml) {
  const scriptSources = Array.from(indexHtml.matchAll(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/g))
    .map((match) => stripQuery(match[1]));
  const linkSources = Array.from(indexHtml.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/g))
    .map((match) => stripQuery(match[1]))
    .filter((source) => source.endsWith(".css") || source.endsWith(".svg") || source.endsWith(".webmanifest"));
  return {
    scriptSources: scriptSources.filter(Boolean),
    linkSources: linkSources.filter(Boolean)
  };
}

function stripQuery(source) {
  return source.split("?")[0].replace(/^\//, "");
}

async function classicBundle(scriptSources) {
  const missing = scriptSources.filter((asset) => !existsSync(path.join(root, asset)));
  if (missing.length) {
    throw new Error(`Vite classic-script bundle missing script(s): ${missing.join(", ")}`);
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
    .replace("</body>", '  <script src="tereka-classic-app.js?v=20260810-vite-bundle-1"></script>\n</body>');
}

function bundledServiceWorker(serviceWorker) {
  return serviceWorker
    .replace(/tereka-shell-v[^"]+/, "tereka-shell-v20260810-vite-bundle-1")
    .replace(
      /\n\s*"\/app\.i18n\.js\?v=[^"]+",\s*\n\s*"\/app\.js\?v=[^"]+",/,
      '\n  "/tereka-classic-app.js?v=20260810-vite-bundle-1",'
    );
}
