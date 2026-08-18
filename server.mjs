import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./backend/api.mjs";
import { securityHeaders } from "./backend/http.mjs";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
// Serve the Vite-bundled single-file build (dist-vite) when it exists in production, or when
// SACCO_SERVE_BUNDLE=true. In development the source tree (classic module scripts) is served so edits
// are picked up without a build step.
const distViteRoot = normalize(join(repoRoot, "dist-vite"));
const serveBundle = process.env.SACCO_SERVE_BUNDLE === "true"
  || (process.env.NODE_ENV === "production" && existsSync(join(distViteRoot, "index.html")));
const webRoot = serveBundle ? distViteRoot : normalize(repoRoot);
const port = Number(process.env.PORT || 5173);
const javaApiBase = process.env.JAVA_API_BASE || "";
const nodeApiEnabled = process.env.SACCO_NODE_API_ENABLED
  ? process.env.SACCO_NODE_API_ENABLED === "true"
  : process.env.NODE_ENV !== "production";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/v1")) {
      if (javaApiBase) {
        await proxyJavaApi(request, response, url);
        return;
      }
      if (!nodeApiEnabled) {
        response.writeHead(503, securityHeaders({ "Content-Type": "application/json; charset=utf-8" }));
        response.end(JSON.stringify({
          error: {
            status: 503,
            code: "JAVA_API_REQUIRED",
            message: "The production server requires JAVA_API_BASE. The legacy Node API is available only when SACCO_NODE_API_ENABLED=true."
          }
        }, null, 2));
        return;
      }
      await handleApi(request, response, url);
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = normalize(join(webRoot, requestedPath));

    if (!filePath.startsWith(webRoot)) {
      response.writeHead(403, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
      response.end("Forbidden");
      return;
    }

    const content = await readFile(filePath);
    response.writeHead(200, securityHeaders({
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": cacheControlFor(url, filePath)
    }));
    response.end(content);
  } catch {
    response.writeHead(404, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SACCO app running at http://127.0.0.1:${port}`);
  console.log(serveBundle ? "Serving the Vite-bundled build from dist-vite." : "Serving the source module tree (development).");
  if (javaApiBase) console.log(`Proxying /api/v1 requests to ${javaApiBase}`);
  else if (nodeApiEnabled) console.log("Using legacy Node API for local development/demo only.");
  else console.log("JAVA_API_BASE is required for /api/v1 requests in production mode.");
});

async function proxyJavaApi(request, response, url) {
  try {
    const target = new URL(`${url.pathname}${url.search}`, javaApiBase);
    const body = ["GET", "HEAD"].includes(request.method || "GET")
      ? undefined
      : await readRequestBody(request);
    const headers = { ...request.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body
    });
    const responseHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (!["connection", "content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    response.writeHead(upstream.status, securityHeaders(responseHeaders));
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    response.writeHead(502, securityHeaders({ "Content-Type": "application/json; charset=utf-8" }));
    response.end(JSON.stringify({
      error: {
        status: 502,
        code: "JAVA_API_UNAVAILABLE",
        message: `Unable to reach Java API at ${javaApiBase}. ${error.message}`
      }
    }, null, 2));
  }
}

function cacheControlFor(url, filePath) {
  const extension = extname(filePath);
  if (extension === ".html") return "no-cache, max-age=0";
  if (url.searchParams.has("v") && [".css", ".js", ".svg", ".ico", ".png", ".json", ".webmanifest"].includes(extension)) {
    return "public, max-age=31536000, immutable";
  }
  return "no-store, max-age=0";
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}
