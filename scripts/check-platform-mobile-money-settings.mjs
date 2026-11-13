import { chromium } from "playwright";

const uiBaseUrl = (process.env.UI_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const headless = process.env.UI_REGRESSION_HEADLESS !== "0";
const timeoutMs = Number(process.env.UI_REGRESSION_TIMEOUT_MS || 20000);

let browser = null;
let context = null;

try {
  await waitForHealthyApp();
  browser = await launchBrowser();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await staffLogin(page);
  await navigateTo(page, "settings");
  await page.locator("[data-module-tab-view='settings'][data-module-tab='mobile-money']").click();

  await expectText(page, "Mobile money integrations", "platform mobile-money integrations panel");
  await expectText(page, "MTN subscription key", "platform MTN key field");
  await expectText(page, "Airtel client ID", "platform Airtel key field");
  await expectText(page, "Stored mobile-money key status", "platform mobile-money key status table");

  await page.locator("#mobileMoneyActiveProvider").selectOption("demo_mobile_money");
  const signedCallbacks = page.locator("#mobileMoneyRequireSignedCallbacks");
  if (await signedCallbacks.isChecked()) await signedCallbacks.uncheck();
  await page.locator("#platformMobileMoneyConfigForm button[type='submit']").click();

  await expectText(page, "Platform mobile-money keys saved", "platform mobile-money demo save");
  const activeProviderSummary = await page
    .locator("section.panel", { hasText: "Mobile money integrations" })
    .locator(".mini-fact", { hasText: "Active provider" })
    .locator("strong")
    .first()
    .innerText();
  if (activeProviderSummary.trim() !== "Demo / disabled") {
    throw new Error(`Expected Demo / disabled active provider summary, got ${activeProviderSummary}`);
  }
  await expectText(page, "demo_mobile_money", "platform mobile-money stored provider value");

  // Receiving accounts now live on their own settings tab, split out of the mobile-money keys tab.
  await page.locator("[data-module-tab-view='settings'][data-module-tab='receiving-accounts']").click();
  await expectText(page, "Platform mobile-money receiving accounts", "platform receiving accounts panel");
  await expectText(page, "Add platform receiving account", "platform receiving account form");

  console.log(`Platform mobile-money settings browser check passed against ${uiBaseUrl}`);
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}

async function launchBrowser() {
  const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE
    || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  try {
    return await chromium.launch({ headless });
  } catch {
    try {
      return await chromium.launch({ headless, executablePath });
    } catch {
      for (const channel of ["chrome", "msedge"]) {
        try {
          return await chromium.launch({ headless, channel });
        } catch {
          // Try the next installed browser.
        }
      }
      throw new Error("No Playwright browser is installed and no Chrome/Edge executable was available.");
    }
  }
}

async function waitForHealthyApp() {
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
  throw new Error(lastError || `App did not become healthy at ${uiBaseUrl}`);
}

async function clearSession(page) {
  await page.evaluate(() => {
    localStorage.removeItem("tereka-staff-token");
    localStorage.removeItem("tereka-member-token");
    localStorage.removeItem("sacco-platform-api-session-v1");
    localStorage.removeItem("sacco-platform-member-session-v1");
  });
}

async function staffLogin(page) {
  await page.locator("#code").fill("PLATFORM");
  await page.locator("#username").fill("admin@platform.local");
  await page.locator("#password").fill("Admin@12345");
  await page.locator("#loginButton").click();
  await page.locator(".app-shell").waitFor({ state: "attached" });
  await expectText(page, "Platform Administration Portal", "platform portal shell");
}

async function navigateTo(page, viewId) {
  await page.evaluate((targetView) => {
    const button = document.querySelector(`button.nav-link[data-view="${targetView}"]`);
    if (!button) throw new Error(`Missing nav button for ${targetView}`);
    button.scrollIntoView({ block: "center", inline: "nearest" });
    button.click();
  }, viewId);
  await page.waitForFunction(
    (targetView) => Boolean(document.querySelector(`.nav-link.active[data-view="${targetView}"]`)),
    viewId
  );
}

async function expectText(page, text, label) {
  const expected = text.toLowerCase();
  const deadline = Date.now() + timeoutMs;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
