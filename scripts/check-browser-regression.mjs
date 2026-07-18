import { spawn } from "node:child_process";
import { chromium } from "playwright";

const uiBaseUrl = (process.env.UI_BASE_URL || `http://127.0.0.1:${process.env.UI_REGRESSION_PORT || 5174}`).replace(/\/$/, "");
const javaApiBase = (process.env.JAVA_API_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
const shouldStartUi = process.env.UI_BASE_URL ? false : process.env.UI_START_SERVER !== "0";
const headless = process.env.UI_REGRESSION_HEADLESS !== "0";
const timeoutMs = Number(process.env.UI_REGRESSION_TIMEOUT_MS || 20000);

let server = null;
let browser = null;

try {
  if (shouldStartUi) {
    server = spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, PORT: new URL(uiBaseUrl).port, JAVA_API_BASE: javaApiBase },
      stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  }

  await waitForUi();
  await assertJavaApiProxy();

  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(timeoutMs);

  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectText(page, "Login to your portal", "login-first screen");
  await expectText(page, "Register SACCO", "public SACCO registration link");
  await expectText(page, "Forgot password", "forgot password link");

  await staffLogin(page, "PLATFORM", "admin@platform.local", "Admin@12345", "Platform admin");
  await assertScreen(page, "dashboard", ["Dashboard data source", "Total SACCOs", "Active platform users", "Recent SACCO applications"]);
  await assertScreen(page, "sacco-applications", ["SACCO Registration data source", "SACCO application list", "Public SACCO registration wizard"]);
  await assertScreen(page, "subscriptions", ["Subscriptions data source", "Subscription list", "Subscription package configuration"]);
  await assertScreen(page, "operations", ["Operations data source", "Operations command center", "Payment monitoring"]);
  await assertScreen(page, "reports", ["Reports data source", "Report catalogue", "Membership", "Audit"]);
  await assertScreen(page, "users", ["Users and Roles data source", "Platform administrators only", "Permission matrix"]);
  await logout(page);

  await staffLogin(page, "GVS", "admin@greenvalley.local", "Sacco@12345", "SACCO admin");
  await assertScreen(page, "dashboard", ["Dashboard data source", "Total members", "Total savings", "Role filtered"]);
  await assertScreen(page, "members", ["Members data source", "Member list", "Member registration form sections"]);
  await assertScreen(page, "transactions", ["Transactions data source", "Transaction list", "New transaction screen"]);
  await assertScreen(page, "loans", ["Loans data source", "Loan application list", "Loan details tabs"]);
  await assertScreen(page, "approvals", ["Approvals data source", "Approval queue"]);
  await logout(page);

  await memberLogin(page);
  for (const marker of [
    "Member portal data source",
    "member-authenticated Java API data",
    "SERVER-CONFIRMED BALANCES",
    "Total balance",
    "Loans",
    "Notifications",
    "Guarantee requests",
    "Offline drafts"
  ]) {
    await expectText(page, marker, `member portal marker ${marker}`);
  }

  console.log(`Browser regression checks passed against ${uiBaseUrl}`);
} finally {
  await browser?.close().catch(() => {});
  if (server) server.kill();
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless });
  } catch (error) {
    for (const channel of ["chrome", "msedge"]) {
      try {
        return await chromium.launch({ headless, channel });
      } catch {
        // Try the next installed browser.
      }
    }
    throw error;
  }
}

async function waitForUi() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(uiBaseUrl);
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error(`UI did not become available at ${uiBaseUrl}`);
}

async function assertJavaApiProxy() {
  const deadline = Date.now() + 60000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${uiBaseUrl}/api/v1/health`);
      const payload = await response.json();
      if (response.ok && payload.data?.service === "multiSaccoApp Java API") return;
      lastError = `unexpected health response: ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await delay(1000);
  }
  throw new Error(lastError || "Java API proxy did not become healthy.");
}

async function clearSession(page) {
  await page.evaluate(() => {
    localStorage.removeItem("tereka-staff-token");
    localStorage.removeItem("tereka-member-token");
    localStorage.removeItem("sacco-platform-api-session-v1");
    localStorage.removeItem("sacco-platform-member-session-v1");
  });
}

async function staffLogin(page, code, username, password, label) {
  await page.locator("#code").fill(code);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#loginButton").click();
  await page.locator(".app-shell").waitFor({ state: "attached" });
  await expectText(page, "Java-backed", `${label} Java-backed source state`);
  await expectText(page, "Last sync", `${label} last sync marker`);
}

async function memberLogin(page) {
  await page.locator("#code").fill("GVS");
  await page.locator("#username").fill("GVS-0001");
  await page.locator("#password").fill("Member@12345");
  await page.locator("#loginButton").click();
  await page.locator(".app-shell").waitFor({ state: "attached" });
}

async function assertScreen(page, viewId, markers) {
  await navigateTo(page, viewId);
  for (const marker of markers) {
    await expectText(page, marker, `${viewId} marker ${marker}`);
  }
  console.log(`PASS ${viewId}`);
}

async function navigateTo(page, viewId) {
  await page.locator(`[data-view="${viewId}"]`).waitFor({ state: "attached" });
  await page.locator(`[data-view="${viewId}"]`).first().click();
  await delay(300);
}

async function logout(page) {
  await page.locator("[data-action='logout']").click();
  await page.locator("#loginForm").waitFor({ state: "attached" });
}

async function expectText(page, text, label) {
  const deadline = Date.now() + timeoutMs;
  const expected = text.toLowerCase();
  while (Date.now() < deadline) {
    const bodyText = await page.locator("body").innerText();
    if (bodyText.toLowerCase().includes(expected)) {
      console.log(`PASS ${label}`);
      return;
    }
    await delay(250);
  }
  const bodyText = await page.locator("body").innerText();
  throw new Error(`${label} did not render expected text: ${text}. Body excerpt: ${bodyText.slice(0, 700)}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
