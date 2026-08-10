import { spawn } from "node:child_process";
import { chromium } from "playwright";

const uiBaseUrl = (process.env.ROLE_SMOKE_UI_BASE_URL || `http://127.0.0.1:${process.env.ROLE_SMOKE_UI_PORT || 5183}`).replace(/\/$/, "");
const javaApiBase = (process.env.JAVA_API_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
const shouldStartUi = process.env.ROLE_SMOKE_UI_BASE_URL ? false : process.env.ROLE_SMOKE_START_SERVER !== "0";
const headless = process.env.ROLE_SMOKE_HEADLESS !== "0";
const timeoutMs = Number(process.env.ROLE_SMOKE_TIMEOUT_MS || 20000);

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
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.setDefaultTimeout(timeoutMs);

  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });

  await assertLoginGateway(page);
  await assertPlatformSuperAdminFlow(page);
  await assertSaccoAdminFlow(page);
  await assertMemberPortalFlow(page);

  console.log(`Enterprise role smoke checks passed against ${uiBaseUrl}`);
} finally {
  await browser?.close().catch(() => {});
  if (server) server.kill();
}

async function assertLoginGateway(page) {
  await expectText(page, "Login to Tereka Online", "login gateway title");
  await expectText(page, "Enterprise SACCO access gateway", "enterprise gateway copy");
  await expectText(page, "SACCO or platform code", "code field label");
  await expectText(page, "Username, email, phone or membership number", "identifier field label");
  await expectText(page, "Register SACCO", "public registration entry");
  await expectNoText(page, "Demo access", "demo access hidden by default");
}

async function assertPlatformSuperAdminFlow(page) {
  await staffLogin(page, "PLATFORM", "admin@platform.local", "Admin@12345", "platform super admin");
  await expectText(page, "Platform Administration Portal", "platform shell");
  await assertNavigation(page, ["Dashboard", "SACCO Registration", "Subscriptions", "SACCO Accounts", "Reports", "Complaints", "Users and Roles", "Audit Logs"]);
  await expectNoText(page, "Loan portfolio monitoring", "platform loan menu hidden");
  await expectNoText(page, "Read-only SACCO member support", "platform member menu hidden");
  await assertScreen(page, "dashboard", ["Total SACCOs", "Active platform users", "Recent SACCO applications"]);
  await assertScreen(page, "users", ["Add platform user", "Platform administrator list", "Permission matrix"]);
  await assertScreen(page, "complaints", ["Complaints from SACCO admins", "Open platform support cases"]);
  await logout(page);
}

async function assertSaccoAdminFlow(page) {
  await staffLogin(page, "GVS", "admin@greenvalley.local", "Sacco@12345", "SACCO admin");
  await expectText(page, "SACCO Administration Portal", "SACCO shell");
  await assertNavigation(page, ["Dashboard", "Members", "Transactions", "Savings", "Shares", "Welfare", "Loans", "Guarantors", "Approvals", "Accounting", "Reconciliation", "Reports", "Governance", "Complaints", "Users and Roles", "Settings", "Audit Logs"]);
  await expectNoText(page, "Operations", "SACCO operations menu hidden");
  await assertScreen(page, "dashboard", ["Total members", "SACCO monthly performance control", "Treasurer cash collections", "Mobile money collections"]);
  await assertScreen(page, "members", ["Member Overview", "Register Member", "Member List", "KYC Detail", "Statement"]);
  await assertScreen(page, "transactions", ["Transaction control focus", "New transaction screen", "Receipting queue"]);
  await assertScreen(page, "complaints", ["SACCO member complaints", "Member complaint list", "Chat"]);
  await logout(page);
}

