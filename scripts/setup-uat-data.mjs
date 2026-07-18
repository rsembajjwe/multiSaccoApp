const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080/api/v1").replace(/\/$/, "");
const runId = process.env.UAT_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const memberPassword = process.env.UAT_MEMBER_PASSWORD || "Member@12345";
const staffPassword = process.env.UAT_STAFF_PASSWORD || "Sacco@12345";

const evidence = {
  baseUrl,
  runId,
  tenantId: "tenant_green",
  platformAdmin: {
    email: "admin@platform.local",
    password: "Admin@12345"
  },
  saccoAdmin: {
    email: "admin@greenvalley.local",
    password: "Sacco@12345"
  },
  created: {}
};

try {
  await waitForApi();

  const platformToken = (await api("POST", "/auth/login", {
    email: evidence.platformAdmin.email,
    password: evidence.platformAdmin.password
  })).data.token;

  const saccoToken = (await api("POST", "/auth/login", {
    email: evidence.saccoAdmin.email,
    password: evidence.saccoAdmin.password
  })).data.token;

  const branch = await api("POST", "/branches", {
    code: `UAT${runId.slice(-5)}`,
    name: `UAT Branch ${runId}`,
    address: "UAT staging branch"
  }, saccoToken);
  evidence.created.branch = pick(branch.data, ["id", "code", "name"]);

  const staff = await api("POST", "/users", {
    tenantId: "tenant_green",
    fullName: `UAT Staff ${runId}`,
    email: `uat.staff.${runId}@greenvalley.local`,
    phone: "+256700555111",
    password: staffPassword
  }, platformToken);
  evidence.created.staffUser = {
    ...pick(staff.data, ["id", "email", "fullName"]),
    password: staffPassword
  };

  const roles = await api("GET", "/roles", null, saccoToken);
  const adminRole = roles.data.find((role) => role.name.toLowerCase().includes("admin")) || roles.data[0];
  if (adminRole) {
    await api("PUT", `/users/${staff.data.id}/roles`, { roleIds: [adminRole.id] }, saccoToken);
    evidence.created.staffUser.roleId = adminRole.id;
  }

  const member = await api("POST", "/members", {
    branchId: branch.data.id,
    membershipNo: `UAT-${runId}`,
    fullName: `UAT Member ${runId}`,
    memberType: "individual",
    phone: "+256700555222",
    email: `uat.member.${runId}@example.local`,
    nationalId: `UAT-NIN-${runId}`,
    kycStatus: "verified",
    password: memberPassword
  }, saccoToken);
  const activeMember = await api("PATCH", `/members/${member.data.id}/status`, { status: "active" }, saccoToken);
  evidence.created.member = {
    ...pick(activeMember.data, ["id", "membershipNo", "fullName", "phone", "email", "status", "kycStatus"]),
    password: memberPassword
  };

  const savings = await api("POST", "/financial-transactions", {
    memberId: activeMember.data.id,
    branchId: branch.data.id,
    type: "savings_deposit",
    channel: "cash",
    amount: 150000,
    narration: `UAT savings deposit ${runId}`
  }, saccoToken);
  const shares = await api("POST", "/financial-transactions", {
    memberId: activeMember.data.id,
    branchId: branch.data.id,
    type: "share_purchase",
    channel: "cash",
    amount: 50000,
    narration: `UAT share purchase ${runId}`
  }, saccoToken);
  const welfare = await api("POST", "/financial-transactions", {
    memberId: activeMember.data.id,
    branchId: branch.data.id,
    type: "welfare_contribution",
    channel: "cash",
    amount: 25000,
    narration: `UAT welfare contribution ${runId}`
  }, saccoToken);

  const postedSavings = await api("PATCH", `/financial-transactions/${savings.data.id}/status`, { status: "posted" }, platformToken);
  const postedShares = await api("PATCH", `/financial-transactions/${shares.data.id}/status`, { status: "posted" }, platformToken);
  const pendingWelfare = welfare.data;
  evidence.created.transactions = {
    postedSavings: pick(postedSavings.data, ["id", "reference", "type", "status", "amount"]),
    postedShares: pick(postedShares.data, ["id", "reference", "type", "status", "amount"]),
    pendingWelfare: pick(pendingWelfare, ["id", "reference", "type", "status", "amount"])
  };

  const reversible = await api("POST", "/financial-transactions", {
    memberId: activeMember.data.id,
    branchId: branch.data.id,
    type: "savings_deposit",
    channel: "cash",
    amount: 30000,
    narration: `UAT reversible deposit ${runId}`
  }, saccoToken);
  const postedReversible = await api("PATCH", `/financial-transactions/${reversible.data.id}/status`, { status: "posted" }, platformToken);
  evidence.created.reversalCandidate = pick(postedReversible.data, ["id", "reference", "type", "status", "amount"]);

  const loan = await api("POST", "/loans", {
    memberId: activeMember.data.id,
    product: "Development Loan",
    amount: 900000,
    repaymentMonths: 10,
    purpose: `UAT working capital ${runId}`
  }, saccoToken);
  evidence.created.loan = pick(loan.data, ["id", "memberId", "product", "amount", "status", "stage"]);

  const guarantor = await api("POST", `/loans/${loan.data.id}/guarantors`, {
    memberId: "member_green_amina",
    guaranteedAmount: 250000
  }, saccoToken);
  evidence.created.guarantorRequest = pick(guarantor.data, ["id", "loanId", "memberId", "status", "guaranteedAmount"]);

  const memberToken = (await api("POST", "/member-auth/login", {
    identifier: activeMember.data.membershipNo,
    password: memberPassword
  })).data.token;

  const mobileLoan = await api("POST", "/member-auth/mobile-loans", {
    product: "Emergency Loan",
    amount: 250000,
    repaymentMonths: 6,
    purpose: `UAT member portal loan ${runId}`
  }, memberToken);
  const complaint = await api("POST", "/member-auth/mobile-complaints", {
    subject: `UAT offline draft ${runId}`,
    category: "service",
    priority: "medium",
    description: "Created by the UAT setup script to verify member draft sync."
  }, memberToken);
  evidence.created.memberPortal = {
    mobileLoan: pick(mobileLoan.data, ["id", "product", "amount", "status", "channel"]),
    syncedComplaint: pick(complaint.data, ["id", "subject", "status", "channel"])
  };

  const subscriptions = await api("GET", "/subscriptions", null, platformToken);
  const greenSubscription = subscriptions.data.find((subscription) => subscription.tenantId === "tenant_green");
  if (greenSubscription) {
    evidence.created.subscriptionForReview = pick(greenSubscription, ["id", "tenantId", "status", "memberCount", "billableMembers", "amount", "paid", "balance"]);
  }

  const operations = await api("GET", "/operations/status?tenantId=tenant_green", null, platformToken);
  evidence.created.operationsSnapshot = {
    scope: operations.data.scope,
    checkedAt: operations.data.checkedAt,
    counts: operations.data.counts,
    alerts: operations.data.alerts
  };

  console.log(JSON.stringify(evidence, null, 2));
  console.log(`\nUAT data setup completed against ${baseUrl}`);
} catch (error) {
  console.error(`UAT data setup failed against ${baseUrl}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

async function waitForApi() {
  const started = Date.now();
  const timeoutMs = Number(process.env.UAT_SETUP_WAIT_MS || 60000);
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

function pick(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value?.[key]]));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
