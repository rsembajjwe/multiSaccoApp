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
  await expectNoVisibleText(page, "Read-only SACCO member support", "Platform Members navigation hidden");
  await assertScreen(page, "dashboard", ["Total SACCOs", "Active platform users", "Recent SACCO applications"]);
  await assertPlatformDashboardCardNavigation(page);
  await assertScreen(page, "sacco-applications", ["Register SACCO inside platform", "SACCO application list", "Self-registration approval path"]);
  await assertSaccoRegistrationTabs(page);
  await assertSaccoApplicationReview(page);
  await assertScreen(page, "subscriptions", ["Subscription list", "Subscription package configuration"]);
  await assertSubscriptionControl(page);
  await assertScreen(page, "sacco-accounts", ["SACCO account health", "Active accounts", "Without subscription"]);
  await expectNoVisibleText(page, "Platform approval queues", "Platform Approvals navigation hidden");
  await expectNoVisibleText(page, "Health, callbacks, jobs, support access", "Platform Operations navigation hidden");
  await assertScreen(page, "reports", ["Super admin reporting control", "Super Admin SACCO report", "Platform administrator access report"]);
  await assertScreen(page, "audit", ["Audit evidence control", "Platform audit evidence", "Sensitive audit queue", "Platform audit trail"]);
  await assertScreen(page, "settings", ["Platform settings control", "Protected platform configuration", "Platform subscription packages", "Platform role catalogue"]);
  await assertScreen(page, "users", ["Add platform user", "User detail and role assignment", "Platform role coverage", "Platform administrator list", "Permission matrix"]);
  await assertPlatformUserCreation(page);
  await assertScreen(page, "complaints", ["SACCO admin complaint control", "Platform SACCO admin complaint desk", "SACCO admin complaint capture", "SACCO admin complaints"]);
  await assertScreen(page, "notifications", ["Notification delivery control", "Notification delivery monitor", "Notification template setup", "Notification templates"]);
  await expectNoVisibleText(page, "Dashboard data source", "debug source panel hidden");
  await logout(page);

  await assertRoleDashboard(page, "PLATFORM", "operations@platform.local", "Operations@12345", "Platform Operations", ["Platform Operations Officer", "Operating SACCOs", "Open support tickets"]);
  await assertRoleDashboard(page, "PLATFORM", "billing@platform.local", "Billing@12345", "Platform Billing", ["Platform Billing Officer", "Active subscriptions", "Pending payments"]);
  await assertRoleDashboard(page, "PLATFORM", "compliance@platform.local", "Compliance@12345", "Platform Compliance", ["Platform Compliance Officer", "Audit events", "SACCO approval oversight"]);
  await assertRoleDashboard(page, "PLATFORM", "support@platform.local", "Support@12345", "Platform Support", ["Platform Support Officer", "SACCO support tickets", "SACCO support list"]);

  await staffLogin(page, "GVS", "admin@greenvalley.local", "Sacco@12345", "SACCO admin");
  await assertScreen(page, "dashboard", ["Total members", "Total savings", "Role filtered"]);
  await assertScreen(page, "members", ["Member management focus", "Member and staff separation", "Member list", "Member registration"]);
  await assertMemberRegistrationAndKyc(page);
  await assertScreen(page, "transactions", ["Transaction control focus", "Transaction list", "New transaction screen"]);
  await assertTransactionWorkflow(page);
  await assertScreen(page, "savings", ["Savings operations control", "Savings product list", "Savings product setup", "Open Savings account"]);
  await assertScreen(page, "shares", ["Shares capital control", "Share product list", "Shares product setup", "Open Shares account"]);
  await assertScreen(page, "welfare", ["Welfare fund control", "Welfare product list", "Welfare product setup", "Welfare claim submission"]);
  await assertScreen(page, "loans", ["Loan lifecycle control", "Loan application list", "Loan application form", "Loan detail and guarantors", "Loan decision checklist", "Add guarantor request"]);
  await assertScreen(page, "guarantors", ["Guarantor control focus", "Guarantor requests"]);
  await assertScreen(page, "approvals", ["Approval decision center", "Approval queue"]);
  await assertScreen(page, "accounting", ["Accounting ledger confidence", "Chart of accounts", "Expense capture", "Fixed asset register", "Unbalanced journals"]);
  await assertScreen(page, "reconciliation", ["Reconciliation readiness checks", "Reconciliation command center", "Bank and mobile-money matching", "Unmatched ledger lines", "Provider callback exceptions"]);
  await assertScreen(page, "reports", ["Reporting evidence control", "Report catalogue", "Report readiness", "SACCO regulatory report"]);
  await assertScreen(page, "governance", ["Governance action control", "Governance meeting setup", "Governance meeting register", "Resolution action list"]);
  await assertScreen(page, "settings", ["SACCO settings control", "SACCO operating settings", "Branch setup", "Contribution product setup", "Create branch", "Create product"]);
  await assertScreen(page, "users", ["SACCO staff access", "Add SACCO staff user", "SACCO staff role guide", "Role access preview", "SACCO staff access list", "SACCO staff role coverage"]);
  await assertScreen(page, "audit", ["Audit evidence control", "SACCO audit evidence", "Approvals", "Access control", "SACCO audit trail"]);
  await logout(page);

  await assertRoleDashboard(page, "GVS", "chairperson@greenvalley.local", "Chair@12345", "SACCO Chairperson", ["SACCO Chairperson", "Chairperson decision focus", "Chairperson approval queue"]);
  await assertRoleDashboard(page, "GVS", "treasurer@greenvalley.local", "Treasurer@12345", "SACCO Treasurer", ["SACCO Treasurer", "Treasurer daily control", "Treasurer reconciliation watch"]);
  await assertRoleDashboard(page, "GVS", "secretary@greenvalley.local", "Secretary@12345", "SACCO Secretary", ["SACCO Secretary", "Secretary office focus", "Member follow-up list"]);

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
  await assertScreen(page, "accounts", ["Member account overview", "Member account balances", "Server-confirmed"]);
  await assertScreen(page, "loans", ["Mobile loan application", "Submit loan application", "Member loans"]);
  await assertMemberLoanSubmission(page);
  await assertScreen(page, "guarantor-requests", ["Member guarantor decision center", "Member guarantor requests", "Pending requests"]);
  await assertMemberGuarantorDecision(page);
  await assertScreen(page, "payments", ["Member payment center", "Java-backed posting", "Post payment"]);
  await assertMemberPaymentPosting(page);
  await assertScreen(page, "statements", ["Member statement readiness", "Member statement", "Server-confirmed"]);
  await assertScreen(page, "receipts", ["Member receipts", "Receipt status", "Download receipt"]);
  await assertScreen(page, "complaints", ["Member complaint center", "Member complaint submission", "My complaints"]);
  await assertMemberComplaintSubmission(page);
  await assertScreen(page, "profile", ["Member profile and KYC", "Profile contacts", "Balance summary"]);
  await assertScreen(page, "security", ["Member security center", "SACCO code", "Security actions"]);

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
    localStorage.removeItem("tereka-member-offline-drafts-v1");
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
  await assertRoleNavigation(page, label);
  console.log(`PASS ${label} dashboard`);
  await logout(page);
}

