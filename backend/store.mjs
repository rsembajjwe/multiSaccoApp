import { hashPassword, hashToken, newId } from "./security.mjs";

const now = () => new Date().toISOString();

const platformPassword = hashPassword("Admin@12345");
const saccoPassword = hashPassword("Sacco@12345");

export const db = {
  tenants: [
    {
      id: "tenant_platform",
      name: "Platform Administration",
      abbreviation: "HQ",
      status: "active",
      registrationNo: "PLATFORM-001",
      district: "Kampala",
      licenseExpiry: "2027-06-30",
      packageId: "enterprise",
      onboardingPercent: 100,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "tenant_green",
      name: "Green Valley SACCO",
      abbreviation: "GVS",
      status: "approved",
      registrationNo: "COOP-UG-2389",
      district: "Mukono",
      licenseExpiry: "2026-12-31",
      packageId: "growth",
      onboardingPercent: 78,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "tenant_lake",
      name: "Lake Farmers SACCO",
      abbreviation: "LFS",
      status: "pending_review",
      registrationNo: "COOP-UG-8112",
      district: "Jinja",
      licenseExpiry: "2026-08-15",
      packageId: "starter",
      onboardingPercent: 42,
      createdAt: now(),
      updatedAt: now()
    }
  ],
  users: [
    {
      id: "user_platform_admin",
      tenantId: "tenant_platform",
      fullName: "Platform Administrator",
      email: "admin@platform.local",
      phone: "+256700000001",
      passwordHash: platformPassword.hash,
      passwordSalt: platformPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_admin",
      tenantId: "tenant_green",
      fullName: "Green Valley SACCO Admin",
      email: "admin@greenvalley.local",
      phone: "+256700000002",
      passwordHash: saccoPassword.hash,
      passwordSalt: saccoPassword.salt,
      status: "active",
      createdAt: now()
    }
  ],
  roles: [
    { id: "role_platform_admin", tenantId: "tenant_platform", name: "Super Administrator", protected: true },
    { id: "role_sacco_admin", tenantId: "tenant_green", name: "SACCO Administrator", protected: true }
  ],
  permissions: [
    { id: "tenants:view", module: "Tenant Management", action: "view", description: "View tenants" },
    { id: "tenants:approve", module: "Tenant Management", action: "approve", description: "Approve or update tenant status" },
    { id: "users:create", module: "Identity", action: "create", description: "Create users" },
    { id: "audit:view", module: "Audit", action: "view", description: "View audit events" }
  ],
  userRoles: [
    { tenantId: "tenant_platform", userId: "user_platform_admin", roleId: "role_platform_admin" },
    { tenantId: "tenant_green", userId: "user_green_admin", roleId: "role_sacco_admin" }
  ],
  branches: [
    {
      id: "branch_green_main",
      tenantId: "tenant_green",
      code: "GV001",
      name: "Mukono Main",
      address: "Mukono Central Division",
      managerUserId: "user_green_admin",
      status: "active",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "branch_green_seeta",
      tenantId: "tenant_green",
      code: "GV002",
      name: "Seeta Branch",
      address: "Seeta Trading Centre",
      managerUserId: null,
      status: "active",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "branch_lake_main",
      tenantId: "tenant_lake",
      code: "LF001",
      name: "Jinja Main",
      address: "Jinja Central",
      managerUserId: null,
      status: "active",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  members: [
    {
      id: "member_green_amina",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      membershipNo: "GVS-0001",
      fullName: "Amina Nakitende",
      memberType: "individual",
      phone: "+256701234567",
      email: "amina@example.local",
      nationalId: "CM9000012K4PA",
      status: "active",
      kycStatus: "verified",
      joiningDate: "2024-04-12",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_daniel",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      membershipNo: "GVS-0002",
      fullName: "Daniel Ssekajja",
      memberType: "individual",
      phone: "+256772222118",
      email: "daniel@example.local",
      nationalId: "CM9000455K8AB",
      status: "active",
      kycStatus: "pending_verification",
      joiningDate: "2024-08-03",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_lake_peter",
      tenantId: "tenant_lake",
      branchId: "branch_lake_main",
      membershipNo: "LFS-0001",
      fullName: "Peter Ocen",
      memberType: "individual",
      phone: "+256704111889",
      email: "peter@example.local",
      nationalId: "CM8800142K2RE",
      status: "applicant",
      kycStatus: "pending_verification",
      joiningDate: "2026-07-02",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  memberDocuments: [
    {
      id: "doc_amina_nin",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      documentType: "national_id",
      storageKey: "tenant_green/members/member_green_amina/national-id.pdf",
      verificationStatus: "verified",
      createdAt: now()
    }
  ],
  sessions: [],
  auditEvents: [
    {
      id: "audit_seed_1",
      tenantId: "tenant_platform",
      actorUserId: "user_platform_admin",
      actorName: "Platform Administrator",
      action: "Seeded development backend store",
      resourceType: "system",
      resourceId: "development-store",
      ipAddress: "127.0.0.1",
      createdAt: now()
    }
  ]
};

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

export function publicTenant(tenant) {
  return tenant;
}

export function createAuditEvent({ tenantId, actorUserId, actorName, action, resourceType = null, resourceId = null, ipAddress = null }) {
  const event = {
    id: newId("audit"),
    tenantId,
    actorUserId,
    actorName,
    action,
    resourceType,
    resourceId,
    ipAddress,
    createdAt: now()
  };
  db.auditEvents.unshift(event);
  return event;
}

export function createSession(user) {
  const token = `${newId("session")}.${cryptoRandomSuffix()}`;
  const session = {
    id: newId("session"),
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    createdAt: now()
  };
  db.sessions.push(session);
  return { token, session };
}

export function findSessionByToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db.sessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId && item.status === "active");
  return user ? { session, user } : null;
}

export function removeSession(token) {
  const tokenHash = hashToken(token);
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((item) => item.tokenHash !== tokenHash);
  return before !== db.sessions.length;
}

function cryptoRandomSuffix() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
