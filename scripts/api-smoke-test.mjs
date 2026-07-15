import { spawn } from "node:child_process";

const port = 5199;
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  await waitForServer();

  const health = await api("GET", "/health");
  assert(health.data.ok === true, "Health endpoint should return ok=true");

  const login = await api("POST", "/auth/login", {
    email: "admin@platform.local",
    password: "Admin@12345"
  });
  assert(login.data.token, "Login should return a token");

  const platformToken = login.data.token;
  const tenants = await api("GET", "/tenants", null, platformToken);
  assert(tenants.data.length >= 3, "Platform admin should list all seeded tenants");

  const tenant = await api("POST", "/tenants", {
    name: `Smoke SACCO ${Date.now()}`,
    abbreviation: "SMS",
    registrationNo: `COOP-SMOKE-${Date.now()}`,
    district: "Kampala",
    licenseExpiry: "2027-12-31",
    packageId: "starter"
  }, platformToken);
  assert(tenant.data.id, "Tenant creation should return a tenant");
  assert(tenant.data.status === "pending_review", "New tenant should start pending review");

  const approvedTenant = await api("PATCH", `/tenants/${tenant.data.id}/status`, { status: "approved" }, platformToken);
  assert(approvedTenant.data.status === "approved", "Tenant status should update to approved");

  const packages = await api("GET", "/subscription-packages", null, platformToken);
  assert(packages.data.length >= 3, "Subscription packages should be listed");
  assert(packages.data.some((pkg) => pkg.price === 1200000 && pkg.members === 500), "Starter fixed tier should be retained for 251-500 members");
  assert(packages.data.some((pkg) => pkg.price === 3600000 && pkg.members === 2500), "Growth fixed tier should be retained for 501-2,500 members");
  assert(packages.data.some((pkg) => pkg.price === 9000000 && pkg.members === 10000), "Enterprise fixed tier should be retained for 2,501-10,000 members");

  const subscriptions = await api("GET", "/subscriptions", null, platformToken);
  assert(subscriptions.data.length >= 2, "Platform admin should list subscriptions");
  assert(subscriptions.data.every((subscription) => subscription.tierId), "Subscriptions should include a billing tier");
  assert(subscriptions.data.every((subscription) => subscription.memberCount <= 250 ? subscription.amount === subscription.billableMembers * 5000 : true), "Small SACCO subscriptions should bill UGX 5,000 per billable member");
  const pendingSubscription = subscriptions.data.find((subscription) => subscription.status !== "active") || subscriptions.data[0];
  const payment = await api("POST", `/subscriptions/${pendingSubscription.id}/payments`, {
    amount: pendingSubscription.amount - pendingSubscription.paid,
    channel: "manual",
    externalReference: `SMOKE-PAY-${Date.now()}`
  }, platformToken);
  assert(payment.data.subscription.status === "active", "Subscription payment should activate paid subscription");

  const user = await api("POST", "/users", {
    tenantId: "tenant_green",
    fullName: "Sprint Smoke User",
    email: `smoke-${Date.now()}@greenvalley.local`,
    password: "Sacco@12345"
  }, platformToken);
  assert(user.data.id, "User creation should return a public user");
  assert(!("passwordHash" in user.data), "Public user should not expose password hash");

  const saccoLogin = await api("POST", "/auth/login", {
    email: "admin@greenvalley.local",
    password: "Sacco@12345"
  });
  const saccoToken = saccoLogin.data.token;

  const memberLogin = await api("POST", "/member-auth/login", {
    identifier: "GVS-0001",
    password: "Member@12345"
  });
  const memberToken = memberLogin.data.token;
  assert(memberLogin.data.member.membershipNo === "GVS-0001", "Member login should return the member profile");
  assert(memberLogin.data.balances.savings === 250000, "Member login should return posted savings balance");
  assert(!("passwordHash" in memberLogin.data.member), "Member profile should not expose password hash");

  const memberSession = await api("GET", "/member-auth/me", null, memberToken);
  assert(memberSession.data.member.id === memberLogin.data.member.id, "Member session should return the logged-in member");
  assert(memberSession.data.tenant.id === "tenant_green", "Member session should include tenant context");

  const saccoSubscriptions = await api("GET", "/subscriptions", null, saccoToken);
  assert(saccoSubscriptions.data.every((subscription) => subscription.tenantId === "tenant_green"), "SACCO subscription list must be tenant-scoped");

  const paymentDenied = await raw("POST", `/subscriptions/${pendingSubscription.id}/payments`, { amount: 1 }, saccoToken);
  assert(paymentDenied.status === 403, "SACCO admin should not record platform subscription payments");

  const denied = await raw("GET", "/tenants/tenant_lake", null, saccoToken);
  assert(denied.status === 403, "SACCO admin should be blocked from another tenant");

  const audit = await api("POST", "/audit-events", {
    action: "Smoke test audit event",
    resourceType: "test",
    resourceId: "api-smoke-test"
  }, saccoToken);
  assert(audit.data.id, "Audit event should be created");

  const branches = await api("GET", "/branches", null, saccoToken);
  assert(branches.data.length >= 2, "SACCO admin should list own branches");
  assert(branches.data.every((branch) => branch.tenantId === "tenant_green"), "SACCO branch list must be tenant-scoped");

  const branch = await api("POST", "/branches", {
    code: `SM${Date.now().toString().slice(-5)}`,
    name: "Smoke Test Branch",
    address: "Temporary test location"
  }, saccoToken);
  assert(branch.data.id, "Branch creation should return a branch");
  assert(branch.data.tenantId === "tenant_green", "Branch should be created in authenticated tenant");

  const member = await api("POST", "/members", {
    branchId: branch.data.id,
    fullName: "Smoke Test Member",
    phone: "+256700123456",
    email: "member-smoke@example.local",
    nationalId: `SMOKE-${Date.now()}`,
    memberType: "individual",
    kycStatus: "pending_verification"
  }, saccoToken);
  assert(member.data.id, "Member creation should return a member");
  assert(member.data.status === "pending_approval", "New member should start pending approval");

  const status = await api("PATCH", `/members/${member.data.id}/status`, { status: "active" }, saccoToken);
  assert(status.data.status === "active", "Member status should update");

  const document = await api("POST", `/members/${member.data.id}/documents`, {
    documentType: "national_id",
    storageKey: `tenant_green/members/${member.data.id}/national-id.pdf`
  }, saccoToken);
  assert(document.data.id, "Member document metadata should be created");

  const loans = await api("GET", "/loans", null, saccoToken);
  assert(loans.data.length >= 2, "SACCO admin should list own loan files");
  assert(loans.data.every((loan) => loan.tenantId === "tenant_green"), "Loan list must be tenant-scoped");

  const loan = await api("POST", "/loans", {
    memberId: member.data.id,
    product: "Development Loan",
    amount: 1200000,
    repaymentMonths: 12,
    purpose: "Smoke test working capital"
  }, saccoToken);
  assert(loan.data.id, "Loan application should be created");
  assert(loan.data.status === "submitted", "New loan application should start submitted");
  assert(loan.data.stage === "Credit Appraisal", "New loan application should enter credit appraisal");

  const earlyDisbursement = await raw("POST", `/loans/${loan.data.id}/disburse`, null, saccoToken);
  assert(earlyDisbursement.status === 409, "Loan should not disburse before approval");

  const earlyRepayment = await raw("POST", `/loans/${loan.data.id}/repayments`, {
    amount: 1000,
    channel: "cash",
    externalReference: `SMOKE-EARLY-LRP-${Date.now()}`
  }, saccoToken);
  assert(earlyRepayment.status === 409, "Loan should not receive repayment before disbursement");

  const approvalWithoutGuarantor = await raw("PATCH", `/loans/${loan.data.id}/status`, { status: "approved" }, saccoToken);
  assert(approvalWithoutGuarantor.status === 409, "Loan should require an accepted guarantor before approval");

  const selfGuarantee = await raw("POST", `/loans/${loan.data.id}/guarantors`, {
    memberId: member.data.id,
    guaranteedAmount: 100000
  }, saccoToken);
  assert(selfGuarantee.status === 409, "Borrower should not guarantee their own loan");

  const guarantor = await api("POST", `/loans/${loan.data.id}/guarantors`, {
    memberId: "member_green_amina",
    guaranteedAmount: 300000
  }, saccoToken);
  assert(guarantor.data.status === "pending", "Guarantor request should start pending");

  const memberGuarantorRequests = await api("GET", "/member-auth/guarantor-requests", null, memberToken);
  assert(memberGuarantorRequests.data.some((request) => request.id === guarantor.data.id), "Member should see their guarantor request");

  const acceptedGuarantor = await api("PATCH", `/member-auth/guarantor-requests/${guarantor.data.id}/status`, {
    status: "accepted"
  }, memberToken);
  assert(acceptedGuarantor.data.status === "accepted", "Member should accept guarantor request");

  const approvedLoan = await api("PATCH", `/loans/${loan.data.id}/status`, { status: "approved" }, saccoToken);
  assert(approvedLoan.data.status === "approved", "Loan should approve after guarantor acceptance");
  assert(approvedLoan.data.stage === "Ready for Disbursement", "Approved loan should be ready for disbursement");

  const disbursedLoan = await api("POST", `/loans/${loan.data.id}/disburse`, null, saccoToken);
  assert(disbursedLoan.data.status === "active", "Disbursed loan should become active");
  assert(disbursedLoan.data.balance === disbursedLoan.data.amount, "Disbursed loan balance should equal principal");

  const repaymentPayload = {
    amount: 200000,
    channel: "cash",
    externalReference: `SMOKE-LRP-${Date.now()}`
  };
  const repayment = await api("POST", `/loans/${loan.data.id}/repayments`, repaymentPayload, saccoToken);
  assert(repayment.data.repayment.id, "Loan repayment should be recorded");
  assert(repayment.data.loan.balance === disbursedLoan.data.amount - repaymentPayload.amount, "Repayment should reduce the outstanding loan balance");
  assert(repayment.data.loan.repaymentTotal === repaymentPayload.amount, "Loan should expose total repayments");

  const duplicateRepayment = await api("POST", `/loans/${loan.data.id}/repayments`, repaymentPayload, saccoToken);
  assert(duplicateRepayment.data.idempotent === true, "Duplicate repayment reference should return the existing repayment");

  const overpayment = await raw("POST", `/loans/${loan.data.id}/repayments`, {
    amount: 999999999,
    channel: "cash",
    externalReference: `SMOKE-OVERPAY-LRP-${Date.now()}`
  }, saccoToken);
  assert(overpayment.status === 409, "Repayment should not exceed the outstanding balance");

  const invalidTenantLoan = await raw("POST", "/loans", {
    memberId: "member_lake_peter",
    product: "Agriculture Loan",
    amount: 500000,
    repaymentMonths: 8
  }, saccoToken);
  assert(invalidTenantLoan.status === 400, "SACCO admin should not create a loan for another tenant member");

  const transactions = await api("GET", "/financial-transactions", null, saccoToken);
  assert(transactions.data.length >= 3, "SACCO admin should list own financial transactions");
  assert(transactions.data.every((transaction) => transaction.tenantId === "tenant_green"), "Financial transaction list must be tenant-scoped");

  const pendingSeededTransaction = transactions.data.find((item) => item.status === "pending_approval");
  assert(pendingSeededTransaction, "Seed data should include a pending financial transaction");
  const postedTransaction = await api("PATCH", `/financial-transactions/${pendingSeededTransaction.id}/status`, { status: "posted" }, platformToken);
  assert(postedTransaction.data.status === "posted", "Platform checker should post a pending financial transaction");
  assert(postedTransaction.data.checkerUserId, "Posted financial transaction should record a checker");

  const transaction = await api("POST", "/financial-transactions", {
    memberId: member.data.id,
    branchId: branch.data.id,
    type: "savings_deposit",
    channel: "cash",
    amount: 75000,
    narration: "Smoke test savings deposit"
  }, saccoToken);
  assert(transaction.data.id, "Financial transaction should be created");
  assert(transaction.data.status === "pending_approval", "New financial transaction should require approval");

  const makerDecision = await raw("PATCH", `/financial-transactions/${transaction.data.id}/status`, { status: "posted" }, saccoToken);
  assert(makerDecision.status === 409, "Maker should not approve their own financial transaction");

  const rejectedTransaction = await api("PATCH", `/financial-transactions/${transaction.data.id}/status`, {
    status: "rejected",
    reason: "Smoke test rejection"
  }, platformToken);
  assert(rejectedTransaction.data.status === "rejected", "Checker should reject a pending financial transaction");
  assert(rejectedTransaction.data.rejectionReason === "Smoke test rejection", "Rejected transaction should record the reason");

  const invalidTenantTransaction = await raw("POST", "/financial-transactions", {
    memberId: "member_lake_peter",
    branchId: "branch_lake_main",
    type: "savings_deposit",
    channel: "cash",
    amount: 10000
  }, saccoToken);
  assert(invalidTenantTransaction.status === 400, "SACCO admin should not post against another tenant member");

  const lakeMemberDenied = await raw("GET", "/members/member_lake_peter", null, saccoToken);
  assert(lakeMemberDenied.status === 403, "SACCO admin should be blocked from another tenant member");

  const chartOfAccounts = await api("GET", "/chart-of-accounts", null, saccoToken);
  assert(chartOfAccounts.data.some((account) => account.code === "1100"), "Chart of accounts should include loans receivable");

  const statementLine = await api("POST", "/statement-lines", {
    channel: "bank",
    amount: postedTransaction.data.amount,
    externalReference: postedTransaction.data.reference,
    description: "Smoke test bank statement line"
  }, saccoToken);
  assert(statementLine.data.id, "Statement line import should return an id");
  assert(statementLine.data.accountCode === "1010", "Bank statement lines should map to the bank account");

  const duplicateStatementLine = await raw("POST", "/statement-lines", {
    channel: "bank",
    amount: postedTransaction.data.amount,
    externalReference: postedTransaction.data.reference
  }, saccoToken);
  assert(duplicateStatementLine.status === 409, "Statement line references should be unique per tenant");

  const statementLines = await api("GET", "/statement-lines", null, saccoToken);
  assert(statementLines.data.every((line) => line.tenantId === "tenant_green"), "Statement lines must be tenant-scoped");

  const journalEntries = await api("GET", "/journal-entries", null, saccoToken);
  assert(journalEntries.data.length >= 4, "SACCO admin should list derived journal entries");
  assert(journalEntries.data.every((entry) => entry.tenantId === "tenant_green"), "Journal entries must be tenant-scoped");
  assert(journalEntries.data.every((entry) => entry.isBalanced), "Every derived journal entry should be balanced");
  assert(journalEntries.data.some((entry) => entry.sourceType === "loan_repayment"), "Loan repayments should create journal entries");

  const platformJournals = await api("GET", "/journal-entries", null, platformToken);
  assert(platformJournals.data.length >= journalEntries.data.length, "Platform admin should list journals across tenants");
  assert(platformJournals.data.every((entry) => entry.debitTotal === entry.creditTotal), "Platform journal listing should remain balanced");

  const reconciliation = await api("GET", "/reconciliation", null, saccoToken);
  assert(reconciliation.data.summary.matched >= 3, "Reconciliation should match statement lines to ledger lines");
  assert(reconciliation.data.summary.unmatchedStatementLines >= 1, "Reconciliation should expose unmatched statement lines");
  assert(reconciliation.data.unmatchedStatementLines.some((line) => line.externalReference === "BANK-FEE-0001"), "Seeded bank charge should remain unmatched");

  const governanceMeeting = await api("POST", "/governance-meetings", {
    title: "Smoke governance review",
    meetingType: "board",
    scheduledAt: "2026-07-30T09:00:00.000Z",
    minutes: "Smoke test agenda"
  }, saccoToken);
  assert(governanceMeeting.data.id, "Governance meeting should be created");
  assert(governanceMeeting.data.tenantId === "tenant_green", "Governance meeting should be tenant-scoped");

  const resolution = await api("POST", `/governance-meetings/${governanceMeeting.data.id}/resolutions`, {
    title: "Resolve smoke reconciliation exception",
    decision: "Assign accountant to review unmatched bank fees.",
    dueDate: "2026-08-05"
  }, saccoToken);
  assert(resolution.data.status === "open", "New governance resolution should start open");

  const meetings = await api("GET", "/governance-meetings", null, saccoToken);
  assert(meetings.data.every((meeting) => meeting.tenantId === "tenant_green"), "Governance meetings must be tenant-scoped");
  assert(meetings.data.some((meeting) => meeting.id === governanceMeeting.data.id && meeting.openResolutions >= 1), "Meeting list should include open resolution counts");

  const complaint = await api("POST", "/complaints", {
    memberId: "member_green_amina",
    category: "service",
    subject: "Smoke complaint",
    description: "Smoke test complaint capture",
    priority: "high"
  }, saccoToken);
  assert(complaint.data.status === "open", "Complaint should start open");
  assert(complaint.data.member.fullName === "Amina Nakitende", "Complaint should include linked member details");

  const resolvedComplaint = await api("PATCH", `/complaints/${complaint.data.id}/status`, {
    status: "resolved",
    resolution: "Smoke complaint resolved"
  }, saccoToken);
  assert(resolvedComplaint.data.status === "resolved", "Complaint status should update");
  assert(resolvedComplaint.data.resolvedByUserId, "Resolved complaint should capture resolver");

  const complaints = await api("GET", "/complaints", null, saccoToken);
  assert(complaints.data.every((item) => item.tenantId === "tenant_green"), "Complaints must be tenant-scoped");

  console.log("API smoke test passed");
} finally {
  server.kill();
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Server did not start. Output:\n${output}`);
}

async function api(method, path, body, token) {
  const response = await raw(method, path, body, token);
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

function raw(method, path, body, token) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
