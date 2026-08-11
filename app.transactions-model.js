function buildTransactionRows(input) {
  return input.transactions.map((transaction) => {
    const status = normalizeTransactionModelText(transaction.status);
    const original = Boolean(transaction.originalTransactionId);
    const postedOriginal = status === "posted" && !original;
    return {
      ...transaction,
      memberName: input.memberName(transaction.memberId),
      paymentRoute: paymentRouteLabelFor(transaction),
      paymentStatus: paymentLifecycleStatusFor(transaction),
      approvalReadiness: status.includes("pending")
        ? "Awaiting approval"
        : status === "posted"
          ? "Posted"
          : status.includes("rejected")
            ? "Rejected"
            : "Review",
      receiptStatus: status === "posted" ? "Receipt ready" : "Post first",
      reversalStatus: postedOriginal ? "Reversible with reason" : original ? "Reversal entry" : "Not available",
      action: "transaction-detail",
      actionLabel: status.includes("pending") ? "Approve" : "Review",
      actionId: transaction.id
    };
  });
}

function buildTransactionReceiptingQueue(rows) {
  return rows
    .filter((row) => {
      const status = normalizeTransactionModelText(row.status);
      const type = normalizeTransactionModelText(row.type);
      return (status.includes("pending") || status === "posted")
        && ["deposit", "repayment", "share", "welfare", "saving"].some((word) => type.includes(word));
    })
    .map((row) => ({
      ...row,
      receiptingAction: normalizeTransactionModelText(row.status).includes("pending") ? "Approve/post first" : "Load receipt",
      action: "transaction-detail",
      actionLabel: normalizeTransactionModelText(row.status).includes("pending") ? "Post" : "Receipt",
      actionId: row.id
    }))
    .sort(sortTransactionNewestWithPendingFirst);
}

function buildTransactionReceiptRegister(rows) {
  return rows
    .filter((row) => normalizeTransactionModelText(row.status) === "posted" && !row.originalTransactionId)
    .map((row) => ({
      ...row,
      receiptNo: `RCT-${row.reference || row.id}`,
      receiptStatus: "Receipted",
      action: "transaction-detail",
      actionLabel: "Receipt",
      actionId: row.id
    }))
    .sort(sortTransactionNewestFirst);
}

function buildTransactionReceiptSummary(rows) {
  return {
    totalRows: rows.length,
    totalAmount: rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    receiptReady: rows.filter((row) => normalizeTransactionModelText(row.status) === "posted").length,
    mobileMoney: rows.filter((row) => row.paymentRoute === "Mobile money").length,
    treasurerCash: rows.filter((row) => row.paymentRoute === "Treasurer cash").length,
    loanRepayments: rows.filter((row) => normalizeTransactionModelText(row.type).includes("loan")).length,
    savingsDeposits: rows.filter((row) => normalizeTransactionModelText(row.type).includes("saving")).length
  };
}

function sortTransactionNewestWithPendingFirst(a, b) {
  const aPending = normalizeTransactionModelText(a.status).includes("pending") ? 0 : 1;
  const bPending = normalizeTransactionModelText(b.status).includes("pending") ? 0 : 1;
  if (aPending !== bPending) return aPending - bPending;
  return sortTransactionNewestFirst(a, b);
}

function sortTransactionNewestFirst(a, b) {
  return transactionModelTime(b) - transactionModelTime(a);
}

function transactionModelTime(row) {
  return new Date(row.postedAt || row.createdAt || 0).getTime();
}

function normalizeTransactionModelText(value) {
  return String(value || "").toLowerCase();
}
