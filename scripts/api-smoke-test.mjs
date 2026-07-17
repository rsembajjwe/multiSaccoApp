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

  const healthResponse = await raw("GET", "/health");
  assert(healthResponse.headers.get("x-content-type-options") === "nosniff", "API responses should include nosniff security header");
  assert(healthResponse.headers.get("x-frame-options") === "DENY", "API responses should deny framing");
  assert(healthResponse.headers.get("referrer-policy") === "no-referrer", "API responses should suppress referrer leakage");
  const health = await healthResponse.json();
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

  const createdTenantProfile = await api("GET", `/tenants/${tenant.data.id}/profile`, null, platformToken);
  assert(createdTenantProfile.data.legalName === tenant.data.name, "New tenants should receive a default SACCO profile");

  const updatedTenantProfile = await api("PATCH", `/tenants/${tenant.data.id}/profile`, {
    legalName: `${tenant.data.name} Limited`,
    tin: "1009998887",
    umraLicenseNo: "UMRA-SMOKE-2026",
    cooperativeRegistrationNo: tenant.data.registrationNo,
    address: "Smoke test address",
    email: "profile-smoke@example.local",
    phone: "+256700222333",
    website: "https://profile-smoke.example.local"
  }, platformToken);
  assert(updatedTenantProfile.data.umraLicenseNo === "UMRA-SMOKE-2026", "SACCO profile should update licence details");
  assert(updatedTenantProfile.data.email === "profile-smoke@example.local", "SACCO profile should update contact details");

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

  const saccoProfile = await api("GET", "/tenants/tenant_green/profile", null, saccoToken);
  assert(saccoProfile.data.tenantId === "tenant_green", "SACCO admin should read own tenant profile");

  const crossTenantProfile = await raw("GET", "/tenants/tenant_lake/profile", null, saccoToken);
  assert(crossTenantProfile.status === 403, "SACCO admin should not read another tenant profile");

  const invalidProfileEmail = await raw("PATCH", "/tenants/tenant_green/profile", { email: "not-an-email" }, saccoToken);
  assert(invalidProfileEmail.status === 400, "SACCO profile should reject invalid emails");

  const permissions = await api("GET", "/permissions", null, saccoToken);
  assert(permissions.data.length >= 20, "Permission catalog should include the core modules");
  assert(permissions.data.some((permission) => permission.id === "roles:create"), "Permission catalog should include role creation");

  const roles = await api("GET", "/roles", null, saccoToken);
  assert(roles.data.length >= 2, "SACCO admin should list own roles");
  assert(roles.data.every((role) => role.tenantId === "tenant_green"), "Roles must be tenant-scoped");

  const customRole = await api("POST", "/roles", {
    name: `Smoke Cashier ${Date.now()}`,
    permissionIds: ["members:view", "transactions:create", "transactions:create"]
  }, saccoToken);
  assert(customRole.data.tenantId === "tenant_green", "Custom role should be created in authenticated tenant");
  assert(customRole.data.permissionIds.length === 2, "Custom role should deduplicate permissions");

  const duplicateRole = await raw("POST", "/roles", {
    name: customRole.data.name,
    permissionIds: ["members:view"]
  }, saccoToken);
  assert(duplicateRole.status === 409, "Role names should be unique per tenant");

  const unknownPermissionRole = await raw("POST", "/roles", {
    name: `Unknown Permission ${Date.now()}`,
    permissionIds: ["members:view", "unknown:permission"]
  }, saccoToken);
  assert(unknownPermissionRole.status === 400, "Roles should reject unknown permissions");

  const crossTenantRole = await raw("POST", "/roles", {
    tenantId: "tenant_lake",
    name: "Cross Tenant Role"
  }, saccoToken);
  assert(crossTenantRole.status === 403, "SACCO admin should not create another tenant role");

  const initialAssignment = await api("GET", `/users/${user.data.id}/roles`, null, saccoToken);
  assert(initialAssignment.data.userId === user.data.id, "User role assignment should identify the user");

  const assignedRoles = await api("PUT", `/users/${user.data.id}/roles`, {
    roleIds: [customRole.data.id, customRole.data.id]
  }, saccoToken);
  assert(assignedRoles.data.roleIds.length === 1, "User role assignment should deduplicate roles");
  assert(assignedRoles.data.roleIds[0] === customRole.data.id, "User role assignment should store the selected role");

  const emptyAssignment = await raw("PUT", `/users/${user.data.id}/roles`, { roleIds: [] }, saccoToken);
  assert(emptyAssignment.status === 400, "User role assignment should require at least one role");

  const crossTenantAssignment = await raw("PUT", `/users/${user.data.id}/roles`, { roleIds: ["role_platform_admin"] }, saccoToken);
  assert(crossTenantAssignment.status === 400, "User role assignment should reject cross-tenant roles");

  const workflows = await api("GET", "/approval-workflows", null, saccoToken);
  assert(workflows.data.length >= 2, "SACCO admin should list own approval workflows");
  assert(workflows.data.every((workflow) => workflow.tenantId === "tenant_green"), "Approval workflows must be tenant-scoped");

  const workflow = await api("POST", "/approval-workflows", {
    name: `Smoke expense approval ${Date.now()}`,
    module: "expenses"
  }, saccoToken);
  assert(workflow.data.tenantId === "tenant_green", "Approval workflow should be created in authenticated tenant");
  assert(workflow.data.active === true, "Approval workflow should default active");

  const duplicateWorkflow = await raw("POST", "/approval-workflows", {
    name: workflow.data.name,
    module: "expenses"
  }, saccoToken);
  assert(duplicateWorkflow.status === 409, "Approval workflow names should be unique per tenant and module");

  const invalidWorkflow = await raw("POST", "/approval-workflows", {
    name: "Bad workflow",
    module: "bad_module"
  }, saccoToken);
  assert(invalidWorkflow.status === 400, "Approval workflows should reject unsupported modules");

  const rejectedWithoutReason = await raw("POST", "/approval-decisions", {
    workflowId: workflow.data.id,
    resourceType: "expense",
    resourceId: "expense_green_0001",
    decision: "rejected"
  }, saccoToken);
  assert(rejectedWithoutReason.status === 400, "Rejected approval decisions should require a reason");

  const approvalDecision = await api("POST", "/approval-decisions", {
    workflowId: workflow.data.id,
    resourceType: "expense",
    resourceId: "expense_green_0001",
    decision: "approved"
  }, saccoToken);
  assert(approvalDecision.data.workflowId === workflow.data.id, "Approval decision should reference its workflow");
  assert(approvalDecision.data.decision === "approved", "Approval decision should keep the decision value");

  const approvedDecisions = await api("GET", "/approval-decisions?decision=approved", null, saccoToken);
  assert(approvedDecisions.data.some((decision) => decision.id === approvalDecision.data.id), "Approval decisions should be filterable");

  const crossTenantWorkflows = await raw("GET", "/approval-workflows?tenantId=tenant_lake", null, saccoToken);
  assert(crossTenantWorkflows.status === 403, "SACCO admin should not list another tenant approval workflows");

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

  const initialMobileDashboard = await api("GET", "/member-auth/mobile-dashboard", null, memberToken);
  assert(initialMobileDashboard.data.serverConfirmed === true, "Mobile dashboard should be server-confirmed");
  assert(initialMobileDashboard.data.lastUpdatedAt, "Mobile dashboard should include a last-updated timestamp");
  assert(initialMobileDashboard.data.balances.savings === 250000, "Mobile dashboard should include member balances");

  const mobileLoan = await api("POST", "/member-auth/mobile-loans", {
    product: "Emergency Loan",
    amount: 650000,
    repaymentMonths: 8,
    purpose: "Mobile emergency application"
  }, memberToken);
  assert(mobileLoan.data.status === "submitted", "Mobile loan application should start submitted");
  assert(mobileLoan.data.memberId === memberLogin.data.member.id, "Mobile loan must be submitted for the authenticated member");
  assert(mobileLoan.data.channel === "mobile", "Mobile loan should be marked as mobile-originated");

  const mobileComplaint = await api("POST", "/member-auth/mobile-complaints", {
    subject: "Offline draft smoke complaint",
    category: "service",
    priority: "medium",
    description: "Synced from a mobile offline draft"
  }, memberToken);
  assert(mobileComplaint.data.status === "open", "Synced mobile complaint should start open");
  assert(mobileComplaint.data.member.id === memberLogin.data.member.id, "Synced mobile complaint should belong to the authenticated member");
  assert(mobileComplaint.data.channel === "mobile_offline_sync", "Synced complaint should record the offline sync channel");

  const mobileMoneyReference = `MM-SMOKE-${Date.now()}`;
  const mobileMoneyCallback = await api("POST", "/integrations/mobile-money/callback", {
    tenantId: "tenant_green",
    membershipNo: "GVS-0001",
    purpose: "savings_deposit",
    amount: 30000,
    externalReference: mobileMoneyReference,
    provider: "smoke_mobile_money",
    receivedAt: "2026-07-15T08:00:00.000Z"
  });
  assert(mobileMoneyCallback.data.callback.status === "posted", "Mobile-money callback should post");
  assert(mobileMoneyCallback.data.result.resourceType === "financial_transaction", "Collection callback should create a financial transaction");
  assert(mobileMoneyCallback.data.deliveries.some((delivery) => delivery.channel === "sms"), "Callback should enqueue an SMS delivery");
  assert(mobileMoneyCallback.data.deliveries.some((delivery) => delivery.channel === "email"), "Callback should enqueue an email delivery");

  const duplicateMobileMoneyCallback = await api("POST", "/integrations/mobile-money/callback", {
    tenantId: "tenant_green",
    membershipNo: "GVS-0001",
    purpose: "savings_deposit",
    amount: 30000,
    externalReference: mobileMoneyReference,
    provider: "smoke_mobile_money",
    receivedAt: "2026-07-15T08:00:00.000Z"
  });
  assert(duplicateMobileMoneyCallback.data.idempotent === true, "Duplicate mobile-money callbacks should be idempotent");

  const loanRepaymentCallback = await api("POST", "/integrations/mobile-money/callback", {
    tenantId: "tenant_green",
    memberId: "member_green_amina",
    loanId: "loan_green_0001",
    purpose: "loan_repayment",
    amount: 50000,
    externalReference: `MM-LRP-SMOKE-${Date.now()}`,
    provider: "smoke_mobile_money",
    receivedAt: "2026-07-15T08:15:00.000Z"
  });
  assert(loanRepaymentCallback.data.result.resourceType === "loan_repayment", "Loan callback should create a loan repayment");

  const refreshedMemberSession = await api("GET", "/member-auth/me", null, memberToken);
  assert(refreshedMemberSession.data.balances.savings === 280000, "Mobile-money collection should update member savings once");

  const refreshedMobileDashboard = await api("GET", "/member-auth/mobile-dashboard", null, memberToken);
  assert(refreshedMobileDashboard.data.balances.savings === 280000, "Mobile dashboard should refresh after confirmed payment");
  assert(refreshedMobileDashboard.data.loans.some((loan) => loan.id === mobileLoan.data.id), "Mobile dashboard should include submitted mobile loan");
  assert(refreshedMobileDashboard.data.notifications.length >= 1, "Mobile dashboard should include latest notifications");

  const memberNotifications = await api("GET", "/member-auth/notifications", null, memberToken);
  assert(memberNotifications.data.some((notification) => notification.eventType === "payment_received"), "Member should receive payment notification");
  assert(memberNotifications.data.some((notification) => notification.eventType === "loan_repayment_received"), "Member should receive loan repayment notification");
  assert(memberNotifications.data.some((notification) => notification.eventType === "complaint_synced"), "Member should receive complaint sync notification");

  const mobileMoneyCallbacks = await api("GET", "/integrations/mobile-money/callbacks", null, saccoToken);
  assert(mobileMoneyCallbacks.data.some((callback) => callback.externalReference === mobileMoneyReference), "SACCO admin should list tenant mobile-money callbacks");

  const notificationDeliveries = await api("GET", "/notifications/deliveries", null, saccoToken);
  assert(notificationDeliveries.data.some((delivery) => delivery.channel === "sms" && delivery.status === "sent"), "SACCO admin should see SMS delivery history");
  assert(notificationDeliveries.data.some((delivery) => delivery.channel === "email" && delivery.status === "sent"), "SACCO admin should see email delivery history");

  const notificationTemplates = await api("GET", "/notification-templates", null, saccoToken);
  assert(notificationTemplates.data.some((template) => template.eventType === "payment_received"), "SACCO admin should see global notification templates");

  const template = await api("POST", "/notification-templates", {
    eventType: `smoke_event_${Date.now()}`,
    channel: "email",
    title: "Smoke notification",
    body: "Smoke notification body"
  }, saccoToken);
  assert(template.data.tenantId === "tenant_green", "New templates should belong to the authenticated SACCO");
  assert(template.data.status === "active", "New templates should default active");

  const updatedTemplate = await api("PATCH", `/notification-templates/${template.data.id}`, {
    title: "Updated smoke notification",
    status: "inactive"
  }, saccoToken);
  assert(updatedTemplate.data.title === "Updated smoke notification", "Notification templates should update title");
  assert(updatedTemplate.data.status === "inactive", "Notification templates should update status");

  const invalidTemplate = await raw("POST", "/notification-templates", {
    eventType: "bad template",
    channel: "fax",
    title: "Bad",
    body: "Bad"
  }, saccoToken);
  assert(invalidTemplate.status === 400, "Notification templates should reject unsupported channels");

  const globalTemplateUpdate = await raw("PATCH", "/notification-templates/template_payment_received", {
    status: "inactive"
  }, saccoToken);
  assert(globalTemplateUpdate.status === 403, "SACCO admin should not update global notification templates");

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

  const importTemplate = await api("GET", "/members/import-template", null, saccoToken);
  assert(importTemplate.data.tenantId === "tenant_green", "Member import template should use the authenticated tenant");
  assert(importTemplate.data.filename === "member-import-template-tenant_green.csv", "Member import template should include tenant filename");
  assert(importTemplate.data.headers.includes("branchId"), "Member import template should include branchId header");
  assert(importTemplate.data.sampleRows[0].branchId === branch.data.id || importTemplate.data.sampleRows[0].branchId === "branch_green_main", "Member import template should include a tenant branch");
  assert(importTemplate.data.csv.startsWith("membershipNo,branchId,fullName"), "Member import template should include CSV content");

  const deniedImportTemplate = await raw("GET", "/members/import-template?tenantId=tenant_lake", null, saccoToken);
  assert(deniedImportTemplate.status === 403, "SACCO admin should not fetch another tenant import template");

  const lakeImportTemplate = await api("GET", "/members/import-template?tenantId=tenant_lake", null, platformToken);
  assert(lakeImportTemplate.data.tenantId === "tenant_lake", "Platform admin should fetch tenant-specific import templates");
  assert(lakeImportTemplate.data.sampleRows[0].branchId === "branch_lake_main", "Import template should use requested tenant branch defaults");

  const document = await api("POST", `/members/${member.data.id}/documents`, {
    documentType: "national_id",
    storageKey: `tenant_green/members/${member.data.id}/national-id.pdf`
  }, saccoToken);
  assert(document.data.id, "Member document metadata should be created");

  const documents = await api("GET", `/members/${member.data.id}/documents`, null, saccoToken);
  assert(documents.data.some((item) => item.id === document.data.id), "Member documents should be listed");

  const nextOfKin = await api("POST", `/members/${member.data.id}/next-of-kin`, {
    fullName: "Smoke Kin",
    relationship: "Spouse",
    phone: "+256700999888",
    address: "Smoke address",
    primaryContact: true
  }, saccoToken);
  assert(nextOfKin.data.relationship === "spouse", "Next of kin relationship should be normalized");
  assert(nextOfKin.data.primaryContact === true, "Next of kin should keep primary contact flag");

  const nextOfKinList = await api("GET", `/members/${member.data.id}/next-of-kin`, null, saccoToken);
  assert(nextOfKinList.data.some((item) => item.id === nextOfKin.data.id), "Next of kin should be listed");

  const beneficiary = await api("POST", `/members/${member.data.id}/beneficiaries`, {
    fullName: "Smoke Beneficiary",
    relationship: "Child",
    phone: "+256701999888",
    allocationPercent: 60
  }, saccoToken);
  assert(beneficiary.data.relationship === "child", "Beneficiary relationship should be normalized");
  assert(beneficiary.data.allocationPercent === 60, "Beneficiary allocation should be returned");

  const beneficiaryList = await api("GET", `/members/${member.data.id}/beneficiaries`, null, saccoToken);
  assert(beneficiaryList.data.some((item) => item.id === beneficiary.data.id), "Beneficiaries should be listed");

  const excessiveBeneficiary = await raw("POST", `/members/${member.data.id}/beneficiaries`, {
    fullName: "Too Much Smoke",
    relationship: "Sibling",
    allocationPercent: 41
  }, saccoToken);
  assert(excessiveBeneficiary.status === 400, "Beneficiary allocations should not exceed 100 percent");

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

  const products = await api("GET", "/financial-products", null, saccoToken);
  assert(products.data.length >= 3, "SACCO admin should list financial products");
  assert(products.data.every((product) => product.tenantId === "tenant_green"), "Financial products must be tenant-scoped");

  const product = await api("POST", "/financial-products", {
    productType: "savings",
    code: `SMK-SAV-${Date.now().toString().slice(-5)}`,
    name: "Smoke Savings",
    contributionAmount: 0,
    minimumBalance: 10000,
    interestRate: 1.5
  }, saccoToken);
  assert(product.data.id, "Financial product should be created");
  assert(product.data.productType === "savings", "Financial product should keep its type");

  const duplicateProduct = await raw("POST", "/financial-products", {
    productType: "savings",
    code: product.data.code,
    name: "Duplicate Smoke Savings",
    contributionAmount: 0,
    minimumBalance: 0
  }, saccoToken);
  assert(duplicateProduct.status === 409, "Financial product codes should be unique per tenant");

  const accounts = await api("GET", "/financial-accounts", null, saccoToken);
  assert(accounts.data.length >= 3, "SACCO admin should list financial accounts");
  assert(accounts.data.every((account) => account.tenantId === "tenant_green"), "Financial accounts must be tenant-scoped");

  const account = await api("POST", "/financial-accounts", {
    memberId: member.data.id,
    productId: product.data.id,
    accountType: "savings"
  }, saccoToken);
  assert(account.data.id, "Financial account should be opened");
  assert(account.data.productCode === product.data.code, "Financial account should include product details");
  assert(account.data.membershipNo === member.data.membershipNo, "Financial account should include member details");

  const duplicateAccount = await raw("POST", "/financial-accounts", {
    memberId: member.data.id,
    productId: product.data.id,
    accountType: "savings"
  }, saccoToken);
  assert(duplicateAccount.status === 409, "A member cannot open the same product account twice");

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

  const receipt = await api("GET", `/financial-transactions/${postedTransaction.data.id}/receipt`, null, saccoToken);
  assert(receipt.data.receiptNo === `RCT-${postedTransaction.data.reference}`, "Posted transaction receipt should use the transaction reference");
  assert(receipt.data.printableText.includes(receipt.data.memberName), "Receipt should include printable member details");

  const statementBeforeReversal = await api("GET", `/members/${postedTransaction.data.memberId}/statement`, null, saccoToken);
  assert(statementBeforeReversal.data.lines.some((line) => line.transactionId === postedTransaction.data.id), "Member statement should include the posted transaction");

  const reversal = await api("POST", `/financial-transactions/${postedTransaction.data.id}/reversal`, {
    reason: "Smoke reversal correction"
  }, saccoToken);
  assert(reversal.data.status === "posted", "Reversal should be posted immediately");
  assert(reversal.data.originalTransactionId === postedTransaction.data.id, "Reversal should reference the original transaction");

  const statementAfterReversal = await api("GET", `/members/${postedTransaction.data.memberId}/statement`, null, saccoToken);
  assert(statementAfterReversal.data.lines.some((line) => line.transactionId === reversal.data.id && line.originalTransactionId === postedTransaction.data.id), "Member statement should include the reversal movement");

  const duplicateReversal = await raw("POST", `/financial-transactions/${postedTransaction.data.id}/reversal`, {
    reason: "Second smoke reversal correction"
  }, saccoToken);
  assert(duplicateReversal.status === 409, "A transaction should not be reversed twice");

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

  const accountingPeriods = await api("GET", "/accounting-periods", null, saccoToken);
  assert(accountingPeriods.data.some((period) => period.period === "2026-06" && period.status === "closed"), "Seed data should include a closed accounting period");
  assert(accountingPeriods.data.every((period) => period.tenantId === "tenant_green"), "Accounting periods must be tenant-scoped");

  const closedPeriodStatementLine = await raw("POST", "/statement-lines", {
    channel: "bank",
    amount: 15000,
    externalReference: `SMOKE-CLOSED-${Date.now()}`,
    statementDate: "2026-06-15"
  }, saccoToken);
  assert(closedPeriodStatementLine.status === 409, "Closed periods should block ordinary statement imports");

  const openPeriod = accountingPeriods.data.find((period) => period.period === "2026-07" && period.status === "open");
  assert(openPeriod, "Seed data should include an open current accounting period");
  const closedPeriod = await api("PATCH", `/accounting-periods/${openPeriod.id}/status`, { status: "closed" }, saccoToken);
  assert(closedPeriod.data.status === "closed", "Accounting period should close");
  const reopenedPeriod = await api("PATCH", `/accounting-periods/${openPeriod.id}/status`, { status: "open" }, saccoToken);
  assert(reopenedPeriod.data.status === "open", "Accounting period should reopen for the remaining smoke test");

  const supplier = await api("POST", "/suppliers", {
    name: `Smoke Supplier ${Date.now()}`,
    phone: "+256700123123",
    taxId: `TIN-${Date.now()}`
  }, saccoToken);
  assert(supplier.data.id, "Supplier should be created");
  assert(supplier.data.tenantId === "tenant_green", "Supplier should be tenant-scoped");

  const closedPeriodExpense = await raw("POST", "/expenses", {
    supplierId: supplier.data.id,
    accountCode: "5000",
    channel: "bank",
    amount: 25000,
    reference: `SMOKE-CLOSED-EXP-${Date.now()}`,
    expenseDate: "2026-06-15"
  }, saccoToken);
  assert(closedPeriodExpense.status === 409, "Closed periods should block expenses");

  const expense = await api("POST", "/expenses", {
    supplierId: supplier.data.id,
    accountCode: "5040",
    channel: "bank",
    amount: 45000,
    reference: `SMOKE-EXP-${Date.now()}`,
    expenseDate: "2026-07-15",
    description: "Smoke test technology expense"
  }, saccoToken);
  assert(expense.data.id, "Expense should be posted");
  assert(expense.data.supplier.name === supplier.data.name, "Expense should include supplier details");

  const duplicateExpense = await raw("POST", "/expenses", {
    supplierId: supplier.data.id,
    accountCode: "5040",
    channel: "bank",
    amount: 45000,
    reference: expense.data.reference,
    expenseDate: "2026-07-15"
  }, saccoToken);
  assert(duplicateExpense.status === 409, "Expense references should be unique per tenant");

  const closedPeriodAsset = await raw("POST", "/assets", {
    name: "Closed Period Laptop",
    category: "technology",
    channel: "bank",
    cost: 1800000,
    usefulLifeMonths: 36,
    reference: `SMOKE-CLOSED-AST-${Date.now()}`,
    purchaseDate: "2026-06-15"
  }, saccoToken);
  assert(closedPeriodAsset.status === 409, "Closed periods should block asset acquisition");

  const asset = await api("POST", "/assets", {
    name: "Smoke Test Laptop",
    category: "technology",
    channel: "bank",
    cost: 1800000,
    salvageValue: 0,
    usefulLifeMonths: 36,
    reference: `SMOKE-AST-${Date.now()}`,
    purchaseDate: "2026-07-15",
    depreciationStartDate: "2026-07-01",
    location: "Smoke branch"
  }, saccoToken);
  assert(asset.data.id, "Asset should be registered");
  assert(asset.data.netBookValue < asset.data.cost, "Asset should include derived depreciation");

  const duplicateAsset = await raw("POST", "/assets", {
    name: "Duplicate Smoke Test Laptop",
    category: "technology",
    channel: "bank",
    cost: 1800000,
    usefulLifeMonths: 36,
    reference: asset.data.reference,
    purchaseDate: "2026-07-15"
  }, saccoToken);
  assert(duplicateAsset.status === 409, "Asset references should be unique per tenant");

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
  assert(journalEntries.data.some((entry) => entry.sourceType === "expense"), "Expenses should create journal entries");
  assert(journalEntries.data.some((entry) => entry.sourceType === "asset_acquisition"), "Assets should create acquisition journal entries");
  assert(journalEntries.data.some((entry) => entry.sourceType === "asset_depreciation"), "Assets should create depreciation journal entries");

  const platformJournals = await api("GET", "/journal-entries", null, platformToken);
  assert(platformJournals.data.length >= journalEntries.data.length, "Platform admin should list journals across tenants");
  assert(platformJournals.data.every((entry) => entry.debitTotal === entry.creditTotal), "Platform journal listing should remain balanced");

  const reconciliation = await api("GET", "/reconciliation", null, saccoToken);
  assert(reconciliation.data.summary.matched >= 3, "Reconciliation should match statement lines to ledger lines");
  assert(reconciliation.data.summary.unmatchedStatementLines >= 1, "Reconciliation should expose unmatched statement lines");
  assert(reconciliation.data.unmatchedStatementLines.some((line) => line.externalReference === "BANK-FEE-0001"), "Seeded bank charge should remain unmatched");

  const regulatoryReport = await api("GET", "/regulatory-report", null, saccoToken);
  assert(regulatoryReport.data.reports.length === 1, "SACCO admin should receive one tenant regulatory report");
  assert(regulatoryReport.data.reports[0].tenantId === "tenant_green", "Regulatory report must be tenant-scoped");
  assert(regulatoryReport.data.reports[0].loanPortfolio > 0, "Regulatory report should include loan portfolio");
  assert(regulatoryReport.data.reports[0].assetNetBookValue > 0, "Regulatory report should include fixed assets");
  assert(regulatoryReport.data.csv.includes("loan_portfolio"), "Regulatory report should include exportable CSV data");

  const platformRegulatoryReport = await api("GET", "/regulatory-report", null, platformToken);
  assert(platformRegulatoryReport.data.reports.length >= 2, "Platform admin should receive consolidated tenant reports");
  assert(platformRegulatoryReport.data.consolidated.memberCount >= regulatoryReport.data.consolidated.memberCount, "Consolidated report should include tenant totals");

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

  let rateLimitedLogin = null;
  for (let index = 0; index < 8; index += 1) {
    const response = await raw("POST", "/auth/login", {
      email: `bad-login-${index}@example.local`,
      password: "wrong-password"
    });
    if (response.status === 429) {
      rateLimitedLogin = response;
      break;
    }
  }
  assert(rateLimitedLogin?.status === 429, "Repeated login failures should be rate limited");
  assert(rateLimitedLogin.headers.get("retry-after"), "Rate-limited responses should include Retry-After");

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
