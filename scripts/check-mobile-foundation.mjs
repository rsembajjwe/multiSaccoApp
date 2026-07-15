import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "mobile/member_app/README.md",
  "mobile/member_app/pubspec.yaml",
  "mobile/member_app/lib/main.dart",
  "mobile/member_app/lib/api_contract.dart",
  "mobile/member_app/android-contract.json"
];

for (const file of requiredFiles) {
  await access(file);
}

const contract = JSON.parse(await readFile("mobile/member_app/android-contract.json", "utf8"));
if (!contract.requiredEndpoints.includes("GET /api/v1/member-auth/mobile-dashboard")) {
  throw new Error("Android contract must include the mobile dashboard endpoint.");
}
if (!contract.requiredEndpoints.includes("POST /api/v1/member-auth/mobile-loans")) {
  throw new Error("Android contract must include mobile loan submission.");
}

console.log("Mobile foundation check passed");
