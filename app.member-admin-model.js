// Typed member administration bridge for the classic Tereka Online SPA.
// Keep behavior aligned with src/member/admin.ts while runtime modules migrate to ES modules.

function buildMemberDocumentRows(documents, labelize, formatDateTime) {
  return documents.map((document) => ({
    ...document,
    retentionStatus: labelize(document.retentionStatus || "active"),
    retentionStorageAction: labelize(document.retentionStorageAction || "not_actioned"),
    retentionReviewDueAt: document.retentionReviewDueAt || "",
    retentionReviewedAt: document.retentionReviewedAt ? formatDateTime(document.retentionReviewedAt) : "",
    action: "document-retention",
    actionId: document.id
  }));
}

function buildMemberDocumentRetentionSummary(documents) {
  return {
    documents: documents.length,
    reviewDue: documents.filter((document) => normalizeMemberAdminText(document.retentionStatus) === "review_due").length,
    disposalPending: documents.filter((document) => normalizeMemberAdminText(document.retentionStatus) === "disposal_pending").length,
    disposed: documents.filter((document) => normalizeMemberAdminText(document.retentionStatus) === "disposed").length
  };
}

function buildMemberStatementSummary(member, lines) {
  const receiptRows = buildReceiptReadyStatementLines(lines);
  const mobileRows = receiptRows.filter((line) => isMobileMoneyPerformanceLine(line)).length;
  return {
    creditTotal: lines.reduce((total, line) => total + statementCredit(line), 0),
    debitTotal: lines.reduce((total, line) => total + statementDebit(line), 0),
    lastMovement: lines[0]?.postedAt || lines[0]?.createdAt || "No statement activity",
    mobileRows,
    officeRows: Math.max(0, lines.length - lines.filter((line) => isMobileMoneyPerformanceLine(line)).length),
    receiptRows: receiptRows.length,
    totalBalance: Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0),
    treasurerRows: receiptRows.length - mobileRows
  };
}

function buildMemberDetailSummary(input) {
  return {
    beneficiaries: input.beneficiaries.length,
    contacts: input.nextOfKin.length,
    documents: input.documents.length,
    statementLines: input.statementLines.length,
    totalBalance: input.statementSummary.totalBalance
  };
}

function memberKycReadinessFor(member) {
  const missing = [];
  if (!member.phone) missing.push("phone");
  if (!member.nationalId) missing.push("national ID");
  if (!member.fullName) missing.push("name");
  if (normalizeMemberAdminText(member.kycStatus) === "verified" && normalizeMemberAdminText(member.status) === "active") return "Portal ready";
  if (missing.length) return `Missing ${missing.join(", ")}`;
  if (normalizeMemberAdminText(member.kycStatus).includes("pending")) return "Ready for review";
  if (normalizeMemberAdminText(member.status).includes("pending")) return "Approval needed";
  return "Review";
}

function buildMemberKycChecklistRows(member, labelize) {
  return [
    { area: "Identity", detail: member.nationalId ? "National ID captured" : "National ID missing", status: member.nationalId ? "Complete" : "Pending" },
    { area: "Contact", detail: member.phone ? "Phone number captured" : "Phone number missing", status: member.phone ? "Complete" : "Pending" },
    { area: "KYC decision", detail: labelize(member.kycStatus || "pending"), status: normalizeMemberAdminText(member.kycStatus) === "verified" ? "Complete" : "Review" },
    { area: "Member status", detail: labelize(member.status || "pending"), status: normalizeMemberAdminText(member.status) === "active" ? "Active" : "Review" },
    { area: "Portal login", detail: normalizeMemberAdminText(member.status) === "active" ? "Member can access portal after credential setup" : "Activate member before portal access", status: normalizeMemberAdminText(member.status) === "active" ? "Ready" : "Pending" }
  ];
}

function memberStatusOptions() {
  return [
    { value: "applicant", label: "Applicant" },
    { value: "pending_approval", label: "Pending approval" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "dormant", label: "Dormant" },
    { value: "suspended", label: "Suspended" },
    { value: "exited", label: "Exited" }
  ];
}

function memberTypeOptions() {
  return [
    { value: "individual", label: "Individual" },
    { value: "group", label: "Group" },
    { value: "institutional", label: "Institutional" },
    { value: "corporate", label: "Corporate" }
  ];
}

function kycStatusOptions() {
  return [
    { value: "not_verified", label: "Not verified" },
    { value: "pending_verification", label: "Pending verification" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "expired", label: "Expired" }
  ];
}

function buildReceiptReadyStatementLines(lines) {
  return lines.filter((line) => line.reference || line.receiptNo || normalizeMemberAdminText(line.status) === "posted");
}

function buildMemberReceiptEvidenceSummary(lines) {
  const receiptRows = buildReceiptReadyStatementLines(lines);
  const mobileRows = receiptRows.filter((line) => isMobileMoneyPerformanceLine(line));
  return {
    lastReceipt: receiptRows[0]?.receiptNo || receiptRows[0]?.reference || "No receipt yet",
    mobileRows: mobileRows.length,
    receiptRows: receiptRows.length,
    treasurerRows: receiptRows.length - mobileRows.length
  };
}

function buildStaffStatementExportSummary(lines) {
  const receiptRows = buildReceiptReadyStatementLines(lines);
  return {
    auditTrail: "Included",
    csvStatement: "Backend download",
    excelSchedule: "Open CSV in Excel",
    printStatement: "Available",
    receiptBundle: receiptRows.length ? "Available" : "No receipts yet",
    statementRows: lines.length
  };
}

function statementCredit(line) {
  const amount = Number(line.amount || 0);
  const credit = line.credit ?? (amount > 0 ? amount : 0);
  return Number(credit || 0);
}

function statementDebit(line) {
  const amount = Number(line.amount || 0);
  const debit = line.debit ?? (amount < 0 ? Math.abs(amount) : 0);
  return Number(debit || 0);
}

function normalizeMemberAdminText(value) {
  return String(value || "").toLowerCase();
}
