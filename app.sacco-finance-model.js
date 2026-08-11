function buildSavingsSummary(input) {
  return {
    accountCount: input.accounts.length,
    activeProductCount: activeFinanceProducts(input.products).length,
    balanceTotal: sumFinanceModelValues(input.members, "savingsBalance", "savings"),
    contributionTotal: sumFinanceModelValues(input.products, "contributionAmount", "minimumBalance"),
    productCount: input.products.length
  };
}

function buildSharesSummary(input) {
  return {
    accountCount: input.accounts.length,
    activeMemberCount: uniqueFinanceModelCount(input.accounts, "memberId"),
    activeProductCount: activeFinanceProducts(input.products).length,
    balanceTotal: sumFinanceModelValues(input.members, "sharesBalance", "shares"),
    contributionTotal: sumFinanceModelValues(input.products, "contributionAmount"),
    productCount: input.products.length
  };
}

function buildWelfareSummary(input) {
  const submitted = welfareSubmittedClaims(input.claims);
  const approved = input.claims.filter((row) => normalizeFinanceModelText(row.status) === "approved");
  const paid = input.claims.filter((row) => normalizeFinanceModelText(row.status) === "paid");
  return {
    accountCount: input.accounts.length,
    approvedCount: approved.length,
    claimCount: input.claims.length,
    paidAmount: sumFinanceModelValues(paid, "amount"),
    paidCount: paid.length,
    productCount: input.products.length,
    submittedCount: submitted.length
  };
}

function buildWelfareClaimRows(claims) {
  return claims.map((claim) => ({
    ...claim,
    action: "welfare-claim-detail",
    actionLabel: "Review",
    actionId: claim.id
  }));
}

function activeFinanceProducts(products) {
  return products.filter((row) => normalizeFinanceModelText(row.status) === "active");
}

function welfareSubmittedClaims(claims) {
  return claims.filter((row) => ["submitted", "pending", "pending_approval"].some((word) => normalizeFinanceModelText(row.status).includes(word)));
}

function activeFinanceMemberOptions(members) {
  return members
    .filter((member) => normalizeFinanceModelText(member.status) === "active")
    .map((member) => ({
      ...member,
      fullName: member.fullName,
      id: member.id,
      label: `${member.membershipNo || ""} - ${member.fullName || ""}`.trim(),
      membershipNo: member.membershipNo,
      status: member.status
    }));
}

function uniqueFinanceModelCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter((value) => value !== undefined && value !== null && value !== "")).size;
}

function sumFinanceModelValues(rows, ...keys) {
  return rows.reduce((total, row) => {
    const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    return total + Number(value || 0);
  }, 0);
}

function normalizeFinanceModelText(value) {
  return String(value || "").toLowerCase();
}
