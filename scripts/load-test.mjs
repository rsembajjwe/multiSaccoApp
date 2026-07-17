const baseUrl = process.env.LOAD_BASE_URL || "http://127.0.0.1:8080";
const totalRequests = numberFromEnv("LOAD_REQUESTS", 100);
const concurrency = numberFromEnv("LOAD_CONCURRENCY", 10);
const p95LimitMs = numberFromEnv("LOAD_P95_MS", 1000);
const loginEmail = process.env.LOAD_LOGIN_EMAIL || "admin@platform.local";
const loginPassword = process.env.LOAD_LOGIN_PASSWORD || "Admin@12345";

function numberFromEnv(name, defaultValue) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

async function request(path, options = {}) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, options);
  const elapsedMs = performance.now() - startedAt;
  const body = await response.text();
  return { status: response.status, elapsedMs, body };
}

async function login() {
  const result = await request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: loginEmail, password: loginPassword }),
  });
  if (result.status !== 200) {
    throw new Error(`Login failed with ${result.status}: ${result.body}`);
  }
  const parsed = JSON.parse(result.body);
  return parsed.data.token;
}

async function worker(id, token, queue, results) {
  while (queue.next < totalRequests) {
    const requestNumber = queue.next;
    queue.next += 1;
    const path = requestNumber % 2 === 0 ? "/api/v1/health" : "/api/v1/operations/status";
    const headers = path.includes("/operations/")
      ? { Authorization: `Bearer ${token}` }
      : {};

    try {
      const result = await request(path, { headers });
      results.push({
        worker: id,
        path,
        status: result.status,
        elapsedMs: result.elapsedMs,
        ok: result.status >= 200 && result.status < 300,
      });
    } catch (error) {
      results.push({
        worker: id,
        path,
        status: 0,
        elapsedMs: 0,
        ok: false,
        error: error.message,
      });
    }
  }
}

function percentile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

async function main() {
  console.log(`Load target: ${baseUrl}`);
  console.log(`Requests: ${totalRequests}, concurrency: ${concurrency}, p95 limit: ${p95LimitMs}ms`);

  const token = await login();
  const results = [];
  const queue = { next: 0 };
  const workerCount = Math.min(concurrency, totalRequests);

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: workerCount }, (_, index) => worker(index + 1, token, queue, results)));
  const durationMs = performance.now() - startedAt;

  const failures = results.filter((result) => !result.ok);
  const latencies = results.filter((result) => result.ok).map((result) => result.elapsedMs);
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);
  const requestsPerSecond = results.length / (durationMs / 1000);

  console.log(`Completed: ${results.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Throughput: ${requestsPerSecond.toFixed(2)} req/s`);
  console.log(`Latency p50: ${p50.toFixed(1)}ms`);
  console.log(`Latency p95: ${p95.toFixed(1)}ms`);

  if (failures.length > 0) {
    console.error("First failure:", JSON.stringify(failures[0], null, 2));
    process.exit(1);
  }
  if (p95 > p95LimitMs) {
    console.error(`p95 latency ${p95.toFixed(1)}ms exceeded ${p95LimitMs}ms`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
