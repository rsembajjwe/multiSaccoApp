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

async function staffLogin(page) {
  await page.locator("#loginSaccoCode").fill(process.env.UI_STAFF_SACCO_CODE || "PLATFORM");
  await page.locator("#loginUsername").fill(process.env.UI_STAFF_USERNAME || process.env.UI_STAFF_EMAIL || "admin@platform.local");
  await page.locator("#loginPassword").fill(process.env.UI_STAFF_PASSWORD || "Admin@12345");
  await page.locator("#loginSubmit").click();
  await expectText(page, "API:", "staff API badge");
  await expectText(page, "Java-backed", "staff Java-backed source state");
  await expectText(page, "Last sync", "staff last sync marker");
  await waitForSettledUi(page);
}

async function assertStaffScreens(page) {
  const screens = [
    { id: "dashboard", nav: "Dashboard", heading: "Dashboard data source", markers: ["Java-backed", "Operations scope", "Refresh backend data"] },
    { id: "registrations", nav: "SACCO Registration", heading: "SACCO registration data source", markers: ["Java-backed", "Last sync", "Tenant approval"] },
    { id: "subscriptions", nav: "Subscriptions", heading: "Subscriptions data source", markers: ["Java-backed", "Last sync", "Billable members"] },
    { id: "members", nav: "Members", heading: "Members data source", markers: ["Java-backed", "Server fields", "Import members", "Profile metadata"] },
    { id: "operations", nav: "Operations", heading: "Operations data source", markers: ["Java-backed", "Last sync", "Operations command center"] }
  ];

  for (const screen of screens) {
    await navigateTo(page, screen.id);
    await expectText(page, screen.heading, `${screen.nav} source panel`);
    for (const marker of screen.markers) {
      await expectText(page, marker, `${screen.nav} marker ${marker}`);
    }
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
