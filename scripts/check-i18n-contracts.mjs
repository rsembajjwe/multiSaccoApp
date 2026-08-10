import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const core = await readFile(new URL("app.core.js", root), "utf8");
const interactions = await readFile(new URL("app.interactions.js", root), "utf8");
const styles = await readFile(new URL("styles.css", root), "utf8");

const requiredLocales = ["en-UG", "fr-FR", "sw-TZ", "pt-MZ", "ar-EG", "am-ET"];

for (const locale of requiredLocales) {
  assertIncludes(core, `"${locale}"`, `supported locale ${locale}`);
}

assertIncludes(core, `"ar-EG": { label: "Arabic", direction: "rtl"`, "Arabic locale metadata is RTL");
assertIncludes(core, "document.documentElement.lang = region.locale", "document language is applied");
assertIncludes(core, "document.documentElement.dir = region.direction", "document direction is applied");
assertIncludes(core, "messages[localeInfo.fallback]?.[key]", "locale catalog fallback is configured");
assertIncludes(interactions, "applyRegionalDocumentSettings();\n    renderLogin();", "login locale change reapplies document settings");
assertIncludes(styles, '[dir="rtl"] body', "RTL body CSS exists");
assertIncludes(styles, '[dir="rtl"] input', "RTL form CSS exists");
assertIncludes(styles, '[dir="rtl"] .sidebar', "RTL shell CSS exists");

console.log(`i18n contract check passed (${requiredLocales.length} supported locales, RTL wiring verified).`);

function assertIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}
