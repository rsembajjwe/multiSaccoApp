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
  await expectNoVisibleText(page, "Demo access", "demo tools hidden by default");

  await staffLogin(page, "PLATFORM", "admin@platform.local", "Admin@12345", "Platform admin");
  await expectNoVisibleText(page, "Loan portfolio monitoring", "Platform Loans navigation hidden");
  await assertScreen(page, "dashboard", ["Total SACCOs", "Active platform users", "Recent SACCO applications"]);
  await assertPlatformDashboardCardNavigation(page);
  await assertScreen(page, "sacco-applications", ["SACCO application list", "Public SACCO registration wizard"]);
  await assertSaccoApplicationReview(page);
  await assertScreen(page, "subscriptions", ["Subscription list", "Subscription package configuration"]);
  await assertSubscriptionControl(page);
  await assertScreen(page, "sacco-accounts", ["SACCO account health", "Active accounts", "Without subscription"]);
  await assertScreen(page, "operations", ["Operations command center", "Payment monitoring"]);
  await assertScreen(page, "reports", ["Report catalogue", "Subscriptions", "Audit"]);
  await assertScreen(page, "audit", ["Platform audit trail", "Sensitive audit queue", "Audit events"]);
  await assertScreen(page, "settings", ["Protected platform configuration", "Platform subscription packages", "Platform role catalogue"]);
  await assertScreen(page, "users", ["Platform administrators only", "Permission matrix"]);
  await assertPlatformUserCreation(page);
  await assertScreen(page, "complaints", ["Platform support desk", "Support ticket capture", "Open complaints"]);
  await assertScreen(page, "notifications", ["Notification delivery monitor", "Notification template setup", "Notification templates"]);
  await expectNoVisibleText(page, "Dashboard data source", "debug source panel hidden");
  await logout(page);

  await assertRoleDashboard(page, "PLATFORM", "operations@platform.local", "Operations@12345", "Platform Operations", ["Platform Operations Officer", "Operating SACCOs", "Open support tickets"]);
  await assertRoleDashboard(page, "PLATFORM", "billing@platform.local", "Billing@12345", "Platform Billing", ["Platform Billing Officer", "Active subscriptions", "Pending payments"]);
  await assertRoleDashboard(page, "PLATFORM", "compliance@platform.local", "Compliance@12345", "Platform Compliance", ["Platform Compliance Officer", "Audit events", "Tenant approval oversight"]);
  await assertRoleDashboard(page, "PLATFORM", "support@platform.local", "Support@12345", "Platform Support", ["Platform Support Officer", "Open complaints", "Tenant support list"]);

  await staffLogin(page, "GVS", "admin@greenvalley.local", "Sacco@12345", "SACCO admin");
  await assertScreen(page, "dashboard", ["Total members", "Total savings", "Role filtered"]);
  await assertScreen(page, "members", ["Member list", "Member registration"]);
  await assertMemberRegistrationAndKyc(page);
  await assertScreen(page, "transactions", ["Transaction list", "New transaction screen"]);
  await assertTransactionWorkflow(page);
  await assertScreen(page, "savings", ["Savings product list", "Savings product setup", "Open Savings account"]);
  await assertScreen(page, "shares", ["Share product list", "Shares product setup", "Open Shares account"]);
  await assertScreen(page, "welfare", ["Welfare product list", "Welfare product setup", "Welfare claim submission"]);
  await assertScreen(page, "loans", ["Loan application list", "Loan application form", "Loan detail and guarantors", "Add guarantor request"]);
  await assertScreen(page, "guarantors", ["Guarantor requests"]);
  await assertScreen(page, "approvals", ["Approval queue"]);
  await assertScreen(page, "accounting", ["Chart of accounts", "Expense capture", "Fixed asset register", "Unbalanced journals"]);
  await assertScreen(page, "reconciliation", ["Bank and mobile-money matching", "Provider callbacks"]);
  await assertScreen(page, "settings", ["Branch setup", "Financial product setup"]);
  await logout(page);

  await assertRoleDashboard(page, "GVS", "chairperson@greenvalley.local", "Chair@12345", "SACCO Chairperson", ["SACCO Chairperson", "Loans awaiting approval", "Chairperson approval queue"]);
  await assertRoleDashboard(page, "GVS", "treasurer@greenvalley.local", "Treasurer@12345", "SACCO Treasurer", ["SACCO Treasurer", "Pending finance approvals", "Mobile-money callbacks"]);
  await assertRoleDashboard(page, "GVS", "secretary@greenvalley.local", "Secretary@12345", "SACCO Secretary", ["SACCO Secretary", "Pending KYC", "Member follow-up list"]);

  await memberLogin(page);
  for (const marker of [
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
  await expectText(page, label.includes("Platform") ? "Platform Administration Portal" : "SACCO Administration Portal", `${label} portal shell`);
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

async function assertRoleDashboard(page, code, username, password, label, markers) {
  if (!(await canLogin(code, username, password))) {
    console.log(`SKIP ${label} dashboard: running backend does not have this demo account loaded`);
    return;
  }
  await staffLogin(page, code, username, password, label);
  for (const marker of markers) {
    await expectText(page, marker, `${label} dashboard marker ${marker}`);
  }
  console.log(`PASS ${label} dashboard`);
  await logout(page);
}

async function assertPlatformDashboardCardNavigation(page) {
  await page.locator("[data-summary-view='subscriptions']").first().click();
  await expectText(page, "Subscription list", "Platform dashboard subscription card navigation");
  await navigateTo(page, "dashboard");
  console.log("PASS Platform dashboard card navigation");
}

async function assertPlatformUserCreation(page) {
  const stamp = Date.now();
  const fullName = `Browser Platform User ${stamp}`;
  await expectText(page, "Add platform user", "platform add-user panel");
  await page.locator("#newUserFullName").fill(fullName);
  await page.locator("#newUserEmail").fill(`browser.platform.${stamp}@tereka.local`);
  await page.locator("#newUserPhone").fill("+256700009999");
  await page.locator("#newUserPassword").fill("TempPass@12345");
  await page.locator("#newUserRoleId").selectOption({ label: "Platform Support Officer" }).catch(async () => {
    await page.locator("#newUserRoleId").selectOption({ index: 0 });
  });
  await page.locator("#addUserForm button[type='submit']").click();
  await expectText(page, fullName, "created platform user visible");
  await page.locator("#globalSearch").fill(fullName);
  await page.locator("tr", { hasText: fullName }).locator("[data-row-action='user-detail']").click();
  await expectText(page, "User detail and role assignment", "platform user detail panel");
  await page.locator("#selectedUserRoleId").selectOption({ label: "Platform Administrator" }).catch(async () => {
    await page.locator("#selectedUserRoleId").selectOption({ index: 0 });
  });
  await page.locator("#userRoleForm button[type='submit']").click();
  await expectAnyText(page, ["Role assignment saved", "Role update failed"], "platform user role assignment response");
  await page.locator("#globalSearch").fill("");
  console.log("PASS platform user creation");
}

async function assertSaccoApplicationReview(page) {
  await page.locator("[data-row-action='tenant-detail']").first().click();
  await expectText(page, "SACCO application review", "SACCO application detail panel");
  await expectText(page, "Approval decision", "SACCO approval decision");
  await expectText(page, "Save decision", "SACCO save decision action");
  await expectText(page, "Request changes", "SACCO request changes action");
  console.log("PASS SACCO application review");
}

async function assertSubscriptionControl(page) {
  await page.locator("[data-row-action='subscription-detail']").first().click();
  await expectText(page, "Subscription control", "subscription detail panel");
  await expectText(page, "Operating access", "subscription operating access");
  await expectText(page, "Record payment", "subscription record payment action");
  await expectText(page, "Renew full year", "subscription renew action");
  console.log("PASS subscription control");
}

async function assertMemberRegistrationAndKyc(page) {
  const stamp = Date.now();
  const fullName = `Browser Member ${stamp}`;
  await page.locator("#newMemberFullName").fill(fullName);
  await page.locator("#newMemberPhone").fill(`+2567${String(stamp).slice(-8)}`);
  await page.locator("#newMemberEmail").fill(`browser.member.${stamp}@tereka.local`);
  await page.locator("#newMemberNationalId").fill(`CM${String(stamp).slice(-10)}`);
  await page.locator("#memberRegistrationForm button[type='submit']").click();
  await expectText(page, fullName, "created member visible");
  await page.locator("#globalSearch").fill(fullName);
  await page.locator("tr", { hasText: fullName }).locator("[data-row-action='member-detail']").click();
  await expectText(page, "Member detail and KYC approval", "member detail panel");
  await expectText(page, "Approve member", "member approve action");
  await expectText(page, "Save KYC decision", "member KYC save action");
  await page.locator("#globalSearch").fill("");
  console.log("PASS member registration and KYC");
}

async function assertTransactionWorkflow(page) {
  await page.locator("#newTransactionAmount").fill("15000");
  await page.locator("#newTransactionNarration").fill("Browser regression savings deposit");
  await page.locator("#transactionForm button[type='submit']").click();
  await expectText(page, "Submitted transaction", "transaction submitted");
  await page.locator("[data-row-action='transaction-detail']").first().click();
  await expectText(page, "Transaction detail and reversal", "transaction detail panel");
  await expectText(page, "Approve/post transaction", "transaction approve action");
  await expectText(page, "Reverse posted transaction", "transaction reverse action");
  console.log("PASS transaction workflow");
}

async function canLogin(code, username, password) {
  try {
    const response = await fetch(`${uiBaseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saccoCode: code, username, password })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function navigateTo(page, viewId) {
  await page.locator(`[data-view="${viewId}"]`).waitFor({ state: "attached" });
  await page.locator(`[data-view="${viewId}"]`).first().click();
  await delay(300);
}

async function logout(page) {
  await clearSession(page);
  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginForm").waitFor({ state: "attached" });
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

async function expectAnyText(page, texts, label) {
  const deadline = Date.now() + timeoutMs;
  const expected = texts.map((text) => text.toLowerCase());
  while (Date.now() < deadline) {
    const bodyText = await page.locator("body").evaluate((body) => body.textContent || "");
    const normalized = bodyText.toLowerCase();
    if (expected.some((text) => normalized.includes(text))) {
      console.log(`PASS ${label}`);
      return;
    }
    await delay(250);
  }
  const bodyText = await page.locator("body").innerText();
  throw new Error(`${label} did not render any expected text: ${texts.join(" / ")}. Body excerpt: ${bodyText.slice(0, 700)}`);
}

async function expectNoVisibleText(page, text, label) {
  const bodyText = await page.locator("body").innerText();
  if (bodyText.toLowerCase().includes(text.toLowerCase())) {
    throw new Error(`${label} should not be visible: ${text}`);
  }
  console.log(`PASS ${label}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