async function assertMemberPortalFlow(page) {
  if (!(await canMemberLogin("GVS", "GVS-0001", "Member@12345"))) {
    console.log("SKIP member portal smoke: demo member login is unavailable in the running backend profile");
    return;
  }
  await memberLogin(page, "GVS", "GVS-0001", "Member@12345");
  await expectText(page, "Member portal", "member shell");
  await assertNavigation(page, ["Home", "Accounts", "Loans", "Guarantor Requests", "Payments", "Statements", "Receipts", "Notifications", "Complaints", "Profile", "Security"]);
  await assertScreen(page, "home", ["Total balance", "Monthly savings", "Pay by mobile money", "Read SACCO messages"]);
  await assertScreen(page, "payments", ["Member payment center", "Mobile money", "Treasurer cash"]);
  await assertScreen(page, "notifications", ["Member message inbox", "SACCO admin messages"]);
  await assertScreen(page, "complaints", ["Member complaint center", "Member complaint submission", "My complaints"]);
}

async function staffLogin(page, code, username, password, label) {
  await page.locator("#code").fill(code);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#loginButton").click();
  if (await page.locator("#mfaVerifyForm").count()) {
    const bodyText = await page.locator("body").innerText();
    const mfaCode = bodyText.match(/\b\d{6}\b/)?.[0];
    if (!mfaCode) throw new Error(`${label} MFA challenge did not expose a development code`);
    await page.locator("#mfaCode").fill(mfaCode);
    await page.locator("#mfaVerifyButton").click();
  }
  await page.locator(".app-shell").waitFor({ state: "attached" });
  await waitForSettledUi(page);
  console.log(`PASS ${label} login`);
}

async function memberLogin(page, code, identifier, password) {
  await page.locator("#code").fill(code);
  await page.locator("#username").fill(identifier);
  await page.locator("#password").fill(password);
  await page.locator("#loginButton").click();
  await page.locator(".app-shell").waitFor({ state: "attached" });
  await waitForSettledUi(page);
  console.log("PASS member login");
}

async function assertScreen(page, viewId, markers) {
  await navigateTo(page, viewId);
  for (const marker of markers) {
    await expectText(page, marker, `${viewId} marker ${marker}`);
  }
  console.log(`PASS ${viewId} smoke`);
}

async function assertNavigation(page, labels) {
  const navText = await page.locator(".sidebar").innerText();
  for (const label of labels) {
    if (!navText.toLowerCase().includes(label.toLowerCase())) {
      throw new Error(`Expected navigation item "${label}". Sidebar excerpt: ${navText.slice(0, 500)}`);
    }
  }
  console.log("PASS role navigation");
}

async function navigateTo(page, viewId) {
  await page.locator(`button.nav-link[data-view="${viewId}"]`).waitFor({ state: "attached" });
  await page.evaluate((id) => {
    const button = document.querySelector(`button.nav-link[data-view="${id}"]`);
    button?.scrollIntoView({ block: "center", inline: "nearest" });
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, viewId);
  await waitForSettledUi(page);
}

async function logout(page) {
  await clearSession(page);
  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginForm").waitFor({ state: "attached" });
}

async function canMemberLogin(code, identifier, password) {
  try {
    const response = await fetch(`${uiBaseUrl}/api/v1/member-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saccoCode: code, identifier, password })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUi() {
  const deadline = Date.now() + 60000;
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
    localStorage.removeItem("tereka-member-offline-drafts-v1");
    localStorage.removeItem("sacco-platform-api-session-v1");
    localStorage.removeItem("sacco-platform-member-session-v1");
  });
}

async function waitForSettledUi(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(250);
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

async function expectText(page, text, label) {
  const deadline = Date.now() + timeoutMs;
  const expected = text.toLowerCase();
  while (Date.now() < deadline) {
    const bodyText = await page.locator("body").evaluate((body) => body.textContent || "");
    if (bodyText.toLowerCase().includes(expected)) {
      console.log(`PASS ${label}`);
      return;
    }
    await delay(250);
  }
  const bodyText = await page.locator("body").innerText();
  throw new Error(`${label} did not render expected text: ${text}. Body excerpt: ${bodyText.slice(0, 700)}`);
}

async function expectNoText(page, text, label) {
  const bodyText = await page.locator("body").innerText();
  if (bodyText.toLowerCase().includes(text.toLowerCase())) {
    throw new Error(`${label} should not be visible: ${text}`);
  }
  console.log(`PASS ${label}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
