import { spawn } from "node:child_process";
import { chromium } from "playwright";

const uiBaseUrl = (process.env.UI_BASE_URL || `http://127.0.0.1:${process.env.UI_REGRESSION_PORT || 5174}`).replace(/\/$/, "");
const javaApiBase = (process.env.JAVA_API_BASE || "http://127.0.0.1:8080").replace(/\/$/, "");
const shouldStartUi = process.env.UI_BASE_URL ? false : process.env.UI_START_SERVER !== "0";
const headless = process.env.UI_REGRESSION_HEADLESS !== "0";

let server = null;
let browser = null;

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

  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(Number(process.env.UI_REGRESSION_TIMEOUT_MS || 15000));

  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });

  await staffLogin(page);
  await assertStaffScreens(page);
  await staffLogout(page);
  await assertSaccoRoleDashboards(page);
  await memberLogin(page);
  await assertMemberPortal(page);

  console.log(`Browser regression checks passed against ${uiBaseUrl}`);
} finally {
  await browser?.close().catch(() => {});
  if (server) {
    server.kill();
  }
}

async function launchBrowser() {
  const launchOptions = { headless };
  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    const channels = ["chrome", "msedge"];
    for (const channel of channels) {
      try {
        return await chromium.launch({ ...launchOptions, channel });
      } catch {
        // Try the next locally installed browser channel.
      }
    }
    throw error;
  }
}

async function waitForUi() {
  const deadline = Date.now() + Number(process.env.UI_REGRESSION_WAIT_MS || 60000);
  while (Date.now() < deadline) {
    try {
      const response = await fetch(uiBaseUrl);
      if (response.ok) return;
    } catch {
      // Keep waiting while the local server starts.
    }
    await delay(500);
  }
  throw new Error(`UI did not become available at ${uiBaseUrl}`);
}

