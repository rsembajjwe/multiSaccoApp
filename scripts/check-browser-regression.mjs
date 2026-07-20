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
  await expectText(page, "Login to Tereka Online", "login-first screen");
  await expectText(page, "Enterprise SACCO access gateway", "enterprise login gateway");
  await expectText(page, "Register SACCO", "public SACCO registration link");
  await expectText(page, "Forgot password", "forgot password link");
  await expectNoVisibleText(page, "Demo access", "demo tools hidden by default");
  await assertPasswordRecovery(page);
  await assertPublicSaccoRegistration(page);

  await staffLogin(page, "PLATFORM", "admin@platform.local", "Admin@12345", "Platform admin");
  await assertStaffSessionMenu(page);
  await assertPlatformHelpMenu(page);
  await assertStaffAccountMenu(page);
  await assertTopbarMenuDismissal(page);
  await assertMobileTopbarMenus(page);
  await assertNotificationBadgeRouting(page, "Notification delivery control", "staff notification badge routing");
  await expectNoVisibleText(page, "Loan portfolio monitoring", "Platform Loans navigation hidden");
  await expectNoVisibleText(page, "Read-only SACCO member support", "Platform Members navigation hidden");
  await assertScreen(page, "dashboard", ["Total SACCOs", "Active platform users", "Recent SACCO applications"]);
  await expectNoVisibleText(page, "Some records could not be loaded", "optional platform fallback warning hidden");
  await assertPlatformDashboardCardNavigation(page);
  await assertScreen(page, "sacco-applications", ["Register SACCO inside platform", "SACCO application list", "Self-registration approval path"]);
  await assertSaccoRegistrationTabs(page);
  await assertQuickSearchResult(page, "Green Valley", "SACCO application review", "platform SACCO quick search");
  await assertQuickSearchKeyboard(page, "Lake Farmers", "SACCO application review", "platform SACCO keyboard quick search");
  await assertSaccoApplicationReview(page);
  await assertScreen(page, "subscriptions", ["Subscription list", "Package Setup", "Manage package"]);
  await assertSubscriptionControl(page);
  await assertScreen(page, "sacco-accounts", ["SACCO account health", "Active accounts", "Without subscription"]);
  await expectNoVisibleText(page, "Platform approval queues", "Platform Approvals navigation hidden");
  await expectNoVisibleText(page, "Health, callbacks, jobs, support access", "Platform Operations navigation hidden");
  await assertScreen(page, "reports", ["Super admin reporting control", "Super Admin SACCO report", "Platform administrator access report"]);
  await assertScreen(page, "audit", ["Audit evidence control", "Platform audit evidence", "Sensitive audit queue", "Platform audit trail"]);
  await assertScreen(page, "settings", ["Platform settings control", "Protected platform configuration", "Platform subscription packages", "Platform role catalogue"]);
  await assertScreen(page, "users", ["Add platform user", "User detail and role assignment", "Platform role coverage", "Platform administrator list", "Permission matrix"]);
  await assertPlatformUserCreation(page);
  await assertScreen(page, "complaints", ["Complaints from SACCO admins", "Open platform support cases", "Export complaints"]);
  await assertScreen(page, "notifications", ["Notification delivery control", "Notification delivery monitor", "Notification template setup", "Notification templates"]);
  await expectNoVisibleText(page, "Dashboard data source", "debug source panel hidden");
  await logout(page);

  await assertRoleDashboard(page, "PLATFORM", "operations@platform.local", "Operations@12345", "Platform Operations", ["Platform Operations Officer", "Operating SACCOs", "Open support tickets"]);
  await assertRoleDashboard(page, "PLATFORM", "billing@platform.local", "Billing@12345", "Platform Billing", ["Platform Billing Officer", "Active subscriptions", "Pending payments"]);
  await assertRoleDashboard(page, "PLATFORM", "compliance@platform.local", "Compliance@12345", "Platform Compliance", ["Platform Compliance Officer", "Audit events", "SACCO approval oversight"]);
  await assertRoleDashboard(page, "PLATFORM", "support@platform.local", "Support@12345", "Platform Support", ["Platform Support Officer", "SACCO support tickets", "SACCO support list"]);

  await staffLogin(page, "GVS", "admin@greenvalley.local", "Sacco@12345", "SACCO admin");
  await expectNoVisibleText(page, "SACCO Administrator", "SACCO Administrator label hidden");
  await expectNoVisibleText(page, "SACCO role access", "SACCO role access panel hidden");
  await assertScreen(page, "dashboard", ["Total members", "Total savings", "Recent transactions", "Loan work queue", "SACCO monthly performance control", "Treasurer cash collections", "Mobile money collections"]);
  await assertScreen(page, "members", ["Member Overview", "Register Member", "Member List", "KYC Detail", "Contacts & Documents", "Statement", "Member management focus"]);
  await assertMemberRegistrationAndKyc(page);
  await assertQuickSearchResult(page, "GVS-0001", "Member detail and KYC approval", "SACCO member quick search");
  await assertModuleTabs(page, "transactions", [
    ["overview", ["Transaction control focus"]],
    ["capture", ["New transaction screen"]],
    ["list", ["Transaction list"]]
  ]);
  await assertTransactionWorkflow(page);
  await assertModuleTabs(page, "savings", [
    ["overview", ["Savings operations control"]],
    ["monthly", ["SACCO monthly performance control", "Member monthly performance", "Treasurer cash collections", "Mobile money collections"]],
    ["products", ["Savings product setup"]],
    ["accounts", ["Open Savings account"]],
    ["lists", ["Savings product list", "Savings accounts"]]
  ]);
  await assertModuleTabs(page, "shares", [
    ["overview", ["Shares capital control"]],
    ["products", ["Shares product setup"]],
    ["accounts", ["Open Shares account"]],
    ["register", ["Share product list", "Share register"]]
  ]);
  await assertModuleTabs(page, "welfare", [
    ["overview", ["Welfare fund control"]],
    ["products", ["Welfare product setup"]],
    ["claims", ["Welfare claim submission", "Welfare claims"]],
    ["detail", ["Welfare claim decision"]]
  ]);
  await assertModuleTabs(page, "loans", [
    ["overview", ["Loan lifecycle control"]],
    ["application", ["Loan application form"]],
    ["list", ["Loan application list"]]
  ]);
  await assertModuleTabs(page, "guarantors", [
    ["overview", ["Guarantor control focus"]],
    ["requests", ["Guarantor requests"]]
  ]);
  await assertModuleTabs(page, "approvals", [
    ["overview", ["Approval decision center"]],
    ["queue", ["Approval queue"]]
  ]);
  await assertModuleTabs(page, "accounting", [
    ["overview", ["Accounting ledger confidence"]],
    ["capture", ["Expense capture", "Fixed asset register"]],
    ["setup", ["Chart of accounts"]],
    ["journals", ["Recent journal entries"]]
  ]);
  await assertModuleTabs(page, "reconciliation", [
    ["overview", ["Reconciliation readiness checks", "Reconciliation command center"]],
    ["matches", ["Bank and mobile-money matching", "Provider callback exceptions"]],
    ["exceptions", ["Unmatched bank statement lines", "Unmatched ledger lines"]]
  ]);
  await assertModuleTabs(page, "reports", [
    ["overview", ["Reporting evidence control"]],
    ["catalogue", ["Report catalogue"]],
    ["readiness", ["Report readiness"]],
    ["regulatory", ["SACCO regulatory report"]]
  ]);
  await assertModuleTabs(page, "governance", [
    ["overview", ["Governance action control"]],
    ["setup", ["Governance meeting setup"]],
    ["register", ["Governance meeting register"]],
    ["resolutions", ["Resolution action list"]]
  ]);
  await assertScreen(page, "settings", ["Settings Overview", "Branch Setup", "Product Setup", "Setup Records", "SACCO settings control", "SACCO operating settings"]);
  await assertSaccoSettingsTabs(page);
  await assertScreen(page, "users", ["SACCO staff access", "Add SACCO staff user", "SACCO staff role guide", "Role access preview", "SACCO staff access list", "SACCO staff role coverage"]);
  await assertModuleTabs(page, "audit", [
    ["overview", ["Audit evidence control"]],
    ["evidence", ["SACCO audit evidence", "Approvals", "Access control"]],
    ["trail", ["SACCO audit trail"]]
  ]);
  await logout(page);

  await assertRoleDashboard(page, "GVS", "chairperson@greenvalley.local", "Chair@12345", "SACCO Chairperson", ["SACCO Chairperson", "Chairperson decision focus", "Chairperson approval queue"]);
  await assertRoleDashboard(page, "GVS", "treasurer@greenvalley.local", "Treasurer@12345", "SACCO Treasurer", ["SACCO Treasurer", "Treasurer daily control", "SACCO monthly performance control", "Treasurer reconciliation watch"]);
  await assertRoleDashboard(page, "GVS", "secretary@greenvalley.local", "Secretary@12345", "SACCO Secretary", ["SACCO Secretary", "Secretary office focus", "Member follow-up list"]);

  if (await canMemberLogin("GVS", "GVS-0001", "Member@12345")) {
    await memberLogin(page);
    await assertMemberSessionMenu(page);
    await assertMemberHelpMenu(page);
    await assertMemberAccountMenu(page);
    await assertNotificationBadgeRouting(page, "Read at", "member notification badge routing");
    await navigateTo(page, "home");
    for (const marker of [
      "Balances and requests update",
      "Total balance",
      "Loans",
      "Notifications",
      "Guarantee requests",
      "Offline drafts",
      "Member service assurance",
      "Service ready",
      "Member command center",
      "Monthly savings",
      "Member quick actions",
      "Pay by mobile money",
      "Read SACCO messages",
      "Submit complaint"
    ]) {
      await expectText(page, marker, `member portal marker ${marker}`);
    }
    await page.locator("[data-module-tab-view='home'][data-module-tab='monthly']").click();
    await expectText(page, "Monthly savings workspace", "member monthly workspace readiness");
    await expectText(page, "Payment channels", "member monthly payment channel readiness");
    await expectText(page, "Monthly savings and deposit performance", "member home monthly savings tab");
    await expectText(page, "Treasurer cash", "member home treasurer cash monthly column");
    await expectText(page, "Mobile money", "member home mobile money monthly column");
    await expectText(page, "2026", "member home full date year");
    await page.locator("[data-module-tab-view='home'][data-module-tab='loans']").click();
    await expectText(page, "Loan servicing workspace", "member loans workspace readiness");
    await expectText(page, "Member loan position", "member home loans tab");
    await page.locator("[data-module-tab-view='home'][data-module-tab='messages']").click();
    await expectText(page, "SACCO admin message center", "member messages workspace readiness");
    await expectText(page, "SACCO admin messages", "member home messages tab");
    await page.locator("[data-module-tab-view='home'][data-module-tab='mobile-money']").click();
    await expectText(page, "Mobile money deposit workspace", "member mobile money workspace readiness");
    await expectText(page, "Mobile money deposit activity", "member home mobile money tab");
    await page.locator("[data-module-tab-view='home'][data-module-tab='overview']").click();
    await assertMemberQuickActions(page);
    await assertScreen(page, "accounts", ["Member account overview", "Member account balances", "Verified"]);
    await assertScreen(page, "loans", ["Mobile loan application", "Submit loan application", "Member loans"]);
    await assertMemberLoanSubmission(page);
    await assertScreen(page, "guarantor-requests", ["Member guarantor decision center", "Member guarantor requests", "Pending requests"]);
    await assertMemberGuarantorDecision(page);
    await assertScreen(page, "payments", ["Member payment center", "Ready to post", "Post payment"]);
    await assertMemberPaymentPosting(page);
    await assertMemberStatementEvidence(page);
    await assertMemberReceiptEvidence(page);
    await assertMemberNotificationCenter(page);
    await assertScreen(page, "complaints", ["Member complaint center", "Member complaint submission", "My complaints"]);
    await assertMemberComplaintSubmission(page);
    await assertMemberProfileTabs(page);
    await assertMemberSecurityTabs(page);
  } else {
    console.log("SKIP member portal path: demo member login is unavailable in the running backend profile");
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
    localStorage.removeItem("tereka-member-offline-drafts-v1");
    localStorage.removeItem("sacco-platform-api-session-v1");
    localStorage.removeItem("sacco-platform-member-session-v1");
  });
}

