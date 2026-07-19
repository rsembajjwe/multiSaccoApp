import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./backend/api.mjs";
import { securityHeaders } from "./backend/http.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
const javaApiBase = process.env.JAVA_API_BASE || "";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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
      await handleApi(request, response, url);
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = normalize(join(root, requestedPath));

    if (!filePath.startsWith(root)) {
      response.writeHead(403, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
      response.end("Forbidden");
      return;
    }

    const content = await readFile(filePath);
    response.writeHead(200, securityHeaders({
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0"
    }));
    response.end(content);
  } catch {
    response.writeHead(404, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SACCO app running at http://127.0.0.1:${port}`);
  if (javaApiBase) console.log(`Proxying /api/v1 requests to ${javaApiBase}`);
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

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}