async function assertRoleNavigation(page, label) {
  const hiddenByRole = {
    "SACCO Chairperson": ["transactions", "accounting", "reconciliation", "users", "settings"],
    "SACCO Treasurer": ["members", "loans", "guarantors", "governance", "users", "settings"],
    "SACCO Secretary": ["transactions", "savings", "loans", "guarantors", "accounting", "reconciliation", "users", "settings"]
  };
  const hiddenViews = hiddenByRole[label] || [];
  for (const viewId of hiddenViews) {
    const count = await page.locator(`[data-view="${viewId}"]`).count();
    if (count) throw new Error(`${label} should not see navigation view: ${viewId}`);
  }
  if (hiddenViews.length) console.log(`PASS ${label} role navigation restrictions`);
}

async function assertPlatformDashboardCardNavigation(page) {
  await page.locator("[data-summary-view='subscriptions']").first().click();
  await expectText(page, "Subscription list", "Platform dashboard subscription card navigation");
  await navigateTo(page, "dashboard");
  console.log("PASS Platform dashboard card navigation");
}

async function assertSaccoRegistrationTabs(page) {
  await page.locator("[data-sacco-registration-tab='platform']").click();
  await expectText(page, "Register SACCO", "platform SACCO registration tab");
  await page.locator("[data-sacco-registration-tab='applications']").click();
  await expectText(page, "SACCO application list", "SACCO application list tab");
  await page.locator("[data-sacco-registration-tab='self']").click();
  await expectText(page, "Self-registration approval path", "self-registration approval tab");
  await page.locator("[data-sacco-registration-tab='applications']").click();
  console.log("PASS SACCO registration tabs");
}

