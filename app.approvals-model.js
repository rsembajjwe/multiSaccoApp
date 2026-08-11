function buildApprovalQueueModel(input) {
  const pendingTransactions = input.transactions.filter((row) => normalizeApprovalModelText(row.status).includes("pending"));
  const pendingRepayments = input.pendingRepayments.map((row) => ({ ...row, memberName: input.memberName(row.memberId) }));
  const loans = input.isPlatform
    ? []
    : input.loans
      .filter((row) => normalizeApprovalModelText(row.status).includes("review") || normalizeApprovalModelText(row.status).includes("submitted"))
      .map((row) => ({ ...row, memberName: row.memberName || input.memberName(row.memberId) }));
  const members = input.isPlatform
    ? []
    : input.members
      .filter((row) => normalizeApprovalModelText(row.status).includes("pending"))
      .map((row) => ({
        ...row,
        memberName: row.fullName,
        action: "member-detail",
        actionLabel: "Review",
        actionId: row.id
      }));
  return {
    loans,
    members,
    pendingRepayments,
    pendingTransactions,
    viewOnlyQueue: [...pendingTransactions, ...pendingRepayments, ...loans, ...members]
  };
}

function buildApprovalQueueSummary(model) {
  return {
    loansToApprove: model.loans.length,
    membersToVerify: model.members.length,
    repaymentsToApprove: model.pendingRepayments.length,
    transactionsToApprove: model.pendingTransactions.length
  };
}

function normalizeApprovalModelText(value) {
  return String(value || "").toLowerCase();
}
