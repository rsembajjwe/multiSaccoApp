function buildLoanRows(input) {
  return input.loans.map((loan) => {
    const status = normalizeLoanModelText(loan.status);
    const stage = normalizeLoanModelText(loan.stage);
    const guarantors = Number(loan.guarantors || loan.guarantorCount || 0);
    const repaymentTotal = Number(loan.repaymentTotal || loan.repayments || 0);
    const balance = Number(loan.outstandingBalance ?? loan.balance ?? loan.amount ?? 0);
    return {
      ...loan,
      memberName: loan.memberName || input.memberName(loan.memberId),
      requestedAmount: loan.requestedAmount || loan.amount,
      outstandingBalance: balance,
      guarantorReadiness: guarantors ? `${guarantors} guarantor(s)` : stage.includes("guarant") ? "Guarantor pending" : "Needs guarantor",
      approvalReadiness: status === "approved"
        ? "Ready for disbursement"
        : status === "active"
          ? "Disbursed"
          : ["submitted", "pending_approval"].includes(status)
            ? "Awaiting approval"
            : input.labelize(loan.status || "review"),
      servicingStatus: status === "active"
        ? `Outstanding ${input.formatMoney(balance)}`
        : repaymentTotal
          ? `Repaid ${input.formatMoney(repaymentTotal)}`
          : "Not in servicing",
      action: "loan-detail",
      actionLabel: status === "approved" ? "Disburse" : status === "active" ? "Service" : "Review",
      actionId: loan.id
    };
  });
}

function buildLoanPortfolioSummary(rows) {
  const submitted = rows.filter((loan) => ["submitted", "pending_approval"].includes(normalizeLoanModelText(loan.status)) || normalizeLoanModelText(loan.stage).includes("guarant")).length;
  const approved = rows.filter((loan) => normalizeLoanModelText(loan.status) === "approved").length;
  const active = rows.filter((loan) => normalizeLoanModelText(loan.status) === "active").length;
  const atRisk = rows.filter((loan) => Number(loan.dsr || 0) >= 40 || ["arrears", "overdue", "default"].some((word) => normalizeLoanModelText(`${loan.status} ${loan.stage}`).includes(word))).length;
  return {
    total: rows.length,
    submitted,
    approved,
    active,
    atRisk,
    outstandingPrincipal: rows.reduce((total, loan) => total + Number(loan.outstandingBalance || loan.balance || 0), 0),
    arrearsTotal: rows.reduce((total, loan) => total + Number(loan.arrearsAmount || 0), 0),
    over90Total: rows.reduce((total, loan) => total + Number(loan.arrearsOver90Amount || 0), 0)
  };
}

function normalizeLoanModelText(value) {
  return String(value || "").toLowerCase();
}
