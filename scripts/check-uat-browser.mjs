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
  await assertScreen(page, "dashboard", "Dashboard", ["Total SACCOs", "Active platform users", "Recent SACCO applications"]);
  await assertScreen(page, "sacco-applications", "SACCO Registration", ["Register SACCO inside platform", "SACCO application list", "Self-registration approval path"]);
  await assertScreen(page, "subscriptions", "Subscriptions", ["Subscription list", "Package Setup", "Manage package"]);
  await assertScreen(page, "reports", "Reports", ["Super admin reporting control", "Super Admin SACCO report", "Platform administrator access report"]);
  await assertScreen(page, "complaints", "Complaints", ["Complaints from SACCO admins", "Open platform support cases"]);
  await assertScreen(page, "users", "Users and Roles", ["Add platform user", "Platform administrator list", "Permission matrix"]);
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  console.log("PASS platform admin UAT path");
}

async function saccoStaffUat(page) {
  const staff = uatData?.created?.staffUser;
  await staffLogin(page, staff?.email || "admin@greenvalley.local", staff?.password || "Sacco@12345", "SACCO staff");
  await assertScreen(page, "members", "Members", ["Member Overview", "Register Member", "Member List", "KYC Detail", "Contacts & Documents", "Statement", "Member management focus"]);
  await assertSaccoMemberAdminTabs(page);
  await assertScreen(page, "transactions", "Transactions", ["Transaction control focus", "Deposits and reversals", "New transaction screen", "Receipting queue", "Receipt register"]);
  await assertScreen(page, "savings", "Savings", ["Savings operations control", "SACCO monthly performance control", "Treasurer cash collections", "Mobile money collections"]);
  await assertScreen(page, "approvals", "Approvals", ["Approval decision center", "Approval queue", "decision"]);
  await assertScreen(page, "loans", "Loans", ["Loan lifecycle control", "Loan application list"]);
  await assertScreen(page, "reports", "Reports", ["Reporting evidence control", "Operational and financial reporting"]);
  await assertScreen(page, "complaints", "Complaints", ["SACCO admin - member chat", "SACCO admin - Platform Super Admin chat"]);
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  console.log("PASS SACCO staff UAT path");
}

async function memberPortalUat(page) {
  const member = uatData?.created?.member;
  await page.locator("#code").fill("GVS");
  await page.locator("#username").fill(member?.membershipNo || "GVS-0001");
  await page.locator("#password").fill(member?.password || "Member@12345");
  await page.locator("#loginButton").click();
  await waitForSettledUi(page);

  for (const marker of [
    "Balances and requests update",
    "Total balance",
    "Loans",
    "Notifications",
    "Guarantee requests",
    "Offline drafts",
    "Monthly savings",
    "Pay by mobile money",
    "Read SACCO messages",
    member?.membershipNo || "GVS-0001"
  ]) {
    await expectText(page, marker, `member portal marker ${marker}`);
  }

  await assertMemberPortalTabs(page);

  const subject = `UAT member complaint ${Date.now()}`;
  await navigateTo(page, "complaints");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='submit']").click();
  await page.locator("#memberComplaintCategory").selectOption("service");
  await page.locator("#memberComplaintPriority").selectOption("medium");
  await page.locator("#memberComplaintSubject").fill(subject);
  await page.locator("#memberComplaintDescription").fill("UAT member complaint draft from the production readiness path.");
  await page.locator("[data-member-draft-save='complaint']").click();
  await expectText(page, "Complaint draft saved on this device", "offline draft row saved");
  await page.locator("[data-module-tab-view='complaints'][data-module-tab='drafts']").click();
  await expectText(page, subject, "offline draft row visible");
  console.log("PASS member portal UAT path");
}

async function assertSaccoMemberAdminTabs(page) {
  await navigateTo(page, "members");
  await page.locator("[data-member-tab='list']").click();
  await expectText(page, "Member list", "SACCO member list tab");
  const detailAction = page.locator("[data-row-action='member-detail']").first();
  if (await detailAction.count()) {
    await detailAction.click();
    await expectText(page, "Member detail and KYC approval", "SACCO member editable detail");
    await expectText(page, "Save member profile", "SACCO member profile edit control");
    await page.locator("[data-member-tab='contacts']").click();
    await expectText(page, "Member contacts and documents", "SACCO member contacts tab");
    await page.locator("[data-member-tab='statement']").click();
    await expectText(page, "Member balance statement", "SACCO member statement tab");
    await expectText(page, "Staff statement export controls", "SACCO member statement export controls");
  }
  await page.locator("[data-member-tab='register']").click();
  await expectText(page, "Member registration", "SACCO member registration tab");
  console.log("PASS SACCO member admin tabs");
}

async function assertMemberPortalTabs(page) {
  await navigateTo(page, "home");
  await page.locator("[data-module-tab-view='home'][data-module-tab='monthly']").click();
  await expectText(page, "Monthly savings workspace", "member monthly savings tab");
  await expectText(page, "Treasurer cash", "member monthly treasurer cash visibility");
  await expectText(page, "Mobile money", "member monthly mobile money visibility");
  await page.locator("[data-module-tab-view='home'][data-module-tab='messages']").click();
  await expectText(page, "SACCO admin message center", "member SACCO message center tab");
  await page.locator("[data-module-tab-view='home'][data-module-tab='mobile-money']").click();
  await expectText(page, "Mobile money deposit workspace", "member mobile-money deposit tab");
  await navigateTo(page, "payments");
  await expectText(page, "Member payment center", "member payment center");
  await page.locator("[data-module-tab-view='payments'][data-module-tab='tracking']").click();
  await expectText(page, "Mobile-money request tracking", "member payment tracking tab");
  await page.locator("[data-module-tab-view='payments'][data-module-tab='drafts']").click();
  await expectText(page, "Payment offline drafts", "member payment offline drafts tab");
  console.log("PASS member portal enterprise tabs");
}

async function staffLogin(page, email, password, label) {
  await page.locator("#code").fill(email.includes("platform") ? "PLATFORM" : "GVS");
  await page.locator("#username").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#loginButton").click();
  if (await page.locator("#mfaVerifyForm").count()) {
    const bodyText = await page.locator("body").innerText();
    const code = bodyText.match(/\b\d{6}\b/)?.[0];
    if (!code) throw new Error(`${label} MFA challenge did not expose a development code`);
    await page.locator("#mfaCode").fill(code);
    await page.locator("#mfaVerifyButton").click();
  }
  await page.locator(".app-shell").waitFor({ state: "attached" });
  console.log(`PASS ${label} login`);
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
    localStorage.removeItem("tereka-staff-token");
    localStorage.removeItem("tereka-member-token");
    localStorage.removeItem("tereka-member-offline-drafts-v1");
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
