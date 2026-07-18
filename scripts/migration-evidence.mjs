import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080/api/v1").replace(/\/$/, "");
const tenantId = process.env.MIGRATION_TENANT_ID || "tenant_green";
const email = process.env.MIGRATION_ADMIN_EMAIL || "admin@platform.local";
const password = process.env.MIGRATION_ADMIN_PASSWORD || "Admin@12345";
const evidenceRoot = resolve(repoRoot, process.env.MIGRATION_EVIDENCE_DIR || "reports/migration-evidence");
const fileRoot = process.env.MIGRATION_EVIDENCE_FILES_ROOT || "";
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = resolve(evidenceRoot, `${tenantId}-${runId}`);

const importAuditTypes = [
  "member_import",
  "member_metadata_import",
  "opening_balance_import",
  "loan_import",
  "loan_repayment_import"
];

try {
  await waitForApi();
  const token = (await api("POST", "/auth/login", { email, password })).data.token;

  const [members, transactions, loans, auditEvents] = await Promise.all([
    api("GET", `/members?tenantId=${encodeURIComponent(tenantId)}`, null, token).then((json) => json.data),
    api("GET", `/financial-transactions?tenantId=${encodeURIComponent(tenantId)}`, null, token).then((json) => json.data),
    api("GET", `/loans?tenantId=${encodeURIComponent(tenantId)}`, null, token).then((json) => json.data),
    api("GET", "/audit-events", null, token).then((json) => json.data.filter((event) => event.tenantId === tenantId))
  ]);

  const memberProfiles = await Promise.all(members.map(async (member) => ({
    member,
    documents: await api("GET", `/members/${member.id}/documents`, null, token).then((json) => json.data),
    nextOfKin: await api("GET", `/members/${member.id}/next-of-kin`, null, token).then((json) => json.data),
    beneficiaries: await api("GET", `/members/${member.id}/beneficiaries`, null, token).then((json) => json.data)
  })));

  const loanProfiles = await Promise.all(loans.map(async (loan) => ({
    loan,
    repayments: await api("GET", `/loans/${loan.id}/repayments`, null, token).then((json) => json.data)
  })));

  const checks = [];
  const memberRows = await memberEvidenceRows(memberProfiles, transactions, checks);
  const loanRows = loanEvidenceRows(loanProfiles, members, checks);
  const auditRows = auditEvidenceRows(auditEvents, checks);

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "members.csv"), toCsv(memberRows));
  await writeFile(resolve(outputDir, "loans.csv"), toCsv(loanRows));
  await writeFile(resolve(outputDir, "audit.csv"), toCsv(auditRows));
  await writeFile(resolve(outputDir, "summary.md"), summaryMarkdown({
    tenantId,
    baseUrl,
    generatedAt: new Date().toISOString(),
    members,
    transactions,
    loans,
    auditEvents,
    checks
  }));

  const failCount = checks.filter((check) => check.status === "FAIL").length;
  const warnCount = checks.filter((check) => check.status === "WARN").length;
  console.log(`Migration evidence written to ${outputDir}`);
  console.log(`Checks: ${checks.length} total, ${failCount} fail, ${warnCount} warn.`);
  if (failCount > 0 && process.env.MIGRATION_EVIDENCE_STRICT === "true") {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Migration evidence failed against ${baseUrl}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

async function waitForApi() {
  const started = Date.now();
  const timeoutMs = Number(process.env.MIGRATION_EVIDENCE_WAIT_MS || 60000);
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`API did not become healthy at ${baseUrl}/health`);
}

