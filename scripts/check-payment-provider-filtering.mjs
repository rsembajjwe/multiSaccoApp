import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const member = await readFile(new URL("app.member.js", root), "utf8");
const dashboardController = await readFile(new URL("backend-java/src/main/java/com/methaltech/sacco/member/MemberAuthController.java", root), "utf8");
const router = await readFile(new URL("backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyProviderRouter.java", root), "utf8");
const openapi = await readFile(new URL("openapi.yaml", root), "utf8");

const checks = [
  [member, "function memberAvailablePaymentProviders()", "member provider filtering helper"],
  [member, "state.memberData.dashboard?.paymentProviders", "member UI reads dashboard provider options"],
  [member, "memberPaymentProviderTile(provider", "network tiles generated from provider options"],
  [member, 'normal(provider.network || provider.providerId || "") !== "mpesa"', "M-Pesa remains hidden by product decision"],
  [router, "public List<PaymentProviderOption> availablePaymentOptions()", "router exposes safe provider availability"],
  [router, "new PaymentProviderOption(\"default\", \"Mobile money\"", "demo/default generic provider fallback"],
  [dashboardController, "mobileMoneyProviderRouter.availablePaymentOptions()", "member dashboard returns provider options"],
  [openapi, "PaymentProviderOption", "OpenAPI documents member payment provider options"]
];

for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}

if (member.includes('value="mtn" checked') || member.includes('value="airtel"><b>Airtel')) {
  throw new Error("Member payment form still contains hard-coded MTN/Airtel network tiles.");
}

console.log(`Payment provider filtering contract check passed (${checks.length} markers).`);