async function assertJavaApiProxy() {
  const deadline = Date.now() + Number(process.env.UI_REGRESSION_WAIT_MS || 60000);
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${uiBaseUrl}/api/v1/health`);
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
  throw new Error(lastError || `Java API proxy did not become healthy at ${uiBaseUrl}/api/v1/health`);
}

async function clearSession(page) {
  await page.evaluate(() => {
    localStorage.removeItem("sacco-platform-api-session-v1");
    localStorage.removeItem("sacco-platform-member-session-v1");
  });
}

async function staffLogin(page, credentials = {}) {
  await page.locator("#loginSaccoCode").fill(credentials.code || process.env.UI_STAFF_SACCO_CODE || "PLATFORM");
  await page.locator("#loginUsername").fill(credentials.username || process.env.UI_STAFF_USERNAME || process.env.UI_STAFF_EMAIL || "admin@platform.local");
  await page.locator("#loginPassword").fill(credentials.password || process.env.UI_STAFF_PASSWORD || "Admin@12345");
  await page.locator("#loginSubmit").click();
  await expectText(page, "API:", "staff API badge");
  await expectText(page, "Java-backed", "staff Java-backed source state");
  await expectText(page, "Last sync", "staff last sync marker");
  await waitForSettledUi(page);
}

async function assertStaffScreens(page) {
  const screens = [
    { id: "dashboard", nav: "Dashboard", heading: "Dashboard data source", markers: ["Java-backed", "Operations scope", "Refresh backend data"] },
    { id: "registrations", nav: "SACCO Registration", heading: "SACCO registration data source", markers: ["Java-backed", "Last sync", "Tenant approval", "SACCO application review", "Applications", "Review queue", "Packages"] },
    { id: "subscriptions", nav: "Subscriptions", heading: "Subscriptions data source", markers: ["Java-backed", "Last sync", "Billable members", "Subscription management", "Overview", "Invoices", "Payments", "Packages", "Activation gate"] },
    { id: "members", nav: "Members", heading: "Members data source", markers: ["Java-backed", "Server fields", "Import members", "Profile metadata", "Platform member oversight", "Oversight", "Balances", "Register", "Platform oversight"] },
    { id: "transactions", nav: "Transactions", heading: "Transactions data source", markers: ["Java-backed", "Platform transaction oversight", "Postings", "Products and accounts", "Welfare", "Statement-ready"] },
    { id: "loans", nav: "Loans", heading: "Loans data source", markers: ["Java-backed", "Platform loan oversight", "Portfolio", "Loan files", "Guarantors", "Repayments", "Portfolio oversight"] },
    { id: "operations", nav: "Operations", heading: "Operations data source", markers: ["Java-backed", "Last sync", "Operations command center", "Overview", "Alerts", "Readiness", "Queues", "Runbooks", "Operations focus"] },
    { id: "reports", nav: "Reports", heading: "Reports data source", markers: ["Java API", "Reports control center", "Compliance", "Ledger", "Operations", "Governance", "Access", "Audit", "Compliance report focus"] },
    { id: "usersRoles", nav: "Platform Users", heading: "Platform users management data source", markers: ["Java API", "Platform users management", "Assigned roles"] },
    { id: "notifications", nav: "Notifications", heading: "Notifications data source", markers: ["Java API", "Provider outbox", "Templates", "Exceptions", "Notification control center"] },
    { id: "complaints", nav: "Complaints", heading: "Complaints data source", markers: ["Java API", "Support queue", "Open complaints", "Queue", "Escalations", "Closed", "Open complaint workflow"] }
  ];

  for (const screen of screens) {
    await navigateTo(page, screen.id);
    await expectText(page, screen.heading, `${screen.nav} source panel`);
    for (const marker of screen.markers) {
      await expectText(page, marker, `${screen.nav} marker ${marker}`);
    }
    if (screen.id === "usersRoles") {
      await expectNoText(page, "User\nTenant\nAssigned roles\nContact\nStatus", "Platform Users legacy table header");
    }
    if (screen.id === "dashboard") {
      await expectText(page, "Platform Super Admin dashboard", "Dashboard role-specific platform panel");
      await expectText(page, "Activation", "Dashboard Activation tab");
      await expectText(page, "Access", "Dashboard Access tab");
      await expectText(page, "System", "Dashboard System tab");
      await expectNoText(page, "Android member app", "Dashboard old Android panel");
    }
  }
}

async function assertSaccoRoleDashboards(page) {
  const roles = [
    {
      label: "Treasurer",
      credentials: { code: "GVS", username: "treasurer@greenvalley.local", password: "Treasurer@12345" },
      markers: ["Treasurer dashboard", "Finance", "Approvals", "Reconciliation", "collections, reversals, reconciliations"],
      screens: [
        { id: "transactions", heading: "Transactions data source", markers: ["Treasurer transaction workbench", "Treasurer focus", "Postings", "Products and accounts", "Welfare"] },
        { id: "approvals", heading: "Approvals data source", markers: ["Treasurer approval queue", "Treasurer checker focus", "Pending queue"] },
        { id: "reports", heading: "Reports data source", markers: ["Treasurer finance reports", "Treasurer finance report focus", "Ledger", "Operations"] },
        { id: "operations", heading: "Operations data source", markers: ["Treasurer operations health", "Treasurer operations focus", "Queues"] }
      ]
    },
    {
      label: "Secretary",
      credentials: { code: "GVS", username: "secretary@greenvalley.local", password: "Secretary@12345" },
      markers: ["Secretary dashboard", "Members", "Governance", "Complaints", "Member records, KYC"],
      screens: [
        { id: "members", heading: "Members data source", markers: ["Secretary member records", "Secretary oversight", "Oversight", "Balances", "Register"] },
        { id: "approvals", heading: "Approvals data source", markers: ["Secretary review queue", "Secretary review focus", "Checker queue"] },
        { id: "reports", heading: "Reports data source", markers: ["Secretary board reports", "Secretary board report focus", "Governance", "Compliance"] }
      ]
    },
    {
      label: "Chairperson",
      credentials: { code: "GVS", username: "chairperson@greenvalley.local", password: "Chair@12345" },
      markers: ["Chairperson dashboard", "Oversight", "Loans", "Decisions", "Risk"]
    }
  ];

  for (const role of roles) {
    await staffLogin(page, role.credentials);
    await navigateTo(page, "dashboard");
    await expectText(page, "Dashboard data source", `${role.label} Dashboard source panel`);
    for (const marker of role.markers) {
      await expectText(page, marker, `${role.label} dashboard marker ${marker}`);
    }
    for (const screen of role.screens || []) {
      await navigateTo(page, screen.id);
      await expectText(page, screen.heading, `${role.label} ${screen.id} source panel`);
      for (const marker of screen.markers) {
        await expectText(page, marker, `${role.label} ${screen.id} marker ${marker}`);
      }
    }
    await staffLogout(page);
  }
}

async function navigateTo(page, viewId) {
  await page.locator(`[data-view="${viewId}"]`).waitFor({ state: "attached" });
  await page.evaluate((id) => {
    document.querySelector(`[data-view="${id}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, viewId);
  await waitForSettledUi(page);
}

async function waitForSettledUi(page) {
  const deadline = Date.now() + Number(process.env.UI_REGRESSION_TIMEOUT_MS || 15000);
  while (Date.now() < deadline) {
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("Refreshing...")) return;
    await delay(250);
  }
}

async function memberLogin(page) {
  await page.locator("#loginSaccoCode").fill(process.env.UI_MEMBER_SACCO_CODE || "GVS");
  await page.locator("#loginUsername").fill(process.env.UI_MEMBER_IDENTIFIER || "GVS-0001");
  await page.locator("#loginPassword").fill(process.env.UI_MEMBER_PASSWORD || "Member@12345");
  await page.locator("#loginSubmit").click();
  await waitForSettledUi(page);
}

async function staffLogout(page) {
  await page.locator("#apiLogoutBtn").click();
  await page.locator("#loginSaccoCode").waitFor({ state: "attached" });
}

async function assertMemberPortal(page) {
  const markers = [
    "Member portal data source",
    "member-authenticated Java API data",
    "Last sync",
    "SERVER-CONFIRMED BALANCES",
    "Total balance",
    "Notifications",
    "Guarantee requests",
    "Offline drafts",
    "Sync drafts"
  ];
  for (const marker of markers) {
    await expectText(page, marker, `member portal marker ${marker}`);
  }
}

async function expectText(page, text, label) {
  const deadline = Date.now() + Number(process.env.UI_REGRESSION_TIMEOUT_MS || 15000);
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
  throw new Error(`${label} did not render expected text: ${text}. Current title: ${title}. Body excerpt: ${bodyText.slice(0, 500)}`);
}

async function expectNoText(page, text, label) {
  const bodyText = await page.locator("body").innerText();
  if (bodyText.toLowerCase().includes(text.toLowerCase())) {
    throw new Error(`${label} should not render text: ${text}`);
  }
  console.log(`PASS ${label} removed`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
