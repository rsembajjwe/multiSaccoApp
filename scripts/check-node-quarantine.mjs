import { readFile } from "node:fs/promises";

const files = {
  server: "server.mjs",
  api: "backend/api.mjs",
  store: "backend/store.mjs",
  guard: "scripts/check-node-api-production-guard.mjs",
  apiSmoke: "scripts/api-smoke-test.mjs",
  technicalManual: "docs/technical-manual.md",
  routeMap: "docs/api-route-map.md",
  parityAudit: "docs/java-backend-parity-audit.md",
  packageJson: "package.json"
};

const contents = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(file, "utf8")]))
);

const checks = [
  [contents.server, "NODE_ENV !== \"production\"", "server defaults Node API off in production"],
  [contents.server, "JAVA_API_REQUIRED", "server fails closed when production has no Java API"],
  [contents.server, "SACCO_NODE_API_ENABLED", "server requires deliberate Node API override"],
  [contents.api, "DEMO_ONLY_LEGACY_NODE_API", "legacy Node API is marked demo-only"],
  [contents.store, "DEMO_ONLY_LEGACY_NODE_STORE", "legacy Node store is marked demo-only"],
  [contents.guard, "PASS production server refuses legacy Node API without JAVA_API_BASE", "production guard test exists"],
  [contents.apiSmoke, "SACCO_NODE_API_ENABLED: \"true\"", "legacy API smoke test opts into demo fallback explicitly"],
  [contents.apiSmoke, "SACCO_DEMO_FALLBACK_REASON", "legacy API smoke test labels why demo fallback is enabled"],
  [contents.technicalManual, "Legacy demo fallback", "technical manual labels Node fallback"],
  [contents.technicalManual, "Production-style local development", "technical manual prefers Java-backed local mode"],
  [contents.routeMap, "Node API is demo-only fallback", "route map documents Java source of truth"],
  [contents.parityAudit, "OpenAPI Contract Guard", "parity audit documents OpenAPI guard"],
  [contents.packageJson, "\"node:quarantine\": \"node scripts/check-node-quarantine.mjs\"", "package exposes quarantine check"],
  [contents.packageJson, "node scripts/check-node-quarantine.mjs", "main check includes quarantine check"]
];

const missing = checks.filter(([source, marker]) => !source.includes(marker));
if (missing.length) {
  throw new Error(`Node quarantine contract failed:\n${missing.map(([, marker, label]) => `- ${label}: ${marker}`).join("\n")}`);
}

console.log(`Node quarantine check passed (${checks.length} markers).`);
