import { spawn } from "node:child_process";
import { chromium } from "playwright";

const uiBaseUrl = (process.env.UAT_UI_BASE_URL || `http://127.0.0.1:${process.env.UAT_UI_PORT || 5181}`).replace(/\/$/, "");
const javaApiBase = (process.env.JAVA_API_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
const apiBaseUrl = `${uiBaseUrl}/api/v1`;
const shouldStartUi = process.env.UAT_UI_BASE_URL ? false : process.env.UAT_UI_START_SERVER !== "0";
const shouldSetupData = process.env.UAT_BROWSER_SETUP !== "0";
const headless = process.env.UAT_BROWSER_HEADLESS !== "0";
const timeoutMs = Number(process.env.UAT_BROWSER_TIMEOUT_MS || 20000);

let server = null;
let browser = null;
let uatData = null;

try {
  if (shouldStartUi) {
    server = spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        PORT: new URL(uiBaseUrl).port,
        JAVA_API_BASE: javaApiBase
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  }

  await waitForUi();
  await assertJavaApiProxy();

  if (shouldSetupData) {
    uatData = await setupUatData();
  }

  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(timeoutMs);

  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });

  await platformAdminUat(page);
  await saccoStaffUat(page);
  await memberPortalUat(page);

  console.log(`Browser UAT checks passed against ${uiBaseUrl}`);
} finally {
  await browser?.close().catch(() => {});
  if (server) server.kill();
}

async function setupUatData() {
  const output = await runNodeScript("scripts/setup-uat-data.mjs", {
    API_BASE_URL: apiBaseUrl,
    UAT_RUN_ID: process.env.UAT_RUN_ID || `browser${Date.now().toString().slice(-8)}`,
    UAT_MEMBER_PASSWORD: process.env.UAT_MEMBER_PASSWORD || "Member@12345",
    UAT_STAFF_PASSWORD: process.env.UAT_STAFF_PASSWORD || "Sacco@12345"
  });
  const jsonStart = output.indexOf("{");
  const jsonEnd = output.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`UAT setup did not print JSON evidence. Output:\n${output}`);
  }
  const data = JSON.parse(output.slice(jsonStart, jsonEnd + 1));
  console.log(`PASS UAT data setup ${data.runId}`);
  return data;
}

