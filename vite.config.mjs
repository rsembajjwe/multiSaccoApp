import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const root = process.cwd();
const outDir = "dist-vite";

export default defineConfig({
  root,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(root, "index.html")
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
      const referenced = referencedAssets(indexHtml);
      const appModules = (await readdir(root))
        .filter((file) => /^app\..*\.js$/.test(file) || file === "app.js")
        .sort();
      const assets = Array.from(new Set([
        ...referenced,
        ...appModules,
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

      await writeFile(path.join(outputRoot, "vite-classic-manifest.json"), JSON.stringify({
        app: "Tereka Online",
        mode: "classic-script-bridge",
        builtAt: new Date().toISOString(),
        assets
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
  return [...scriptSources, ...linkSources].filter(Boolean);
}

function stripQuery(source) {
  return source.split("?")[0].replace(/^\//, "");
}
