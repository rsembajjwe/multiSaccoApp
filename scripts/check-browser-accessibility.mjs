import { spawn } from "node:child_process";
import { chromium } from "playwright";

const uiBaseUrl = (process.env.ACCESSIBILITY_UI_BASE_URL || `http://127.0.0.1:${process.env.ACCESSIBILITY_UI_PORT || 5185}`).replace(/\/$/, "");
const shouldStartUi = process.env.ACCESSIBILITY_UI_BASE_URL ? false : process.env.ACCESSIBILITY_START_SERVER !== "0";
const headless = process.env.ACCESSIBILITY_HEADLESS !== "0";
const timeoutMs = Number(process.env.ACCESSIBILITY_TIMEOUT_MS || 20000);

let server = null;
let browser = null;

try {
  if (shouldStartUi) {
    server = spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        PORT: new URL(uiBaseUrl).port,
        SACCO_NODE_API_ENABLED: "true"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    server.stdout.on("data", (chunk) => process.stdout.write(chunk));
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  }

  await waitForUi();

  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.setDefaultTimeout(timeoutMs);

  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#loginForm").waitFor({ state: "attached" });

  await assertPageAccessibility(page, "Login gateway");
  await assertKeyboardFocusStarts(page, "login keyboard focus");
  await assertLoginValidationAnnouncement(page);
  await assertPublicRegistrationAccessibility(page);

  await staffLogin(page, "PLATFORM", "admin@platform.local", "Admin@12345", "platform admin");
  await assertPageAccessibility(page, "Platform admin dashboard");
  await assertAuthenticatedShellAccessibility(page, "platform shell");
  await assertViewAccessibility(page, "users", "Platform users and roles");
  await logout(page);

  await staffLogin(page, "GVS", "admin@greenvalley.local", "Sacco@12345", "SACCO admin");
  await assertPageAccessibility(page, "SACCO admin dashboard");
  await assertAuthenticatedShellAccessibility(page, "SACCO shell");
  await assertViewAccessibility(page, "members", "SACCO member management");
  await logout(page);

  if (await canMemberLogin()) {
    await memberLogin(page);
    await assertPageAccessibility(page, "Member portal");
    await assertAuthenticatedShellAccessibility(page, "member shell");
    await assertViewAccessibility(page, "payments", "member payments");
  } else {
    console.log("SKIP member browser accessibility: demo member login is unavailable in this profile");
  }

  console.log(`Browser accessibility checks passed against ${uiBaseUrl}`);
} finally {
  await browser?.close().catch(() => {});
  if (server) server.kill();
}

async function assertPublicRegistrationAccessibility(page) {
  await page.locator("[data-auth-tab='register']").click();
  await page.locator("#publicSaccoRegistrationForm").waitFor({ state: "attached" });
  await assertPageAccessibility(page, "Public SACCO registration");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.locator("#loginForm").waitFor({ state: "attached" });
  console.log("PASS public registration accessibility");
}

async function assertLoginValidationAnnouncement(page) {
  await page.locator("#code").fill("UNKNOWN");
  await page.locator("#username").fill("missing@example.local");
  await page.locator("#password").fill("WrongPassword");
  await page.locator("#loginButton").click();
  await page.locator('[role="alert"][aria-live="assertive"]').waitFor({ state: "attached" });
  console.log("PASS login validation announces errors");
}

