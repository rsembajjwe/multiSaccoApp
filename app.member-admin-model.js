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

function buildReceiptReadyStatementLines(lines) {
  return lines.filter((line) => line.reference || line.receiptNo || normalizeMemberAdminText(line.status) === "posted");
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