async function assertPublicSaccoRegistration(page) {
  const stamp = Date.now();
  const saccoName = `Browser Farmers ${stamp} SACCO`;
  await page.locator("[data-auth-tab='register']").click();
  await expectText(page, "Complete SACCO details", "public SACCO registration form");
  await page.locator("#publicTenantName").fill(saccoName);
  await page.locator("#publicTenantRegistrationNo").fill(`PUB-${stamp}`);
  await page.locator("#publicTenantDistrict").fill("Wakiso");
  await page.locator("#publicTenantParish").fill("Nansana");
  await page.locator("#publicTenantVillage").fill("Central");
  await page.locator("#publicTenantContactNumber").fill("+256700123456");
  await page.locator("#publicTenantPaymentPhone").fill("+256700123456");
  await page.locator("#publicSaccoRegistrationForm button[type='submit']").click();
  await expectText(page, "Registration received", "public SACCO registration submitted");
  await expectText(page, "Mobile-money payment prompt initiated", "public SACCO payment initiated");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expectText(page, "Login to Tereka Online", "public SACCO registration returns to login");
  console.log("PASS public SACCO registration");
}

async function staffLogin(page, code, username, password, label) {
  await page.locator("#code").fill(code);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#loginButton").click();
  if (await page.locator("#mfaVerifyForm").count()) {
    await expectText(page, "Verify secure login", `${label} MFA challenge`);
    const bodyText = await page.locator("body").innerText();
    const code = bodyText.match(/\b\d{6}\b/)?.[0];
    if (!code) throw new Error(`${label} MFA challenge did not expose a development code`);
    await page.locator("#mfaCode").fill(code);
    await page.locator("#mfaVerifyButton").click();
  }
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

async function assertNotificationBadgeRouting(page, destinationMarker, label) {
  const badge = page.locator("[data-action='open-notifications']");
  await badge.waitFor({ state: "visible" });
  const title = await badge.getAttribute("title");
  if (!title || !title.includes("notification")) {
    throw new Error(`${label} does not expose an accessible notification title. Current title: ${title || "<empty>"}`);
  }
  const countText = await badge.locator(".notification-badge").first().textContent().catch(() => "");
  if (countText && !/^\d+\+?$/.test(countText.trim())) {
    throw new Error(`${label} badge count is not numeric: ${countText}`);
  }
  await badge.click();
  await expectText(page, destinationMarker, `${label} destination`);
  console.log(`PASS ${label}`);
}

async function assertStaffSessionMenu(page) {
  await page.locator("[data-action='toggle-session-menu']").click();
  await expectText(page, "Session and security", "staff session menu");
  await expectText(page, "Lockout after", "staff lockout policy summary");
  await page.locator("[data-action='open-security-settings']").click();
  await expectText(page, "Password and lockout policy", "staff security settings route");
  await page.locator("[data-module-tab-view='settings'][data-module-tab='configuration']").click();
  await navigateTo(page, "dashboard");
  console.log("PASS staff session security menu");
}

async function assertMemberSessionMenu(page) {
  await page.locator("[data-action='toggle-session-menu']").click();
  await expectText(page, "Session and security", "member session menu");
  await page.locator("[data-action='open-member-security']").click();
  await expectText(page, "Member security center", "member security route");
  await navigateTo(page, "home");
  console.log("PASS member session security menu");
}

async function assertPlatformHelpMenu(page) {
  await page.locator("[data-action='toggle-help-menu']").click();
  await expectText(page, "Help and support", "platform help menu");
  await expectText(page, "SACCO admins", "platform help support path");
  await page.locator("[data-action='open-help-complaints']").click();
  await expectText(page, "Complaints from SACCO admins", "platform help complaints destination");
  await navigateTo(page, "dashboard");
  console.log("PASS platform help menu");
}

async function assertMemberHelpMenu(page) {
  await page.locator("[data-action='toggle-help-menu']").click();
  await expectText(page, "Help and support", "member help menu");
  await expectText(page, "SACCO admin", "member help support path");
  await page.locator("[data-action='open-help-complaints']").click();
  await expectText(page, "Member complaint center", "member help complaints destination");
  await navigateTo(page, "home");
  console.log("PASS member help menu");
}

async function assertStaffAccountMenu(page) {
  await page.locator("[data-action='toggle-account-menu']").click();
  await expectText(page, "admin@platform.local", "staff account identity");
  await expectText(page, "Platform Administrator", "staff account role");
  await page.locator("[data-action='open-account-profile']").click();
  await expectText(page, "User detail and role assignment", "staff account profile route");
  await page.locator("[data-action='close-user-detail']").click();
  await navigateTo(page, "dashboard");
  console.log("PASS staff account menu");
}

async function assertTopbarMenuDismissal(page) {
  await page.locator("[data-action='toggle-help-menu']").click();
  await expectText(page, "Help and support", "topbar help menu before Escape");
  await page.keyboard.press("Escape");
  await expectNoVisibleText(page, "Help and support", "topbar Escape closes menu");
  await page.locator("[data-action='toggle-account-menu']").click();
  await expectText(page, "admin@platform.local", "topbar account menu before outside click");
  await page.locator(".page-header").click();
  await expectNoVisibleText(page, "admin@platform.local", "topbar outside click closes menu");
  await page.locator("#globalSearch").fill("Green Valley");
  await page.locator(".quick-search-panel").waitFor({ state: "visible" });
  await page.mouse.click(40, 420);
  const searchValue = await page.locator("#globalSearch").inputValue();
  if (searchValue) throw new Error(`topbar outside click should clear quick search, got ${searchValue}`);
  console.log("PASS topbar menu dismissal");
}

async function assertMobileTopbarMenus(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await expectText(page, "Dashboard", "mobile dashboard still visible");
  await assertWithinViewport(page, ".topbar-actions", "mobile topbar actions");
  await page.locator("[data-action='toggle-session-menu']").click();
  await expectText(page, "Session and security", "mobile session menu");
  await assertWithinViewport(page, ".session-menu", "mobile session menu");
  await page.keyboard.press("Escape");
  await page.locator("[data-action='toggle-help-menu']").click();
  await expectText(page, "Help and support", "mobile help menu");
  await assertWithinViewport(page, ".help-menu", "mobile help menu");
  await page.keyboard.press("Escape");
  await page.locator("[data-action='toggle-account-menu']").click();
  await expectText(page, "admin@platform.local", "mobile account menu");
  await assertWithinViewport(page, ".account-menu", "mobile account menu");
  await page.keyboard.press("Escape");
  await page.locator("#globalSearch").fill("Green Valley");
  await page.locator(".quick-search-panel").waitFor({ state: "visible" });
  await assertWithinViewport(page, ".quick-search-panel", "mobile quick search panel");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log("PASS mobile topbar menus");
}

async function assertWithinViewport(page, selector, label) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${label} did not produce a bounding box`);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error(`${label} could not read viewport size`);
  if (box.x < -1 || box.y < -1 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
    throw new Error(`${label} overflows viewport ${viewport.width}x${viewport.height}: ${JSON.stringify(box)}`);
  }
}

async function assertMemberAccountMenu(page) {
  await page.locator("[data-action='toggle-account-menu']").click();
  await expectText(page, "GVS-0001", "member account identity");
  await expectText(page, "Member", "member account role");
  await page.locator("[data-action='open-account-profile']").click();
  await expectText(page, "Member profile and KYC", "member account profile route");
  await navigateTo(page, "home");
  console.log("PASS member account menu");
}

async function assertQuickSearchResult(page, query, destinationMarker, label) {
  await page.locator("#globalSearch").fill(query);
  await page.locator(".quick-search-panel").waitFor({ state: "visible" });
  await page.locator("[data-quick-result]").first().click();
  await expectText(page, destinationMarker, `${label} destination`);
  const remainingSearch = await page.locator("#globalSearch").inputValue();
  if (remainingSearch) throw new Error(`${label} should clear global search after opening a result, got ${remainingSearch}`);
  console.log(`PASS ${label}`);
}

async function assertQuickSearchKeyboard(page, query, destinationMarker, label) {
  await page.locator("#globalSearch").fill(query);
  await page.locator(".quick-search-panel").waitFor({ state: "visible" });
  await page.keyboard.press("ArrowDown");
  const activeCount = await page.locator("[data-quick-result].active").count();
  if (!activeCount) throw new Error(`${label} did not highlight a result after ArrowDown`);
  await page.keyboard.press("Escape");
  const clearedSearch = await page.locator("#globalSearch").inputValue();
  if (clearedSearch) throw new Error(`${label} Escape should clear search, got ${clearedSearch}`);
  await page.locator("#globalSearch").fill(query);
  await page.locator(".quick-search-panel").waitFor({ state: "visible" });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expectText(page, destinationMarker, `${label} destination`);
  console.log(`PASS ${label}`);
}

async function assertPasswordRecovery(page) {
  await page.locator("[data-auth-tab='forgot']").click();
  await expectText(page, "Password recovery", "password recovery panel");
  await expectText(page, "Request password reset", "password recovery action");
  await page.locator("#passwordResetEmail").fill("admin@platform.local");
  await page.locator("#passwordResetRequestForm button[type='submit']").click();
  await expectText(page, "password reset request has been recorded", "password reset request response");
  await page.getByRole("button", { name: "Back to login" }).click();
  await expectText(page, "Login to Tereka Online", "password recovery returns to login");
  console.log("PASS password recovery");
}

async function assertModuleTabs(page, viewId, tabAssertions) {
  await navigateTo(page, viewId);
  for (const [tabId, markers] of tabAssertions) {
    await page.locator(`[data-module-tab-view="${viewId}"][data-module-tab="${tabId}"]`).click();
    for (const marker of markers) {
      await expectText(page, marker, `${viewId}/${tabId} marker ${marker}`);
    }
  }
  console.log(`PASS ${viewId} tabs`);
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
  await page.locator("[data-package-manage]").first().click();
  await expectText(page, "Update the subscription package", "package setup dialogue");
  await page.locator("#packageSetupName").fill(`Starter ${Date.now()}`);
  await page.locator("#packageSetupPrice").fill("550000");
  await page.locator("#packageSetupForm button[type='submit']").click();
  await expectText(page, "updated in this session", "package setup save action");
  await page.locator("[data-action='close-package-setup']").click();
  await page.locator("[data-row-action='subscription-detail']").first().click();
  await expectText(page, "Subscription control", "subscription detail panel");
  await expectText(page, "Operating access", "subscription operating access");
  await expectText(page, "Record payment", "subscription record payment action");
  await expectText(page, "Renew full year", "subscription renew action");
  console.log("PASS subscription control");
}

async function assertSaccoSettingsTabs(page) {
  await page.locator("[data-sacco-settings-tab='branches']").click();
  await expectText(page, "Branch setup", "SACCO branch setup tab");
  await expectText(page, "Create branch", "SACCO branch setup action");
  await page.locator("[data-sacco-settings-tab='products']").click();
  await expectText(page, "Contribution product setup", "SACCO product setup tab");
  await expectText(page, "Create product", "SACCO product setup action");
  await page.locator("[data-sacco-settings-tab='records']").click();
  await expectText(page, "Financial product setup", "SACCO setup records tab");
  await page.locator("[data-sacco-settings-tab='overview']").click();
  await expectText(page, "SACCO operating settings", "SACCO settings overview tab");
  console.log("PASS SACCO settings tabs");
}

async function assertMemberRegistrationAndKyc(page) {
  const stamp = Date.now();
  const fullName = `Browser Member ${stamp}`;
  await page.locator("[data-member-tab='register']").click();
  await expectText(page, "Member registration", "member registration tab");
  await page.locator("#newMemberFullName").fill(fullName);
  await page.locator("#newMemberPhone").fill(`+2567${String(stamp).slice(-8)}`);
  await page.locator("#newMemberEmail").fill(`browser.member.${stamp}@tereka.local`);
  await page.locator("#newMemberNationalId").fill(`CM${String(stamp).slice(-10)}`);
  await page.locator("#memberRegistrationForm button[type='submit']").click();
  await expectText(page, fullName, "created member visible");
  await page.locator("[data-member-tab='list']").click();
  await expectText(page, "Member list", "member list tab");
  await page.locator("#globalSearch").fill(fullName);
  await page.locator("tr", { hasText: fullName }).locator("[data-row-action='member-detail']").click();
  await expectText(page, "Member detail and KYC approval", "member detail panel");
  await expectText(page, "Member KYC checklist", "member KYC checklist");
  await expectText(page, "Approve member", "member approve action");
  await expectText(page, "Save KYC decision", "member KYC save action");
  await page.locator("[data-member-tab='contacts']").click();
  await expectText(page, "Member contacts and documents", "member contacts tab");
  await expectText(page, "Member KYC documents", "member KYC documents tab");
  await page.locator("[data-member-tab='statement']").click();
  await expectText(page, "Member balance statement", "member balance statement tab");
  await page.locator("#globalSearch").fill("");
  console.log("PASS member registration and KYC");
}

async function assertTransactionWorkflow(page) {
  await page.locator("[data-module-tab-view='transactions'][data-module-tab='capture']").click();
  await expectText(page, "Office receipt controls", "transaction office receipt controls");
  await expectText(page, "Loan repayment", "transaction loan repayment option");
  await page.locator("#newTransactionType").selectOption("savings_deposit");
  await page.locator("#newTransactionChannel").selectOption("cash");
  await page.locator("#newTransactionAmount").fill("15000");
  await page.locator("#newTransactionNarration").fill("Browser regression Treasurer cash savings deposit");
  await page.locator("#transactionForm button[type='submit']").click();
  await expectText(page, "Submitted transaction", "transaction submitted");
  await page.locator("[data-module-tab-view='transactions'][data-module-tab='list']").click();
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
  await expectText(page, "Payment posting rules", "member payment posting rules");
  await expectText(page, "Treasurer cash result", "member treasurer cash result");
  await expectText(page, "Member payment center", "member payment mobile money tab");
  await page.locator("[data-module-tab-view='payments'][data-module-tab='tracking']").click();
  await expectText(page, "Payment tracking workspace", "member payment tracking tab");
  await expectText(page, "Treasurer cash", "member payment tracking treasurer cash");
  await expectText(page, "Mobile money", "member payment tracking mobile money");
  await expectText(page, "Monthly savings and deposit performance", "member payment monthly performance");
  await page.locator("[data-module-tab-view='payments'][data-module-tab='drafts']").click();
  await expectText(page, "Payment draft workspace", "member payment drafts tab");
  await expectText(page, "Payment offline drafts", "member payment offline drafts panel");
  await page.locator("[data-module-tab-view='payments'][data-module-tab='mobile-money']").click();
  await page.locator("#memberPaymentPurpose").selectOption("savings_deposit");
  await page.locator("#memberPaymentAmount").fill("5000");
  await page.locator("#memberPaymentProvider").selectOption({ index: 0 });
  await page.locator("#memberPaymentReference").fill(reference);
  await page.locator("[data-member-draft-save='payment']").click();
  await expectText(page, "Payment draft saved on this device", "member payment draft saved");
  await page.locator("[data-module-tab-view='payments'][data-module-tab='drafts']").click();
  await expectText(page, reference, "member payment draft visible");
  await page.locator("[data-member-draft-sync]").first().click();
  await expectText(page, "Synced", "member payment draft synced");
  await page.locator("[data-module-tab-view='payments'][data-module-tab='mobile-money']").click();
  await page.locator("#memberPaymentForm button[type='submit']").click();
  await expectText(page, "Payment posted", "member payment posted");
  await navigateTo(page, "receipts");
  await expectText(page, reference, "member payment receipt visible");
  console.log("PASS member payment action");
}

async function assertMemberQuickActions(page) {
  await navigateTo(page, "home");
  await page.locator("[data-member-shortcut-view='payments'][data-member-shortcut-tab='mobile-money']").click();
  await expectText(page, "Member payment center", "member quick action payment screen");
  await expectText(page, "Mobile money", "member quick action payment tab");
  await navigateTo(page, "home");
  await page.locator("[data-member-shortcut-view='notifications'][data-member-shortcut-tab='inbox']").click();
  await expectText(page, "Member message inbox", "member quick action messages");
  await navigateTo(page, "home");
  await page.locator("[data-member-shortcut-view='complaints'][data-member-shortcut-tab='submit']").click();
  await expectText(page, "Member complaint submission", "member quick action complaint");
  await navigateTo(page, "home");
  console.log("PASS member quick actions");
}

async function assertMemberStatementEvidence(page) {
  await navigateTo(page, "statements");
  await expectText(page, "Member statement readiness", "member statement readiness panel");
  await expectText(page, "Full-date display", "member statement full date evidence");
  await page.locator("[data-module-tab-view='statements'][data-module-tab='activity']").click();
  await expectText(page, "Member statement", "member statement activity tab");
  await page.locator("[data-module-tab-view='statements'][data-module-tab='monthly']").click();
  await expectText(page, "Statement monthly evidence", "member statement monthly evidence");
  await expectText(page, "Treasurer cash", "member statement treasurer cash evidence");
  await expectText(page, "Mobile money", "member statement mobile money evidence");
  await page.locator("[data-module-tab-view='statements'][data-module-tab='exports']").click();
  await expectText(page, "Statement export controls", "member statement export controls");
  console.log("PASS member statement evidence");
}

async function assertMemberReceiptEvidence(page) {
  await navigateTo(page, "receipts");
  await expectText(page, "Member receipts", "member receipts table");
  await page.locator("[data-module-tab-view='receipts'][data-module-tab='evidence']").click();
  await expectText(page, "Receipt evidence controls", "member receipt evidence controls");
  await page.locator("[data-module-tab-view='receipts'][data-module-tab='exports']").click();
  await expectText(page, "Receipt export and print", "member receipt export controls");
  console.log("PASS member receipt evidence");
}

async function assertMemberNotificationCenter(page) {
  await navigateTo(page, "notifications");
  await expectText(page, "Member message inbox", "member notification inbox");
  await expectText(page, "SACCO admin messages", "member notification admin messages");
  await page.locator("[data-module-tab-view='notifications'][data-module-tab='unread']").click();
  await expectText(page, "Unread message queue", "member notification unread queue");
  await page.locator("[data-module-tab-view='notifications'][data-module-tab='evidence']").click();
  await expectText(page, "Message delivery evidence", "member notification delivery evidence");
  console.log("PASS member notification center");
}

async function assertMemberProfileTabs(page) {
  await navigateTo(page, "profile");
  await expectText(page, "Member profile and KYC", "member profile overview");
  await page.locator("[data-module-tab-view='profile'][data-module-tab='kyc']").click();
  await expectText(page, "Member KYC readiness", "member profile kyc readiness");
  await page.locator("[data-module-tab-view='profile'][data-module-tab='contacts']").click();
  await expectText(page, "Member contact controls", "member profile contact controls");
  await expectText(page, "Profile contacts", "member profile contacts table");
  await page.locator("[data-module-tab-view='profile'][data-module-tab='balances']").click();
  await expectText(page, "Member balance identity", "member profile balance identity");
  await expectText(page, "Balance summary", "member profile balance table");
  console.log("PASS member profile tabs");
}

async function assertMemberSecurityTabs(page) {
  await navigateTo(page, "security");
  await expectText(page, "Member security center", "member security session");
  await page.locator("[data-module-tab-view='security'][data-module-tab='login']").click();
  await expectText(page, "Member login requirements", "member security login requirements");
  await page.locator("[data-module-tab-view='security'][data-module-tab='recovery']").click();
  await expectText(page, "Member recovery controls", "member security recovery controls");
  await page.locator("[data-module-tab-view='security'][data-module-tab='safety']").click();
  await expectText(page, "Member safety actions", "member security safety actions");
  await expectText(page, "Security actions", "member security actions");
  console.log("PASS member security tabs");
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
  await expectText(page, "Member complaint center", "member complaint center panel");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='drafts']").click();
  await expectText(page, "Complaint draft workspace", "member complaint draft workspace");
  await expectText(page, "Complaint offline drafts", "member complaint offline drafts panel");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='submit']").click();
  await page.locator("#memberComplaintCategory").selectOption("service");
  await page.locator("#memberComplaintPriority").selectOption("medium");
  await page.locator("#memberComplaintSubject").fill(subject);
  await page.locator("#memberComplaintDescription").fill("Browser regression complaint submitted from member portal.");
  await page.locator("[data-member-draft-save='complaint']").click();
  await expectText(page, "Complaint draft saved on this device", "member complaint draft saved");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='drafts']").click();
  await expectText(page, subject, "member complaint draft visible");
  await page.locator("[data-member-draft-discard]").first().click();
  await expectText(page, "No offline drafts", "member complaint draft discarded");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='submit']").click();
  await page.locator("#memberComplaintCategory").selectOption("service");
  await page.locator("#memberComplaintPriority").selectOption("medium");
  await page.locator("#memberComplaintSubject").fill(subject);
  await page.locator("#memberComplaintDescription").fill("Browser regression complaint submitted from member portal.");
  await page.locator("#memberComplaintForm button[type='submit']").click();
  await expectText(page, "Submitted complaint", "member complaint submitted");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='tracking']").click();
  await expectText(page, "Complaint tracking workspace", "member complaint tracking workspace");
  await expectText(page, subject, "member complaint visible after submit");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='evidence']").click();
  await expectText(page, "Complaint evidence controls", "member complaint evidence controls");
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

async function navigateTo(page, viewId) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const clicked = await page.evaluate((targetView) => {
      const button = document.querySelector(`button.nav-link[data-view="${targetView}"]`);
      if (!button) return false;
      button.scrollIntoView({ block: "center", inline: "nearest" });
      button.click();
      return true;
    }, viewId);
    if (!clicked) {
      await delay(150);
      continue;
    }
    const active = await page.evaluate((targetView) => Boolean(document.querySelector(`.nav-link.active[data-view="${targetView}"]`)), viewId);
    if (active) {
      await delay(150);
      return;
    }
    await delay(150);
  }
  try {
    await page.waitForFunction((targetView) => {
      const active = document.querySelector(`.nav-link.active[data-view="${targetView}"]`);
      return Boolean(active);
    }, viewId);
  } catch (error) {
    const details = await page.evaluate((targetView) => {
      const button = document.querySelector(`button.nav-link[data-view="${targetView}"]`);
      const rect = button?.getBoundingClientRect();
      return {
        targetView,
        activeView: document.querySelector(".nav-link.active")?.getAttribute("data-view") || "",
        buttonText: button?.textContent || "",
        buttonRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        bodyExcerpt: document.body.textContent.slice(0, 350)
      };
    }, viewId);
    throw new Error(`Navigation to ${viewId} did not activate: ${JSON.stringify(details)}`);
  }
  await delay(150);
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