async function assertViewAccessibility(page, viewId, label) {
  const navButton = page.locator(`button.nav-link[data-view="${viewId}"]`);
  if (!(await navButton.count())) {
    console.log(`SKIP ${label} accessibility: view is not available for this role/profile`);
    return;
  }
  await navButton.waitFor({ state: "attached" });
  await page.evaluate((id) => {
    const button = document.querySelector(`button.nav-link[data-view="${id}"]`);
    button?.scrollIntoView({ block: "center", inline: "nearest" });
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, viewId);
  await waitForSettledUi(page);
  await assertPageAccessibility(page, label);
  console.log(`PASS ${label} accessibility`);
}

async function assertAuthenticatedShellAccessibility(page, label) {
  await expectCount(page, "main#main-content", 1, `${label} main landmark`);
  await expectCount(page, "nav.nav-list[aria-label]", 1, `${label} named navigation`);
  await expectCount(page, '[aria-current="page"]', 1, `${label} active page marker`, { atLeast: true });
  await expectCount(page, "button[aria-label]", 1, `${label} labelled icon/topbar buttons`, { atLeast: true });
  await assertKeyboardFocusStarts(page, `${label} keyboard focus`);
  console.log(`PASS ${label} accessibility`);
}

async function assertPageAccessibility(page, label) {
  const issues = await page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    };
    const accessibleName = (element) => {
      const ariaLabel = element.getAttribute("aria-label");
      const labelledBy = element.getAttribute("aria-labelledby");
      const title = element.getAttribute("title");
      const text = element.textContent || "";
      if (ariaLabel?.trim()) return ariaLabel.trim();
      if (labelledBy) {
        const labelledText = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" ")
          .trim();
        if (labelledText) return labelledText;
      }
      if (title?.trim()) return title.trim();
      return text.trim();
    };
    const hasProgrammaticLabel = (element) => {
      const id = element.getAttribute("id");
      return Boolean(
        element.getAttribute("aria-label")?.trim() ||
        element.getAttribute("aria-labelledby")?.trim() ||
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        element.closest("label")
      );
    };

    const found = [];
    if (!document.documentElement.lang) found.push("Document language is missing.");
    if (!document.querySelector("main")) found.push("Main landmark is missing.");
    if (!document.querySelector(".skip-link")) found.push("Skip link is missing.");

    for (const element of document.querySelectorAll("button, a[href]")) {
      if (isVisible(element) && !accessibleName(element)) {
        found.push(`${element.tagName.toLowerCase()} control is missing an accessible name.`);
      }
    }

    for (const element of document.querySelectorAll("input:not([type='hidden']), select, textarea")) {
      if (isVisible(element) && !hasProgrammaticLabel(element)) {
        found.push(`${element.tagName.toLowerCase()}#${element.id || "without-id"} is missing a label.`);
      }
    }

    for (const image of document.querySelectorAll("img")) {
      if (isVisible(image) && !image.hasAttribute("alt")) {
        found.push(`img${image.id ? `#${image.id}` : ""} is missing alt text.`);
      }
    }

    for (const alert of document.querySelectorAll('[role="alert"]')) {
      if (alert.getAttribute("aria-live") !== "assertive") {
        found.push("Alert region is missing aria-live=\"assertive\".");
      }
    }

    return found;
  });

  if (issues.length > 0) {
    throw new Error(`${label} accessibility issues:\n- ${issues.join("\n- ")}`);
  }
  console.log(`PASS ${label} accessibility structure`);
}

async function assertKeyboardFocusStarts(page, label) {
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const active = document.activeElement;
    return Boolean(active && active !== document.body && active !== document.documentElement);
  });
  if (!focused) throw new Error(`${label} did not move focus from the document body.`);
  console.log(`PASS ${label}`);
}

async function staffLogin(page, code, username, password, label) {
  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
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

async function memberLogin(page) {
  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await clearSession(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#code").fill("GVS");
  await page.locator("#username").fill("GVS-0001");
  await page.locator("#password").fill("Member@12345");
  await page.locator("#loginButton").click();
  await page.locator(".app-shell").waitFor({ state: "attached" });
  await waitForSettledUi(page);
  console.log("PASS member login");
}

async function canMemberLogin() {
  try {
    const response = await fetch(`${uiBaseUrl}/api/v1/member-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saccoCode: "GVS", identifier: "GVS-0001", password: "Member@12345" })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function logout(page) {
  await clearSession(page);
  await page.goto(uiBaseUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#loginForm").waitFor({ state: "attached" });
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

async function expectCount(page, selector, expected, label, options = {}) {
  const count = await page.locator(selector).count();
  const pass = options.atLeast ? count >= expected : count === expected;
  if (!pass) throw new Error(`${label} expected ${options.atLeast ? "at least " : ""}${expected}, got ${count}`);
  console.log(`PASS ${label}`);
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
