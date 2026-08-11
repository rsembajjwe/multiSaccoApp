import type { TerekaLoan, TerekaMoney, TerekaRecord } from "../types/domain";

export interface TerekaLoanRow extends TerekaLoan, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalReadiness: string;
  guarantorReadiness: string;
  memberName?: string;
  outstandingBalance: number;
  requestedAmount?: TerekaMoney;
  servicingStatus: string;
}

export interface TerekaLoanRowsInput {
  formatMoney: (value: TerekaMoney) => string;
  labelize: (value: unknown) => string;
  loans: Array<TerekaLoan & TerekaRecord>;
  memberName: (memberId?: string) => string;
}

export interface TerekaLoanPortfolioSummary {
  active: number;
  approved: number;
  arrearsTotal: number;
  atRisk: number;
  outstandingPrincipal: number;
  over90Total: number;
  submitted: number;
  total: number;
}

export function buildLoanRows(input: TerekaLoanRowsInput): TerekaLoanRow[] {
  return input.loans.map((loan) => {
    const status = normalizeLoanText(loan.status);
    const stage = normalizeLoanText(loan.stage);
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
      actionId: loan.id,
    };
  });
}

export function buildLoanPortfolioSummary(rows: TerekaLoanRow[]): TerekaLoanPortfolioSummary {
  const submitted = rows.filter((loan) => ["submitted", "pending_approval"].includes(normalizeLoanText(loan.status)) || normalizeLoanText(loan.stage).includes("guarant")).length;
  const approved = rows.filter((loan) => normalizeLoanText(loan.status) === "approved").length;
  const active = rows.filter((loan) => normalizeLoanText(loan.status) === "active").length;
  const atRisk = rows.filter((loan) => Number(loan.dsr || 0) >= 40 || ["arrears", "overdue", "default"].some((word) => normalizeLoanText(`${loan.status} ${loan.stage}`).includes(word))).length;
  return {
    total: rows.length,
    submitted,
    approved,
    active,
    atRisk,
    outstandingPrincipal: rows.reduce((total, loan) => total + Number(loan.outstandingBalance || loan.balance || 0), 0),
    arrearsTotal: rows.reduce((total, loan) => total + Number(loan.arrearsAmount || 0), 0),
    over90Total: rows.reduce((total, loan) => total + Number(loan.arrearsOver90Amount || 0), 0),
  };
}

function normalizeLoanText(value: unknown): string {
  return String(value || "").toLowerCase();
}