function runNodeScript(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function platformAdminUat(page) {
  await staffLogin(page, "admin@platform.local", "Admin@12345", "Platform admin");
  await assertScreen(page, "dashboard", "Dashboard", ["Dashboard data source", "Java-backed", "Operations scope", "Refresh backend data"]);
  await assertScreen(page, "registrations", "SACCO Registration", ["SACCO registration data source", "Tenant approval", "Activation gate"]);
  await assertScreen(page, "subscriptions", "Subscriptions", ["Subscriptions data source", "Billable members", "Payment access"]);
  await assertScreen(page, "operations", "Operations", ["Operations data source", "Operations command center", "Database"]);
  await assertScreen(page, "reports", "Reports", ["Reports data source", "Ledger integrity", "Compliance"]);
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  console.log("PASS platform admin UAT path");
}

async function saccoStaffUat(page) {
  const staff = uatData?.created?.staffUser;
  await staffLogin(page, staff?.email || "admin@greenvalley.local", staff?.password || "Sacco@12345", "SACCO staff");
  await assertScreen(page, "members", "Members", ["Members data source", "Server fields", uatData?.created?.member?.membershipNo || "GVS-0001"]);
  await assertScreen(page, "transactions", "Transactions", ["Transactions data source", "Statement-ready", uatData?.created?.reversalCandidate?.reference || "GVS-TX"]);
  await assertScreen(page, "approvals", "Approvals", ["Approvals data source", "Queue", "decision"]);
  await assertScreen(page, "loans", "Loans", ["Loans data source", "Guarantor pending", uatData?.created?.loan?.product || "Development Loan"]);
  await assertScreen(page, "reports", "Reports", ["Reports data source", "Reconciliation", "Operations exceptions"]);
  await assertScreen(page, "operations", "Operations", ["Operations command center", "Green Valley SACCO", "Runbook"]);
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  console.log("PASS SACCO staff UAT path");
}

async function memberPortalUat(page) {
  const member = uatData?.created?.member;
  await page.locator("#memberPortalBtn").click();
  await page.locator("#memberLoginSubmit").waitFor({ state: "visible" });
  await page.locator("#memberIdentifier").fill(member?.membershipNo || "GVS-0001");
  await page.locator("#memberPassword").fill(member?.password || "Member@12345");
  await page.locator("#memberLoginSubmit").click();
  await waitForSettledUi(page);

  for (const marker of [
    "Member portal data source",
    "member-authenticated Java API data",
    "SERVER-CONFIRMED BALANCES",
    "Total balance",
    "Loans",
    "Notifications",
    "Guarantee requests",
    "Offline drafts",
    member?.membershipNo || "GVS-0001"
  ]) {
    await expectText(page, marker, `member portal marker ${marker}`);
  }

  await page.getByRole("button", { name: /Draft complaint/i }).first().click();
  await page.getByRole("button", { name: /Save draft/i }).first().click();
  await expectText(page, "Mobile service follow-up", "offline draft row saved");
  await page.getByRole("button", { name: /Sync drafts/i }).first().click();
  await expectTextGone(page, "Mobile service follow-up", "offline draft row synced");
  console.log("PASS member portal UAT path");
}

async function staffLogin(page, email, password, label) {
  await page.getByRole("button", { name: /Staff login|API login/ }).first().click();
  await page.locator("#apiSaccoCode").fill(email.includes("platform") ? "PLATFORM" : "GVS");
  await page.locator("#apiUsername").fill(email);
  await page.locator("#apiPassword").fill(password);
  await page.locator("#apiLoginSubmit").click();
  await expectText(page, "API:", `${label} API badge`);
  await expectText(page, "Java-backed", `${label} Java-backed state`);
  await waitForSettledUi(page);
}

async function assertScreen(page, viewId, label, markers) {
  await navigateTo(page, viewId);
  for (const marker of markers) {
    await expectText(page, marker, `${label} marker ${marker}`);
  }
  console.log(`PASS ${label} UAT screen`);
}

async function navigateTo(page, viewId) {
  await page.locator(`[data-view="${viewId}"]`).waitFor({ state: "attached" });
  await page.evaluate((id) => {
    document.querySelector(`[data-view="${id}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, viewId);
  await waitForSettledUi(page);
}

async function clearSession(page) {
  await page.evaluate(() => {
    localStorage.removeItem("sacco-platform-api-session-v1");
    localStorage.removeItem("sacco-platform-member-session-v1");
  });
}

async function waitForUi() {
  const deadline = Date.now() + Number(process.env.UAT_BROWSER_WAIT_MS || 60000);
  while (Date.now() < deadline) {
    try {
      const response = await fetch(uiBaseUrl);
      if (response.ok) return;
    } catch {
      // Wait for the local UI server.
    }
    await delay(500);
  }
  throw new Error(`UI did not become available at ${uiBaseUrl}`);
}

async function assertJavaApiProxy() {
  const deadline = Date.now() + Number(process.env.UAT_BROWSER_WAIT_MS || 60000);
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) {
        const payload = await response.json();
        if (payload.data?.service === "multiSaccoApp Java API") return;
        lastError = `expected Java API health response, got ${payload.data?.service || "unknown service"}`;
      } else {
        lastError = `health endpoint returned ${response.status}`;
      }
    } catch (error) {
      lastError = error.message;
    }
    await delay(1000);
  }
  throw new Error(lastError || `Java API proxy did not become healthy at ${apiBaseUrl}/health`);
}

async function waitForSettledUi(page) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("Refreshing...")) return;
    await delay(250);
  }
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
  const title = await page.locator("#pageTitle").textContent().catch(() => "unknown title");
  const bodyText = await page.locator("body").innerText().catch(() => "");
  throw new Error(`${label} did not render expected text: ${text}. Current title: ${title}. Body excerpt: ${bodyText.slice(0, 800)}`);
}

async function expectTextGone(page, text, label) {
  const deadline = Date.now() + timeoutMs;
  const expected = text.toLowerCase();
  while (Date.now() < deadline) {
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.toLowerCase().includes(expected)) {
      console.log(`PASS ${label}`);
      return;
    }
    await delay(250);
  }
  throw new Error(`${label} still rendered unexpected text: ${text}`);
}

async function launchBrowser() {
  const launchOptions = { headless };
  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    for (const channel of ["chrome", "msedge"]) {
      try {
        return await chromium.launch({ ...launchOptions, channel });
      } catch {
        // Try the next locally installed browser channel.
      }
    }
    throw error;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