async function api(method, path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function memberEvidenceRows(memberProfiles, transactions, checks) {
  const rows = [];
  for (const profile of memberProfiles) {
    const member = profile.member;
    const memberTransactions = transactions.filter((transaction) => transaction.memberId === member.id);
    const postedTransactions = memberTransactions.filter((transaction) => transaction.status === "posted");
    const openingTransactions = postedTransactions.filter(isOpeningBalanceEvidence);
    const calculated = balancesFromTransactions(postedTransactions);
    const beneficiaryTotal = sum(profile.beneficiaries.map((item) => item.allocationPercent));
    const verifiedDocuments = profile.documents.filter((document) => document.verificationStatus === "verified");
    const storageStatus = await storageEvidenceStatus(profile.documents);

    const balanceStatus = sameMoney(calculated.savings, member.savingsBalance)
      && sameMoney(calculated.shares, member.sharesBalance)
      && sameMoney(calculated.welfare, member.welfareBalance)
        ? "PASS"
        : "FAIL";
    addCheck(checks, balanceStatus, "member_balance_reconciliation", member.membershipNo,
      `Calculated balances ${money(calculated.savings)}/${money(calculated.shares)}/${money(calculated.welfare)} vs member ${money(member.savingsBalance)}/${money(member.sharesBalance)}/${money(member.welfareBalance)}.`);

    if (hasAnyBalance(member) && openingTransactions.length === 0) {
      addCheck(checks, "WARN", "opening_balance_evidence", member.membershipNo, "Member has a balance but no opening-balance-style posted transaction evidence.");
    } else {
      addCheck(checks, "PASS", "opening_balance_evidence", member.membershipNo, `${openingTransactions.length} opening-balance-style transaction(s).`);
    }

    if (member.kycStatus === "verified" && verifiedDocuments.length === 0) {
      addCheck(checks, "WARN", "kyc_document_evidence", member.membershipNo, "KYC is verified but no verified document metadata was found.");
    } else {
      addCheck(checks, "PASS", "kyc_document_evidence", member.membershipNo, `${verifiedDocuments.length} verified document(s).`);
    }

    if (beneficiaryTotal > 100) {
      addCheck(checks, "FAIL", "beneficiary_allocation", member.membershipNo, `Beneficiary allocation totals ${beneficiaryTotal}%.`);
    } else if (profile.beneficiaries.length > 0 && beneficiaryTotal < 100) {
      addCheck(checks, "WARN", "beneficiary_allocation", member.membershipNo, `Beneficiary allocation totals ${beneficiaryTotal}%; confirm partial allocation is intentional.`);
    } else {
      addCheck(checks, "PASS", "beneficiary_allocation", member.membershipNo, `Beneficiary allocation totals ${beneficiaryTotal}%.`);
    }

    rows.push({
      membershipNo: member.membershipNo,
      fullName: member.fullName,
      status: member.status,
      kycStatus: member.kycStatus,
      savingsBalance: money(member.savingsBalance),
      sharesBalance: money(member.sharesBalance),
      welfareBalance: money(member.welfareBalance),
      calculatedSavings: money(calculated.savings),
      calculatedShares: money(calculated.shares),
      calculatedWelfare: money(calculated.welfare),
      openingEvidenceCount: openingTransactions.length,
      documentCount: profile.documents.length,
      verifiedDocumentCount: verifiedDocuments.length,
      storageEvidence: storageStatus,
      nextOfKinCount: profile.nextOfKin.length,
      beneficiaryCount: profile.beneficiaries.length,
      beneficiaryAllocationPercent: beneficiaryTotal
    });
  }
  return rows;
}

function loanEvidenceRows(loanProfiles, members, checks) {
  return loanProfiles.map(({ loan, repayments }) => {
    const paidToDate = Number(loan.amount || 0) - Number(loan.balance || 0);
    const repaymentTotal = sum(repayments.map((repayment) => repayment.amount));
    const member = members.find((candidate) => candidate.id === loan.memberId);
    const importedLoan = loan.channel === "migration" || String(loan.stage || "").toLowerCase().includes("migrated");
    const status = repaymentTotal > paidToDate ? "FAIL" : "PASS";
    addCheck(checks, status, "loan_repayment_capacity", loan.id,
      `Loan ${loan.product} paid-to-date capacity ${money(paidToDate)} vs repayment records ${money(repaymentTotal)}.`);
    if (importedLoan && paidToDate > 0 && repaymentTotal === 0) {
      addCheck(checks, "WARN", "loan_repayment_history", loan.id, "Migrated loan has paid-to-date capacity but no repayment history records.");
    }
    return {
      loanId: loan.id,
      membershipNo: member?.membershipNo || "",
      product: loan.product,
      status: loan.status,
      stage: loan.stage,
      amount: money(loan.amount),
      balance: money(loan.balance),
      paidToDate: money(paidToDate),
      repaymentCount: repayments.length,
      repaymentTotal: money(repaymentTotal),
      capacityStatus: status
    };
  });
}

function auditEvidenceRows(auditEvents, checks) {
  const rows = importAuditTypes.map((resourceType) => {
    const events = auditEvents.filter((event) => event.resourceType === resourceType);
    addCheck(checks, events.length ? "PASS" : "WARN", "import_audit_coverage", resourceType,
      events.length ? `${events.length} audit event(s) found.` : "No audit event found for this import type.");
    return {
      resourceType,
      count: events.length,
      latestAt: events[0]?.createdAt || "",
      latestAction: events[0]?.action || ""
    };
  });
  return rows;
}

function balancesFromTransactions(transactions) {
  return transactions.reduce((balances, transaction) => {
    const amount = transaction.originalTransactionId ? -Number(transaction.amount || 0) : Number(transaction.amount || 0);
    if (transaction.type === "savings_deposit") balances.savings += amount;
    if (transaction.type === "withdrawal") balances.savings -= amount;
    if (transaction.type === "share_purchase") balances.shares += amount;
    if (transaction.type === "welfare_contribution") balances.welfare += amount;
    return balances;
  }, { savings: 0, shares: 0, welfare: 0 });
}

function isOpeningBalanceEvidence(transaction) {
  return !transaction.originalTransactionId
    && ["savings_deposit", "share_purchase", "welfare_contribution"].includes(transaction.type)
    && (/opening/i.test(transaction.narration || "") || /-(SAV|SHR|WEL)$/i.test(transaction.reference || ""));
}

async function storageEvidenceStatus(documents) {
  if (!documents.length) return "none";
  if (!fileRoot) return "not_checked";
  const missing = [];
  for (const document of documents) {
    try {
      await access(resolve(fileRoot, document.storageKey));
    } catch {
      missing.push(document.storageKey);
    }
  }
  return missing.length ? `missing:${missing.join("|")}` : "present";
}

function addCheck(checks, status, category, subject, detail) {
  checks.push({ status, category, subject, detail });
}

function summaryMarkdown(context) {
  const counts = {
    pass: context.checks.filter((check) => check.status === "PASS").length,
    warn: context.checks.filter((check) => check.status === "WARN").length,
    fail: context.checks.filter((check) => check.status === "FAIL").length
  };
  const checkRows = context.checks.map((check) => `| ${check.status} | ${check.category} | ${md(check.subject)} | ${md(check.detail)} |`).join("\n");
  return `# Migration Evidence Report

Generated: ${context.generatedAt}

Tenant: \`${context.tenantId}\`

API: \`${context.baseUrl}\`

## Summary

| Area | Count |
| --- | ---: |
| Members | ${context.members.length} |
| Posted/financial transactions | ${context.transactions.length} |
| Loans | ${context.loans.length} |
| Tenant audit events | ${context.auditEvents.length} |
| Passing checks | ${counts.pass} |
| Warnings | ${counts.warn} |
| Failures | ${counts.fail} |

## Generated Files

- \`members.csv\`
- \`loans.csv\`
- \`audit.csv\`

## Checks

| Status | Category | Subject | Detail |
| --- | --- | --- | --- |
${checkRows || "| PASS | none | none | No checks were produced. |"}
`;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csv(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csv(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function md(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

function sameMoney(left, right) {
  return Math.abs(Number(left || 0) - Number(right || 0)) < 0.01;
}

function hasAnyBalance(member) {
  return Number(member.savingsBalance || 0) > 0
    || Number(member.sharesBalance || 0) > 0
    || Number(member.welfareBalance || 0) > 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
