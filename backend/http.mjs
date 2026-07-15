import { randomUUID } from "node:crypto";

export async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export function securityHeaders(headers = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...headers
  };
}

export function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, securityHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  }));
  response.end(JSON.stringify(body, null, 2));
}

export function sendData(response, data, status = 200, headers = {}) {
  sendJson(response, status, { data }, headers);
}

export function sendError(response, status, code, message, correlationId = randomUUID(), headers = {}) {
  sendJson(response, status, {
    error: {
      timestamp: new Date().toISOString(),
      status,
      code,
      message,
      correlationId
    }
  }, headers);
}

export function authToken(request) {
  const header = request.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

export function requestIp(request) {
  return request.socket.remoteAddress || "unknown";
}