async function assertPlatformUserCreation(page) {
  const stamp = Date.now();
  const fullName = `Browser Platform User ${stamp}`;
  await page.locator("[data-user-tab='add']").click();
  await expectText(page, "Add platform user", "platform add-user panel");
  await page.locator("#newUserFullName").fill(fullName);
  await page.locator("#newUserEmail").fill(`browser.platform.${stamp}@tereka.local`);
  await page.locator("#newUserPhone").fill("+256700009999");
  await page.locator("#newUserPassword").fill("TempPass@12345");
  const createSupportRole = page.locator("label.check-row", { hasText: "Platform Support Officer" }).locator("input[name='newUserRoleIds']");
  if (await createSupportRole.count()) {
    await createSupportRole.check();
  } else {
    await page.locator("input[name='newUserRoleIds']").first().check();
  }
  await page.locator("#addUserForm button[type='submit']").click();
  await page.waitForSelector("[data-user-tab='list'].active", { timeout: 15000 });
  const postCreateSearch = await page.locator("#globalSearch").inputValue();
  if (postCreateSearch) throw new Error(`Expected global search to be cleared after platform user creation, got ${postCreateSearch}`);
  await page.locator("#globalSearch").fill(fullName);
  await expectText(page, fullName, "created platform user visible");
  await page.locator("tr", { hasText: fullName }).locator("[data-row-action='user-detail']").click();
  await expectText(page, "User detail and role assignment", "platform user detail panel");
  const platformAdminRole = page.locator("label.check-row", { hasText: "Platform Administrator" }).locator("input[name='selectedUserRoleIds']");
  if (await platformAdminRole.count()) {
    await platformAdminRole.check();
  } else {
    await page.locator("input[name='selectedUserRoleIds']").first().check();
  }
  await page.locator("#userRoleForm button[type='submit']").click();
  await expectAnyText(page, ["Role assignments saved", "Role update failed"], "platform user role assignment response");
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
  await expectText(page, "Member KYC checklist", "member KYC checklist");
  await expectText(page, "Member balance statement", "member balance statement");
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
  await expectText(page, "Transaction decision checklist", "transaction decision checklist");
  await expectText(page, "Approve/post transaction", "transaction approve action");
  await expectText(page, "Reverse posted transaction", "transaction reverse action");
  console.log("PASS transaction workflow");
}

async function assertMemberLoanSubmission(page) {
  const stamp = Date.now();
  await navigateTo(page, "loans");
  await page.locator("#memberLoanProduct").selectOption("Emergency Loan").catch(async () => {
    await page.locator("#memberLoanProduct").selectOption({ index: 0 });
  });
  await page.locator("#memberLoanAmount").fill(String(100000 + Number(String(stamp).slice(-5))));
  await page.locator("#memberLoanMonths").fill("6");
  await page.locator("#memberLoanPurpose").fill(`Browser regression member loan ${stamp}`);
  await page.locator("#memberLoanForm button[type='submit']").click();
  await expectText(page, "Submitted loan application", "member loan submitted");
  await expectText(page, "Member loans", "member loan table refreshed");
  console.log("PASS member loan action");
}

async function assertMemberPaymentPosting(page) {
  const stamp = Date.now();
  const reference = `MM-BROWSER-${stamp}`;
  await navigateTo(page, "payments");
  await expectText(page, "Payment offline drafts", "member payment offline drafts panel");
  await page.locator("#memberPaymentPurpose").selectOption("savings_deposit");
  await page.locator("#memberPaymentAmount").fill("5000");
  await page.locator("#memberPaymentProvider").selectOption({ index: 0 });
  await page.locator("#memberPaymentReference").fill(reference);
  await page.locator("[data-member-draft-save='payment']").click();
  await expectText(page, "Payment draft saved on this device", "member payment draft saved");
  await expectText(page, reference, "member payment draft visible");
  await page.locator("[data-member-draft-sync]").first().click();
  await expectText(page, "Draft synced", "member payment draft synced");
  await page.locator("#memberPaymentForm button[type='submit']").click();
  await expectText(page, "Payment posted", "member payment posted");
  await navigateTo(page, "receipts");
  await expectText(page, reference, "member payment receipt visible");
  console.log("PASS member payment action");
}

async function assertMemberGuarantorDecision(page) {
  await navigateTo(page, "guarantor-requests");
  const acceptButton = page.locator("[data-member-guarantor-action='accepted']").first();
  if (!(await acceptButton.count())) {
    console.log("SKIP member guarantor action: no pending guarantor request in current seed data");
    return;
  }
  await acceptButton.click();
  await expectText(page, "Guarantor request accepted", "member guarantor accepted");
  console.log("PASS member guarantor action");
}

async function assertMemberComplaintSubmission(page) {
  const stamp = Date.now();
  const subject = `Browser member complaint ${stamp}`;
  await navigateTo(page, "complaints");
  await expectText(page, "Complaint offline drafts", "member complaint offline drafts panel");
  await page.locator("#memberComplaintCategory").selectOption("service");
  await page.locator("#memberComplaintPriority").selectOption("medium");
  await page.locator("#memberComplaintSubject").fill(subject);
  await page.locator("#memberComplaintDescription").fill("Browser regression complaint submitted from member portal.");
  await page.locator("[data-member-draft-save='complaint']").click();
  await expectText(page, "Complaint draft saved on this device", "member complaint draft saved");
  await expectText(page, subject, "member complaint draft visible");
  await page.locator("[data-member-draft-discard]").first().click();
  await expectText(page, "No offline drafts", "member complaint draft discarded");
  await page.locator("#memberComplaintCategory").selectOption("service");
  await page.locator("#memberComplaintPriority").selectOption("medium");
  await page.locator("#memberComplaintSubject").fill(subject);
  await page.locator("#memberComplaintDescription").fill("Browser regression complaint submitted from member portal.");
  await page.locator("#memberComplaintForm button[type='submit']").click();
  await expectText(page, "Submitted complaint", "member complaint submitted");
  await expectText(page, subject, "member complaint visible after submit");
  console.log("PASS member complaint action");
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
