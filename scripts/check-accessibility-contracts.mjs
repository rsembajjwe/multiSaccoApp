import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const auth = await readFile(new URL("app.auth.js", root), "utf8");
const shell = await readFile(new URL("app.shell.js", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");

const checks = [
  [auth, 'class="skip-link" href="#login-main"', "login skip link"],
  [auth, 'id="login-main" tabindex="-1"', "login main landmark target"],
  [shell, 'class="skip-link" href="#main-content"', "authenticated skip link"],
  [shell, 'id="main-content" tabindex="-1"', "authenticated main landmark target"],
  [shell, 'aria-label="${escapeHtml(portal)} navigation"', "named sidebar navigation"],
  [shell, 'aria-current="page"', "active navigation current-page marker"],
  [shell, 'aria-label="Session menu, ${escapeHtml(sessionTimeLabel())}"', "session menu accessible label"],
  [shell, 'aria-label="Help menu"', "help menu accessible label"],
  [shell, 'aria-label="Account menu for ${escapeHtml(displayName())}"', "account menu accessible label"],
  [styles, "button:focus-visible", "visible button focus"],
  [styles, ".skip-link:focus", "visible skip link focus"]
];

for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}

console.log(`Accessibility contract check passed (${checks.length} markers).`);
