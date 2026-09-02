// DEMO_ONLY_LEGACY_NODE_STORE
// Production data and business rules live in backend-java/PostgreSQL. This in-memory store supports
// local/demo fallback only and must not be treated as the production source of truth.
import { hashPassword, hashToken, newId } from "./security.mjs";

const now = () => new Date().toISOString();
export const SUBSCRIPTION_UNIT_PRICE = 5000;
export const MINIMUM_BILLABLE_MEMBERS = 20;
export const SUBSCRIPTION_BILLING_TIERS = [
  { id: "per_member", label: "20-250 members", minMembers: 20, maxMembers: 250, unitPrice: SUBSCRIPTION_UNIT_PRICE, amount: null },
  { id: "starter_fixed", label: "251-500 members", minMembers: 251, maxMembers: 500, unitPrice: null, amount: 1200000 },
  { id: "growth_fixed", label: "501-1,000 members", minMembers: 501, maxMembers: 1000, unitPrice: null, amount: 2500000 },
  { id: "scale_fixed", label: "1,001-2,500 members", minMembers: 1001, maxMembers: 2500, unitPrice: null, amount: 5000000 },
  { id: "enterprise_fixed", label: "2,501-5,000 members", minMembers: 2501, maxMembers: 5000, unitPrice: null, amount: 8000000 },
  { id: "enterprise_plus_fixed", label: "5,001-10,000 members", minMembers: 5001, maxMembers: 10000, unitPrice: null, amount: 12000000 }
];

export function calculateSubscriptionBilling(memberCount) {
  const safeMemberCount = Math.max(0, Number(memberCount) || 0);
  const tier = SUBSCRIPTION_BILLING_TIERS.find((item) => safeMemberCount <= item.maxMembers) || SUBSCRIPTION_BILLING_TIERS.at(-1);
  const billableMembers = tier.id === "per_member" ? Math.max(safeMemberCount, MINIMUM_BILLABLE_MEMBERS) : tier.maxMembers;
  const amount = tier.id === "per_member" ? billableMembers * SUBSCRIPTION_UNIT_PRICE : tier.amount;
  return {
    memberCount: safeMemberCount,
    billableMembers,
    unitPrice: tier.unitPrice,
    amount,
    tierId: tier.id,
    tierLabel: tier.label,
    billingDescription: tier.id === "per_member"
      ? `UGX 5,000 per member, minimum ${MINIMUM_BILLABLE_MEMBERS}`
      : `Fixed annual tier for ${tier.label}`
  };
}

const platformPassword = hashPassword("Admin@12345");
const saccoPassword = hashPassword("Sacco@12345");
const memberPassword = hashPassword("Member@12345");
const platformOperationsPassword = hashPassword("Operations@12345");
const platformBillingPassword = hashPassword("Billing@12345");
const platformCompliancePassword = hashPassword("Compliance@12345");
const platformSupportPassword = hashPassword("Support@12345");
const treasurerPassword = hashPassword("Treasurer@12345");
const secretaryPassword = hashPassword("Secretary@12345");
const chairPassword = hashPassword("Chair@12345");
const accountantPassword = hashPassword("Accountant@12345");
const tellerPassword = hashPassword("Teller@12345");
const auditorPassword = hashPassword("Auditor@12345");
const loansPassword = hashPassword("Loans@12345");

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
      abbreviation: "GREE",
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
      abbreviation: "LAKE",
      status: "pending_review",
      registrationNo: "COOP-UG-8112",
      district: "Jinja",
      licenseExpiry: "2026-08-15",
      packageId: "starter",
      onboardingPercent: 42,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "tenant_kigezi",
      name: "Kabale Traders SACCO",
      abbreviation: "KABA",
      status: "suspended",
      registrationNo: "COOP-UG-9031",
      district: "Kabale",
      licenseExpiry: "2026-10-30",
      packageId: "starter",
      onboardingPercent: 66,
      createdAt: "2026-01-12T08:00:00.000Z",
      updatedAt: "2026-01-12T08:00:00.000Z"
    },
    {
      id: "tenant_masaka",
      name: "Masaka Market SACCO",
      abbreviation: "MASA",
      status: "approved",
      registrationNo: "COOP-UG-9044",
      district: "Masaka",
      licenseExpiry: "2026-09-30",
      packageId: "starter",
      onboardingPercent: 81,
      createdAt: "2026-02-18T08:00:00.000Z",
      updatedAt: "2026-02-18T08:00:00.000Z"
    },
    {
      id: "tenant_gulu",
      name: "Gulu Teachers SACCO",
      abbreviation: "GULU",
      status: "approved",
      registrationNo: "COOP-UG-9052",
      district: "Gulu",
      licenseExpiry: "2026-11-30",
      packageId: "growth",
      onboardingPercent: 74,
      createdAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T08:00:00.000Z"
    },
    {
      id: "tenant_mbale",
      name: "Mbale Women SACCO",
      abbreviation: "MBAL",
      status: "approved",
      registrationNo: "COOP-UG-9066",
      district: "Mbale",
      licenseExpiry: "2026-12-31",
      packageId: "growth",
      onboardingPercent: 88,
      createdAt: "2026-04-09T08:00:00.000Z",
      updatedAt: "2026-04-09T08:00:00.000Z"
    },
    {
      id: "tenant_hoima",
      name: "Hoima Oil Workers SACCO",
      abbreviation: "HOIM",
      status: "approved",
      registrationNo: "COOP-UG-9075",
      district: "Hoima",
      licenseExpiry: "2027-05-31",
      packageId: "enterprise",
      onboardingPercent: 93,
      createdAt: "2026-05-16T08:00:00.000Z",
      updatedAt: "2026-05-16T08:00:00.000Z"
    }
  ],
  saccoProfiles: [
    {
      id: "profile_platform",
      tenantId: "tenant_platform",
      legalName: "Platform Administration",
      tin: "",
      umraLicenseNo: "",
      cooperativeRegistrationNo: "PLATFORM-001",
      address: "Kampala",
      email: "support@multisacco.local",
      phone: "+256700000001",
      website: "https://multisacco.local",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "profile_green",
      tenantId: "tenant_green",
      legalName: "Green Valley SACCO Limited",
      tin: "1001234567",
      umraLicenseNo: "UMRA-GREE-2026",
      cooperativeRegistrationNo: "COOP-UG-2389",
      address: "Mukono Main Road",
      email: "info@greenvalley.local",
      phone: "+256701234000",
      website: "https://greenvalley.local",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "profile_lake",
      tenantId: "tenant_lake",
      legalName: "Lake Farmers SACCO Limited",
      tin: "1007654321",
      umraLicenseNo: "",
      cooperativeRegistrationNo: "COOP-UG-8112",
      address: "Jinja Main Road",
      email: "info@lakefarmers.local",
      phone: "+256704111000",
      website: "",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "profile_kigezi",
      tenantId: "tenant_kigezi",
      legalName: "Kabale Traders SACCO Limited",
      tin: "1009001001",
      umraLicenseNo: "UMRA-KABA-2026",
      cooperativeRegistrationNo: "COOP-UG-9031",
      address: "Kabale Main Street",
      email: "info@kabaletraders.local",
      phone: "+256704222001",
      website: "",
      createdAt: "2026-01-12T08:00:00.000Z",
      updatedAt: "2026-01-12T08:00:00.000Z"
    },
    {
      id: "profile_masaka",
      tenantId: "tenant_masaka",
      legalName: "Masaka Market SACCO Limited",
      tin: "1009001002",
      umraLicenseNo: "UMRA-MASA-2026",
      cooperativeRegistrationNo: "COOP-UG-9044",
      address: "Masaka Central Market",
      email: "info@masakamarket.local",
      phone: "+256704222002",
      website: "",
      createdAt: "2026-02-18T08:00:00.000Z",
      updatedAt: "2026-02-18T08:00:00.000Z"
    },
    {
      id: "profile_gulu",
      tenantId: "tenant_gulu",
      legalName: "Gulu Teachers SACCO Limited",
      tin: "1009001003",
      umraLicenseNo: "UMRA-GULU-2026",
      cooperativeRegistrationNo: "COOP-UG-9052",
      address: "Gulu Education Centre",
      email: "info@guluteachers.local",
      phone: "+256704222003",
      website: "",
      createdAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T08:00:00.000Z"
    },
    {
      id: "profile_mbale",
      tenantId: "tenant_mbale",
      legalName: "Mbale Women SACCO Limited",
      tin: "1009001004",
      umraLicenseNo: "UMRA-MBAL-2026",
      cooperativeRegistrationNo: "COOP-UG-9066",
      address: "Republic Street, Mbale",
      email: "info@mbalewomen.local",
      phone: "+256704222004",
      website: "",
      createdAt: "2026-04-09T08:00:00.000Z",
      updatedAt: "2026-04-09T08:00:00.000Z"
    },
    {
      id: "profile_hoima",
      tenantId: "tenant_hoima",
      legalName: "Hoima Oil Workers SACCO Limited",
      tin: "1009001005",
      umraLicenseNo: "UMRA-HOIM-2026",
      cooperativeRegistrationNo: "COOP-UG-9075",
      address: "Hoima Industrial Road",
      email: "info@hoimaworkers.local",
      phone: "+256704222005",
      website: "",
      createdAt: "2026-05-16T08:00:00.000Z",
      updatedAt: "2026-05-16T08:00:00.000Z"
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
    },
    {
      id: "user_platform_operations",
      tenantId: "tenant_platform",
      fullName: "Platform Operations Officer",
      email: "operations@platform.local",
      phone: "+256700000006",
      passwordHash: platformOperationsPassword.hash,
      passwordSalt: platformOperationsPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_platform_billing",
      tenantId: "tenant_platform",
      fullName: "Platform Billing Officer",
      email: "billing@platform.local",
      phone: "+256700000007",
      passwordHash: platformBillingPassword.hash,
      passwordSalt: platformBillingPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_platform_compliance",
      tenantId: "tenant_platform",
      fullName: "Platform Compliance Officer",
      email: "compliance@platform.local",
      phone: "+256700000008",
      passwordHash: platformCompliancePassword.hash,
      passwordSalt: platformCompliancePassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_platform_support",
      tenantId: "tenant_platform",
      fullName: "Platform Support Officer",
      email: "support@platform.local",
      phone: "+256700000009",
      passwordHash: platformSupportPassword.hash,
      passwordSalt: platformSupportPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_treasurer",
      tenantId: "tenant_green",
      fullName: "Green Valley Treasurer",
      email: "treasurer@greenvalley.local",
      phone: "+256700000003",
      passwordHash: treasurerPassword.hash,
      passwordSalt: treasurerPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_secretary",
      tenantId: "tenant_green",
      fullName: "Green Valley Secretary",
      email: "secretary@greenvalley.local",
      phone: "+256700000004",
      passwordHash: secretaryPassword.hash,
      passwordSalt: secretaryPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_chairperson",
      tenantId: "tenant_green",
      fullName: "Green Valley Chairperson",
      email: "chairperson@greenvalley.local",
      phone: "+256700000005",
      passwordHash: chairPassword.hash,
      passwordSalt: chairPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_accountant",
      tenantId: "tenant_green",
      fullName: "Green Valley Accountant",
      email: "accountant@greenvalley.local",
      phone: "+256700000010",
      passwordHash: accountantPassword.hash,
      passwordSalt: accountantPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_teller",
      tenantId: "tenant_green",
      fullName: "Green Valley Teller",
      email: "teller@greenvalley.local",
      phone: "+256700000011",
      passwordHash: tellerPassword.hash,
      passwordSalt: tellerPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_auditor",
      tenantId: "tenant_green",
      fullName: "Green Valley Auditor",
      email: "auditor@greenvalley.local",
      phone: "+256700000012",
      passwordHash: auditorPassword.hash,
      passwordSalt: auditorPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_loans",
      tenantId: "tenant_green",
      fullName: "Green Valley Loans Officer",
      email: "loans@greenvalley.local",
      phone: "+256700000013",
      passwordHash: loansPassword.hash,
      passwordSalt: loansPassword.salt,
      status: "active",
      createdAt: now()
    }
  ],
  roles: [
    { id: "role_platform_admin", tenantId: "tenant_platform", name: "Super Administrator", protected: true },
    { id: "role_platform_operations_officer", tenantId: "tenant_platform", name: "Platform Operations Officer", protected: true },
    { id: "role_platform_billing_officer", tenantId: "tenant_platform", name: "Platform Billing Officer", protected: true },
    { id: "role_platform_compliance_officer", tenantId: "tenant_platform", name: "Platform Compliance Officer", protected: true },
    { id: "role_platform_support_officer", tenantId: "tenant_platform", name: "Platform Support Officer", protected: true },
    { id: "role_green_admin", tenantId: "tenant_green", name: "SACCO Administrator", protected: true, createdByUserId: "user_platform_admin" },
    { id: "role_green_treasurer", tenantId: "tenant_green", name: "Treasurer", protected: true, createdByUserId: "user_green_admin" },
    { id: "role_green_secretary", tenantId: "tenant_green", name: "Secretary", protected: true, createdByUserId: "user_green_admin" },
    { id: "role_green_chairperson", tenantId: "tenant_green", name: "Chairperson", protected: true, createdByUserId: "user_green_admin" },
    { id: "role_green_accountant", tenantId: "tenant_green", name: "Accountant", protected: true, createdByUserId: "user_green_admin" },
    { id: "role_green_teller", tenantId: "tenant_green", name: "Teller / Cashier", protected: true, createdByUserId: "user_green_admin" },
    { id: "role_green_auditor", tenantId: "tenant_green", name: "Auditor", protected: true, createdByUserId: "user_green_admin" },
    { id: "role_green_loans_officer", tenantId: "tenant_green", name: "Loans Officer", protected: true, createdByUserId: "user_green_admin" }
  ],
  permissions: [
    { id: "tenants:view", module: "Tenant Management", action: "view", description: "View tenants" },
    { id: "tenants:approve", module: "Tenant Management", action: "approve", description: "Approve or update tenant status" },
    { id: "tenants:manage", module: "Tenant Management", action: "manage", description: "Manage SACCO accounts" },
    { id: "dashboard:view", module: "Dashboard", action: "view", description: "View role dashboard" },
    { id: "users:create", module: "Identity", action: "create", description: "Create users" },
    { id: "users:view", module: "Identity", action: "view", description: "View users" },
    { id: "roles:view", module: "Identity", action: "view", description: "View roles" },
    { id: "roles:create", module: "Identity", action: "create", description: "Create roles" },
    { id: "members:view", module: "Member Management", action: "view", description: "View members" },
    { id: "members:create", module: "Member Management", action: "create", description: "Create members" },
    { id: "members:approve", module: "Member Management", action: "approve", description: "Approve members" },
    { id: "transactions:view", module: "Finance", action: "view", description: "View transactions" },
    { id: "transactions:create", module: "Finance", action: "create", description: "Create transactions" },
    { id: "transactions:approve", module: "Finance", action: "approve", description: "Post or reverse transactions" },
    { id: "loans:view", module: "Credit", action: "view", description: "View loans" },
    { id: "loans:create", module: "Credit", action: "create", description: "Create loan applications" },
    { id: "loans:approve", module: "Credit", action: "approve", description: "Approve loans" },
    { id: "loans:disburse", module: "Credit", action: "disburse", description: "Disburse loans" },
    { id: "expenses:view", module: "Accounting", action: "view", description: "View expenses" },
    { id: "expenses:create", module: "Accounting", action: "create", description: "Create expenses" },
    { id: "assets:view", module: "Accounting", action: "view", description: "View assets" },
    { id: "assets:create", module: "Accounting", action: "create", description: "Create assets" },
    { id: "subscriptions:view", module: "Subscriptions", action: "view", description: "View subscriptions" },
    { id: "subscriptions:pay", module: "Subscriptions", action: "pay", description: "Record subscription payments" },
    { id: "subscriptions:manage", module: "Subscriptions", action: "manage", description: "Manage subscription packages and billing" },
    { id: "accounting:view", module: "Accounting", action: "view", description: "View accounting" },
    { id: "accounting:post", module: "Accounting", action: "post", description: "Post accounting entries" },
    { id: "approvals:view", module: "Approvals", action: "view", description: "View approval records" },
    { id: "approvals:decide", module: "Approvals", action: "decide", description: "Record decisions" },
    { id: "operations:view", module: "Operations", action: "view", description: "View operations status" },
    { id: "notifications:view", module: "Notifications", action: "view", description: "View notifications" },
    { id: "notifications:manage", module: "Notifications", action: "manage", description: "Manage notifications" },
    { id: "governance:view", module: "Governance", action: "view", description: "View governance records" },
    { id: "governance:create", module: "Governance", action: "create", description: "Create governance records" },
    { id: "governance:manage", module: "Governance", action: "manage", description: "Manage governance records" },
    { id: "complaints:view", module: "Complaints", action: "view", description: "View complaints" },
    { id: "complaints:update", module: "Complaints", action: "update", description: "Update complaints" },
    { id: "complaints:manage", module: "Complaints", action: "manage", description: "Manage complaints" },
    { id: "reports:view", module: "Reports", action: "view", description: "View reports" },
    { id: "audit:view", module: "Audit", action: "view", description: "View audit events" }
  ],
  userRoles: [
    { tenantId: "tenant_platform", userId: "user_platform_admin", roleId: "role_platform_admin" },
    { tenantId: "tenant_platform", userId: "user_platform_operations", roleId: "role_platform_operations_officer" },
    { tenantId: "tenant_platform", userId: "user_platform_billing", roleId: "role_platform_billing_officer" },
    { tenantId: "tenant_platform", userId: "user_platform_compliance", roleId: "role_platform_compliance_officer" },
    { tenantId: "tenant_platform", userId: "user_platform_support", roleId: "role_platform_support_officer" },
    { tenantId: "tenant_green", userId: "user_green_admin", roleId: "role_green_admin" },
    { tenantId: "tenant_green", userId: "user_green_treasurer", roleId: "role_green_treasurer" },
    { tenantId: "tenant_green", userId: "user_green_secretary", roleId: "role_green_secretary" },
    { tenantId: "tenant_green", userId: "user_green_chairperson", roleId: "role_green_chairperson" },
    { tenantId: "tenant_green", userId: "user_green_accountant", roleId: "role_green_accountant" },
    { tenantId: "tenant_green", userId: "user_green_teller", roleId: "role_green_teller" },
    { tenantId: "tenant_green", userId: "user_green_auditor", roleId: "role_green_auditor" },
    { tenantId: "tenant_green", userId: "user_green_loans", roleId: "role_green_loans_officer" }
  ],
  rolePermissions: [
    { roleId: "role_platform_admin", permissionId: "dashboard:view" },
    { roleId: "role_platform_admin", permissionId: "tenants:view" },
    { roleId: "role_platform_admin", permissionId: "tenants:approve" },
    { roleId: "role_platform_admin", permissionId: "tenants:manage" },
    { roleId: "role_platform_admin", permissionId: "users:create" },
    { roleId: "role_platform_admin", permissionId: "users:view" },
    { roleId: "role_platform_admin", permissionId: "roles:create" },
    { roleId: "role_platform_admin", permissionId: "roles:view" },
    { roleId: "role_platform_admin", permissionId: "subscriptions:view" },
    { roleId: "role_platform_admin", permissionId: "subscriptions:manage" },
    { roleId: "role_platform_admin", permissionId: "reports:view" },
    { roleId: "role_platform_admin", permissionId: "complaints:view" },
    { roleId: "role_platform_admin", permissionId: "complaints:manage" },
    { roleId: "role_platform_admin", permissionId: "notifications:view" },
    { roleId: "role_platform_admin", permissionId: "notifications:manage" },
    { roleId: "role_platform_operations_officer", permissionId: "dashboard:view" },
    { roleId: "role_platform_operations_officer", permissionId: "tenants:view" },
    { roleId: "role_platform_operations_officer", permissionId: "reports:view" },
    { roleId: "role_platform_operations_officer", permissionId: "operations:view" },
    { roleId: "role_platform_operations_officer", permissionId: "complaints:view" },
    { roleId: "role_platform_operations_officer", permissionId: "notifications:view" },
    { roleId: "role_platform_billing_officer", permissionId: "dashboard:view" },
    { roleId: "role_platform_billing_officer", permissionId: "tenants:view" },
    { roleId: "role_platform_billing_officer", permissionId: "subscriptions:view" },
    { roleId: "role_platform_billing_officer", permissionId: "subscriptions:manage" },
    { roleId: "role_platform_billing_officer", permissionId: "reports:view" },
    { roleId: "role_platform_compliance_officer", permissionId: "dashboard:view" },
    { roleId: "role_platform_compliance_officer", permissionId: "tenants:view" },
    { roleId: "role_platform_compliance_officer", permissionId: "transactions:view" },
    { roleId: "role_platform_compliance_officer", permissionId: "accounting:view" },
    { roleId: "role_platform_compliance_officer", permissionId: "reports:view" },
    { roleId: "role_platform_compliance_officer", permissionId: "audit:view" },
    { roleId: "role_platform_support_officer", permissionId: "dashboard:view" },
    { roleId: "role_platform_support_officer", permissionId: "tenants:view" },
    { roleId: "role_platform_support_officer", permissionId: "reports:view" },
    { roleId: "role_platform_support_officer", permissionId: "complaints:view" },
    { roleId: "role_platform_support_officer", permissionId: "complaints:manage" },
    { roleId: "role_platform_support_officer", permissionId: "notifications:view" },
    { roleId: "role_green_admin", permissionId: "dashboard:view" },
    { roleId: "role_green_admin", permissionId: "members:view" },
    { roleId: "role_green_admin", permissionId: "members:create" },
    { roleId: "role_green_admin", permissionId: "members:approve" },
    { roleId: "role_green_admin", permissionId: "transactions:view" },
    { roleId: "role_green_admin", permissionId: "transactions:create" },
    { roleId: "role_green_admin", permissionId: "transactions:approve" },
    { roleId: "role_green_admin", permissionId: "subscriptions:view" },
    { roleId: "role_green_admin", permissionId: "loans:view" },
    { roleId: "role_green_admin", permissionId: "loans:create" },
    { roleId: "role_green_admin", permissionId: "loans:approve" },
    { roleId: "role_green_admin", permissionId: "accounting:view" },
    { roleId: "role_green_admin", permissionId: "reports:view" },
    { roleId: "role_green_admin", permissionId: "governance:view" },
    { roleId: "role_green_admin", permissionId: "governance:manage" },
    { roleId: "role_green_admin", permissionId: "complaints:view" },
    { roleId: "role_green_admin", permissionId: "complaints:manage" },
    { roleId: "role_green_treasurer", permissionId: "dashboard:view" },
    { roleId: "role_green_treasurer", permissionId: "members:view" },
    { roleId: "role_green_treasurer", permissionId: "transactions:view" },
    { roleId: "role_green_treasurer", permissionId: "transactions:create" },
    { roleId: "role_green_treasurer", permissionId: "transactions:approve" },
    { roleId: "role_green_treasurer", permissionId: "loans:view" },
    { roleId: "role_green_treasurer", permissionId: "accounting:view" },
    { roleId: "role_green_treasurer", permissionId: "accounting:post" },
    { roleId: "role_green_treasurer", permissionId: "reports:view" },
    { roleId: "role_green_secretary", permissionId: "dashboard:view" },
    { roleId: "role_green_secretary", permissionId: "members:view" },
    { roleId: "role_green_secretary", permissionId: "members:create" },
    { roleId: "role_green_secretary", permissionId: "members:approve" },
    { roleId: "role_green_secretary", permissionId: "reports:view" },
    { roleId: "role_green_secretary", permissionId: "governance:view" },
    { roleId: "role_green_secretary", permissionId: "governance:manage" },
    { roleId: "role_green_secretary", permissionId: "complaints:view" },
    { roleId: "role_green_secretary", permissionId: "complaints:manage" },
    { roleId: "role_green_chairperson", permissionId: "dashboard:view" },
    { roleId: "role_green_chairperson", permissionId: "members:view" },
    { roleId: "role_green_chairperson", permissionId: "transactions:view" },
    { roleId: "role_green_chairperson", permissionId: "loans:view" },
    { roleId: "role_green_chairperson", permissionId: "loans:approve" },
    { roleId: "role_green_chairperson", permissionId: "reports:view" },
    { roleId: "role_green_chairperson", permissionId: "governance:view" },
    { roleId: "role_green_chairperson", permissionId: "complaints:view" },
    { roleId: "role_green_chairperson", permissionId: "notifications:view" },
    { roleId: "role_green_chairperson", permissionId: "subscriptions:view" },
    { roleId: "role_green_accountant", permissionId: "dashboard:view" },
    { roleId: "role_green_accountant", permissionId: "transactions:view" },
    { roleId: "role_green_accountant", permissionId: "transactions:create" },
    { roleId: "role_green_accountant", permissionId: "accounting:view" },
    { roleId: "role_green_accountant", permissionId: "accounting:post" },
    { roleId: "role_green_accountant", permissionId: "reports:view" },
    { roleId: "role_green_teller", permissionId: "dashboard:view" },
    { roleId: "role_green_teller", permissionId: "members:view" },
    { roleId: "role_green_teller", permissionId: "transactions:view" },
    { roleId: "role_green_teller", permissionId: "transactions:create" },
    { roleId: "role_green_auditor", permissionId: "dashboard:view" },
    { roleId: "role_green_auditor", permissionId: "members:view" },
    { roleId: "role_green_auditor", permissionId: "transactions:view" },
    { roleId: "role_green_auditor", permissionId: "loans:view" },
    { roleId: "role_green_auditor", permissionId: "accounting:view" },
    { roleId: "role_green_auditor", permissionId: "reports:view" },
    { roleId: "role_green_loans_officer", permissionId: "loans:view" },
    { roleId: "role_green_loans_officer", permissionId: "loans:create" },
    { roleId: "role_green_loans_officer", permissionId: "loans:approve" },
    { roleId: "role_green_loans_officer", permissionId: "members:view" },
    { roleId: "role_green_loans_officer", permissionId: "reports:view" }
  ],
  approvalWorkflows: [
    {
      id: "workflow_green_loans",
      tenantId: "tenant_green",
      name: "Loan committee approval",
      module: "loans",
      active: true,
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "workflow_green_transactions",
      tenantId: "tenant_green",
      name: "Financial posting maker-checker",
      module: "transactions",
      active: true,
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "workflow_lake_members",
      tenantId: "tenant_lake",
      name: "Member onboarding approval",
      module: "members",
      active: true,
      createdByUserId: "user_platform_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  approvalDecisions: [
    {
      id: "approval_decision_green_loan_seed",
      tenantId: "tenant_green",
      workflowId: "workflow_green_loans",
      resourceType: "loan",
      resourceId: "loan_green_0001",
      decision: "approved",
      decidedByUserId: "user_green_admin",
      reason: "",
      createdAt: now()
    }
  ],
  chartOfAccounts: [
    { code: "1000", name: "Cash on Hand", type: "asset", normalBalance: "debit" },
    { code: "1010", name: "Bank Account", type: "asset", normalBalance: "debit" },
    { code: "1020", name: "Mobile Money Wallet", type: "asset", normalBalance: "debit" },
    { code: "1030", name: "Payroll Clearing", type: "asset", normalBalance: "debit" },
    { code: "1100", name: "Loans Receivable", type: "asset", normalBalance: "debit" },
    { code: "1300", name: "Fixed Assets", type: "asset", normalBalance: "debit" },
    { code: "1310", name: "Accumulated Depreciation", type: "asset", normalBalance: "credit" },
    { code: "2000", name: "Member Savings", type: "liability", normalBalance: "credit" },
    { code: "2100", name: "Member Share Capital", type: "equity", normalBalance: "credit" },
    { code: "2200", name: "Welfare Fund", type: "liability", normalBalance: "credit" },
    { code: "5000", name: "Operations Expense", type: "expense", normalBalance: "debit" },
    { code: "5010", name: "Rent Expense", type: "expense", normalBalance: "debit" },
    { code: "5020", name: "Utilities Expense", type: "expense", normalBalance: "debit" },
    { code: "5030", name: "Staff Expense", type: "expense", normalBalance: "debit" },
    { code: "5040", name: "Technology Expense", type: "expense", normalBalance: "debit" },
    { code: "5050", name: "Depreciation Expense", type: "expense", normalBalance: "debit" },
    { code: "6100", name: "Platform Subscription Expense", type: "expense", normalBalance: "debit" }
  ],
  accountingPeriods: [
    {
      id: "period_green_2026_06",
      tenantId: "tenant_green",
      period: "2026-06",
      status: "closed",
      closedByUserId: "user_green_admin",
      closedAt: "2026-07-01T08:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "period_green_2026_07",
      tenantId: "tenant_green",
      period: "2026-07",
      status: "open",
      closedByUserId: null,
      closedAt: null,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "period_lake_2026_07",
      tenantId: "tenant_lake",
      period: "2026-07",
      status: "open",
      closedByUserId: null,
      closedAt: null,
      createdAt: now(),
      updatedAt: now()
    }
  ],
  subscriptionPackages: [
    {
      id: "starter",
      name: "Starter",
      price: 1200000,
      billingPeriod: "annual",
      members: 500,
      minMembers: MINIMUM_BILLABLE_MEMBERS,
      tierLabel: "251-500 members",
      users: 8,
      branches: 1,
      modules: "Members, savings, shares",
      status: "active"
    },
    {
      id: "growth",
      name: "Growth",
      price: 2500000,
      billingPeriod: "annual",
      members: 1000,
      minMembers: 501,
      tierLabel: "501-1,000 members",
      users: 25,
      branches: 5,
      modules: "Core finance, loans, approvals, reports",
      status: "active"
    },
    {
      id: "scale",
      name: "Scale",
      price: 5000000,
      billingPeriod: "annual",
      members: 2500,
      minMembers: 1001,
      tierLabel: "1,001-2,500 members",
      users: 50,
      branches: 10,
      modules: "Multi-branch SACCO operations, reporting and governance",
      status: "active"
    },
    {
      id: "enterprise_5000",
      name: "Enterprise 5,000",
      price: 8000000,
      billingPeriod: "annual",
      members: 5000,
      minMembers: 2501,
      tierLabel: "2,501-5,000 members",
      users: 75,
      branches: 20,
      modules: "Enterprise support, integrations and audit controls",
      status: "active"
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 12000000,
      billingPeriod: "annual",
      members: 10000,
      minMembers: 5001,
      tierLabel: "5,001-10,000 members",
      users: 100,
      branches: 25,
      modules: "All modules, API, advanced support",
      status: "active"
    }
  ],
  subscriptions: [
    {
      id: "subscription_green_growth",
      tenantId: "tenant_green",
      packageId: "growth",
      status: "active",
      invoice: "INV-2026-001",
      memberCount: 3,
      billableMembers: MINIMUM_BILLABLE_MEMBERS,
      unitPrice: SUBSCRIPTION_UNIT_PRICE,
      tierId: "per_member",
      tierLabel: "20-250 members",
      billingDescription: "UGX 5,000 per member, minimum 20",
      amount: 100000,
      paid: 100000,
      smsCreditsAllocated: 2500,
      smsCreditsUsed: 64,
      smsCreditBalance: 2436,
      expiry: "2027-07-14",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "subscription_lake_starter",
      tenantId: "tenant_lake",
      packageId: "starter",
      status: "pending_payment",
      invoice: "INV-2026-002",
      memberCount: 1,
      billableMembers: MINIMUM_BILLABLE_MEMBERS,
      unitPrice: SUBSCRIPTION_UNIT_PRICE,
      tierId: "per_member",
      tierLabel: "20-250 members",
      billingDescription: "UGX 5,000 per member, minimum 20",
      amount: 100000,
      paid: 0,
      smsCreditsAllocated: 1000,
      smsCreditsUsed: 18,
      smsCreditBalance: 982,
      expiry: "2026-07-30",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "subscription_kigezi_starter",
      tenantId: "tenant_kigezi",
      packageId: "starter",
      status: "expired",
      invoice: "INV-2026-003",
      memberCount: 138,
      billableMembers: 138,
      unitPrice: SUBSCRIPTION_UNIT_PRICE,
      tierId: "per_member",
      tierLabel: "20-250 members",
      billingDescription: "UGX 5,000 per member, minimum 20",
      amount: 690000,
      paid: 690000,
      smsCreditsAllocated: 800,
      smsCreditsUsed: 792,
      smsCreditBalance: 8,
      expiry: "2026-06-30",
      createdAt: "2026-01-12T08:00:00.000Z",
      updatedAt: "2026-01-12T08:00:00.000Z"
    },
    {
      id: "subscription_masaka_starter",
      tenantId: "tenant_masaka",
      packageId: "starter",
      status: "active",
      invoice: "INV-2026-004",
      memberCount: 210,
      billableMembers: 210,
      unitPrice: SUBSCRIPTION_UNIT_PRICE,
      tierId: "per_member",
      tierLabel: "20-250 members",
      billingDescription: "UGX 5,000 per member, minimum 20",
      amount: 1050000,
      paid: 1050000,
      smsCreditsAllocated: 1200,
      smsCreditsUsed: 1040,
      smsCreditBalance: 160,
      expiry: "2026-08-31",
      createdAt: "2026-02-18T08:00:00.000Z",
      updatedAt: "2026-02-18T08:00:00.000Z"
    },
    {
      id: "subscription_gulu_growth",
      tenantId: "tenant_gulu",
      packageId: "growth",
      status: "active",
      invoice: "INV-2026-005",
      memberCount: 680,
      billableMembers: 1000,
      unitPrice: null,
      tierId: "growth_fixed",
      tierLabel: "501-1,000 members",
      billingDescription: "Fixed annual tier for 501-1,000 members",
      amount: 2500000,
      paid: 2500000,
      smsCreditsAllocated: 2000,
      smsCreditsUsed: 1435,
      smsCreditBalance: 565,
      expiry: "2026-09-20",
      createdAt: "2026-03-21T08:00:00.000Z",
      updatedAt: "2026-03-21T08:00:00.000Z"
    },
    {
      id: "subscription_mbale_growth",
      tenantId: "tenant_mbale",
      packageId: "growth",
      status: "active",
      invoice: "INV-2026-006",
      memberCount: 920,
      billableMembers: 1000,
      unitPrice: null,
      tierId: "growth_fixed",
      tierLabel: "501-1,000 members",
      billingDescription: "Fixed annual tier for 501-1,000 members",
      amount: 2500000,
      paid: 2500000,
      smsCreditsAllocated: 2200,
      smsCreditsUsed: 980,
      smsCreditBalance: 1220,
      expiry: "2026-11-15",
      createdAt: "2026-04-09T08:00:00.000Z",
      updatedAt: "2026-04-09T08:00:00.000Z"
    },
    {
      id: "subscription_hoima_enterprise",
      tenantId: "tenant_hoima",
      packageId: "enterprise",
      status: "active",
      invoice: "INV-2026-007",
      memberCount: 4200,
      billableMembers: 5000,
      unitPrice: null,
      tierId: "enterprise_fixed",
      tierLabel: "2,501-5,000 members",
      billingDescription: "Fixed annual tier for 2,501-5,000 members",
      amount: 8000000,
      paid: 8000000,
      smsCreditsAllocated: 5000,
      smsCreditsUsed: 1210,
      smsCreditBalance: 3790,
      expiry: "2027-04-30",
      createdAt: "2026-05-16T08:00:00.000Z",
      updatedAt: "2026-05-16T08:00:00.000Z"
    }
  ],
  subscriptionPayments: [],
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
      membershipNo: "GREE-0001",
      fullName: "Amina Nakitende",
      memberType: "individual",
      phone: "+256701234567",
      email: "amina@example.local",
      nationalId: "CM9000012K4PA",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
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
      membershipNo: "GREE-0002",
      fullName: "Daniel Ssekajja",
      memberType: "individual",
      phone: "+256772222118",
      email: "daniel@example.local",
      nationalId: "CM9000455K8AB",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "pending_verification",
      joiningDate: "2024-08-03",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_sarah",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      membershipNo: "GREE-0003",
      fullName: "Sarah Namuli",
      memberType: "individual",
      phone: "+256700000101",
      email: "sarah@example.local",
      nationalId: "CM9000003K3AA",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2024-05-10",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_grace",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      membershipNo: "GREE-0005",
      fullName: "Grace Achieng",
      memberType: "individual",
      phone: "+256700000103",
      email: "grace@example.local",
      nationalId: "CM9000005K3AC",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2024-07-01",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_esther",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      membershipNo: "GREE-0007",
      fullName: "Esther Nabirye",
      memberType: "individual",
      phone: "+256700000105",
      email: "esther@example.local",
      nationalId: "CM9000007K3AE",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2024-09-05",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_rose",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      membershipNo: "GREE-0009",
      fullName: "Rose Namugga",
      memberType: "individual",
      phone: "+256700000107",
      email: "rose.namugga@example.local",
      nationalId: "CM9000009K3AG",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2025-01-16",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_paul",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      membershipNo: "GREE-0010",
      fullName: "Paul Kiggundu",
      memberType: "individual",
      phone: "+256700000108",
      email: "paul.kiggundu@example.local",
      nationalId: "CM9000010K3AH",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2025-02-03",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_harriet",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      membershipNo: "GREE-0011",
      fullName: "Harriet Mbabazi",
      memberType: "individual",
      phone: "+256700000109",
      email: "harriet.mbabazi@example.local",
      nationalId: "CM9000011K3AJ",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2025-02-24",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_joseph",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      membershipNo: "GREE-0012",
      fullName: "Joseph Lutaaya",
      memberType: "individual",
      phone: "+256700000110",
      email: "joseph.lutaaya@example.local",
      nationalId: "CM9000012K3AK",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2025-03-11",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_lake_peter",
      tenantId: "tenant_lake",
      branchId: "branch_lake_main",
      membershipNo: "LAKE-0001",
      fullName: "Peter Ocen",
      memberType: "individual",
      phone: "+256704111889",
      email: "peter@example.local",
      nationalId: "CM8800142K2RE",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
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
  memberNextOfKin: [
    {
      id: "kin_amina_mary",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      fullName: "Mary Nakitende",
      relationship: "mother",
      phone: "+256703333444",
      address: "Kireka",
      primaryContact: true,
      createdByUserId: "user_green_admin",
      createdAt: now()
    }
  ],
  memberBeneficiaries: [
    {
      id: "beneficiary_amina_eva",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      fullName: "Eva Nakato",
      relationship: "daughter",
      phone: "+256704444555",
      allocationPercent: 60,
      createdByUserId: "user_green_admin",
      createdAt: now()
    }
  ],
  financialProducts: [
    {
      id: "product_green_savings_ordinary",
      tenantId: "tenant_green",
      productType: "savings",
      code: "GREE-SAV-ORD",
      name: "Ordinary Savings",
      contributionAmount: 0,
      minimumBalance: 10000,
      interestRate: 2.5,
      status: "active",
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "product_green_shares_standard",
      tenantId: "tenant_green",
      productType: "shares",
      code: "GREE-SHR-STD",
      name: "Member Shares",
      contributionAmount: 50000,
      minimumBalance: 0,
      interestRate: 0,
      status: "active",
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "product_green_welfare_family",
      tenantId: "tenant_green",
      productType: "welfare",
      code: "GREE-WEL-FAM",
      name: "Family Welfare Fund",
      contributionAmount: 10000,
      minimumBalance: 0,
      interestRate: 0,
      status: "active",
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  financialAccounts: [
    {
      id: "account_green_amina_savings",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      productId: "product_green_savings_ordinary",
      accountType: "savings",
      accountNo: "GREE-SAV-0001",
      status: "active",
      openedByUserId: "user_green_admin",
      openedAt: now(),
      updatedAt: now()
    },
    {
      id: "account_green_amina_welfare",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      productId: "product_green_welfare_family",
      accountType: "welfare",
      accountNo: "GREE-WEL-0001",
      status: "active",
      openedByUserId: "user_green_admin",
      openedAt: now(),
      updatedAt: now()
    },
    {
      id: "account_green_daniel_shares",
      tenantId: "tenant_green",
      memberId: "member_green_daniel",
      productId: "product_green_shares_standard",
      accountType: "shares",
      accountNo: "GREE-SHR-0001",
      status: "active",
      openedByUserId: "user_green_admin",
      openedAt: now(),
      updatedAt: now()
    }
  ],
  financialTransactions: [
    {
      id: "txn_green_0001",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_amina",
      type: "savings_deposit",
      channel: "mobile_money",
      amount: 250000,
      status: "posted",
      reference: "GREE-TX-0001",
      narration: "Mobile money savings deposit",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-07-14T09:15:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_0002",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      memberId: "member_green_daniel",
      type: "share_purchase",
      channel: "cash",
      amount: 100000,
      status: "posted",
      reference: "GREE-TX-0002",
      narration: "Share capital purchase",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-07-14T11:20:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_0003",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_amina",
      type: "welfare_contribution",
      channel: "bank",
      amount: 60000,
      status: "pending_approval",
      reference: "GREE-TX-0003",
      narration: "Welfare contribution awaiting approval",
      makerUserId: "user_green_admin",
      checkerUserId: null,
      postedAt: null,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_0004",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_amina",
      type: "welfare_contribution",
      channel: "cash",
      amount: 100000,
      status: "posted",
      reference: "GREE-TX-0004",
      narration: "Seeded welfare contribution",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-07-14T12:10:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_seed_1003",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_sarah",
      type: "savings_deposit",
      channel: "cash",
      amount: 480000,
      status: "posted",
      reference: "GREE-TX-1003",
      narration: "Opening savings",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-01-09T09:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_seed_1005",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_grace",
      type: "savings_deposit",
      channel: "bank",
      amount: 1350000,
      status: "posted",
      reference: "GREE-TX-1005",
      narration: "Opening savings",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-01-09T09:20:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_seed_1007",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_esther",
      type: "savings_deposit",
      channel: "bank",
      amount: 720000,
      status: "posted",
      reference: "GREE-TX-1007",
      narration: "Opening savings",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-01-09T09:40:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_seed_2001",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_rose",
      type: "savings_deposit",
      channel: "cash",
      amount: 180000,
      status: "posted",
      reference: "GREE-TX-2001",
      narration: "Opening savings for loan guarantee demo",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-01-10T09:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_seed_2004",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      memberId: "member_green_paul",
      type: "savings_deposit",
      channel: "bank",
      amount: 250000,
      status: "posted",
      reference: "GREE-TX-2004",
      narration: "Opening savings for loan review demo",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-01-11T09:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_seed_2007",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_harriet",
      type: "savings_deposit",
      channel: "bank",
      amount: 1800000,
      status: "posted",
      reference: "GREE-TX-2007",
      narration: "Opening savings for self-secured loan",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-01-12T09:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_seed_2010",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      memberId: "member_green_joseph",
      type: "savings_deposit",
      channel: "cash",
      amount: 95000,
      status: "posted",
      reference: "GREE-TX-2010",
      narration: "Opening savings",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-01-13T09:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  welfareClaims: [
    {
      id: "welfare_claim_green_0001",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      claimType: "medical",
      amount: 50000,
      channel: null,
      reference: "GREE-WCL-0001",
      description: "Medical support reimbursement",
      status: "approved",
      submittedByUserId: "user_green_admin",
      decidedByUserId: "user_green_admin",
      paidByUserId: null,
      rejectionReason: null,
      submittedAt: "2026-07-02T09:00:00.000Z",
      decidedAt: "2026-07-02T10:00:00.000Z",
      paidAt: null,
      updatedAt: "2026-07-02T10:00:00.000Z"
    }
  ],
  loans: [
    {
      id: "loan_green_0001",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      product: "Development Loan",
      amount: 3000000,
      balance: 2150000,
      status: "active",
      stage: "Disbursed",
      guarantors: 2,
      dsr: 31,
      repaymentMonths: 12,
      purpose: "Business expansion",
      disbursedByUserId: "user_green_admin",
      disbursedAt: "2026-07-10T10:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "loan_green_0002",
      tenantId: "tenant_green",
      memberId: "member_green_daniel",
      product: "Emergency Loan",
      amount: 800000,
      balance: 800000,
      status: "under_review",
      stage: "Credit Appraisal",
      guarantors: 1,
      dsr: 44,
      repaymentMonths: 6,
      purpose: "Medical emergency",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "loan_green_0003",
      tenantId: "tenant_green",
      memberId: "member_green_rose",
      product: "Development Loan",
      amount: 1500000,
      balance: 1470000,
      interestRate: 1.5,
      interestAmount: 270000,
      totalPayable: 1770000,
      monthlyInstallment: 147500,
      status: "active",
      stage: "Disbursed",
      guarantors: 2,
      dsr: 65,
      repaymentMonths: 12,
      purpose: "Retail shop stock purchase",
      disbursedByUserId: "user_green_admin",
      disbursedAt: "2026-02-01T10:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "loan_green_0004",
      tenantId: "tenant_green",
      memberId: "member_green_paul",
      product: "Agriculture Loan",
      amount: 2000000,
      balance: 2250000,
      interestRate: 1.25,
      interestAmount: 250000,
      totalPayable: 2250000,
      monthlyInstallment: 225000,
      status: "submitted",
      stage: "Guarantor Review",
      guarantors: 0,
      dsr: 65,
      repaymentMonths: 10,
      purpose: "Irrigation pump and seedlings",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "loan_green_0005",
      tenantId: "tenant_green",
      memberId: "member_green_harriet",
      product: "School Fees Loan",
      amount: 1200000,
      balance: 1296000,
      interestRate: 1,
      interestAmount: 96000,
      totalPayable: 1296000,
      monthlyInstallment: 162000,
      status: "active",
      stage: "Disbursed",
      guarantors: 0,
      dsr: 23,
      repaymentMonths: 8,
      purpose: "School fees self-secured loan",
      securedHoldAmount: 1296000,
      disbursedByUserId: "user_green_admin",
      disbursedAt: "2026-03-01T10:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "loan_lake_0001",
      tenantId: "tenant_lake",
      memberId: "member_lake_peter",
      product: "Agriculture Loan",
      amount: 1500000,
      balance: 0,
      status: "submitted",
      stage: "Guarantor Review",
      guarantors: 0,
      dsr: 27,
      repaymentMonths: 10,
      purpose: "Farm inputs",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  loanGuarantors: [
    {
      id: "guarantor_green_0001",
      tenantId: "tenant_green",
      loanId: "loan_green_0002",
      memberId: "member_green_amina",
      guaranteedAmount: 400000,
      status: "pending",
      requestedByUserId: "user_green_admin",
      decidedAt: null,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "guarantor_green_0002",
      tenantId: "tenant_green",
      loanId: "loan_green_0003",
      memberId: "member_green_grace",
      guaranteedAmount: 1500000,
      status: "accepted",
      requestedByUserId: "user_green_admin",
      decidedAt: "2026-02-01T09:40:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "guarantor_green_0003",
      tenantId: "tenant_green",
      loanId: "loan_green_0003",
      memberId: "member_green_esther",
      guaranteedAmount: 1500000,
      status: "accepted",
      requestedByUserId: "user_green_admin",
      decidedAt: "2026-02-01T09:45:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "guarantor_green_0004",
      tenantId: "tenant_green",
      loanId: "loan_green_0004",
      memberId: "member_green_sarah",
      guaranteedAmount: 2000000,
      status: "pending",
      requestedByUserId: "user_green_admin",
      decidedAt: null,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "guarantor_green_0005",
      tenantId: "tenant_green",
      loanId: "loan_green_0004",
      memberId: "member_green_daniel",
      guaranteedAmount: 2000000,
      status: "pending",
      requestedByUserId: "user_green_admin",
      decidedAt: null,
      createdAt: now(),
      updatedAt: now()
    }
  ],
  loanRepaymentSchedules: [],
  loanRepayments: [
    {
      id: "loan_repayment_green_0001",
      tenantId: "tenant_green",
      loanId: "loan_green_0001",
      memberId: "member_green_amina",
      amount: 850000,
      channel: "mobile_money",
      externalReference: "LRP-GREE-0001",
      receivedAt: "2026-07-14T12:30:00.000Z",
      recordedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  mobileMoneyCallbacks: [],
  mobileMoneyPaymentRequests: [],
  notificationTemplates: [
    {
      id: "template_payment_received",
      tenantId: null,
      channel: "in_app",
      eventType: "payment_received",
      title: "Payment received",
      body: "Your SACCO payment has been received and posted.",
      status: "active",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "template_loan_repayment_received",
      tenantId: null,
      channel: "in_app",
      eventType: "loan_repayment_received",
      title: "Loan repayment received",
      body: "Your loan repayment has been received and posted.",
      status: "active",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "template_loan_application_submitted",
      tenantId: null,
      channel: "in_app",
      eventType: "loan_application_submitted",
      title: "Loan application submitted",
      body: "Your mobile loan application has been submitted for review.",
      status: "active",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "template_complaint_synced",
      tenantId: null,
      channel: "in_app",
      eventType: "complaint_synced",
      title: "Complaint synced",
      body: "Your offline complaint draft has been synced to the SACCO.",
      status: "active",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  notifications: [
    {
      id: "notification_green_0001",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      channel: "in_app",
      eventType: "payment_received",
      title: "Payment received",
      body: "Mobile money savings deposit GREE-TX-0001 for UGX 250000 was posted.",
      status: "unread",
      resourceType: "financial_transaction",
      resourceId: "txn_green_0001",
      createdAt: now(),
      readAt: null
    },
    {
      id: "notification_lake_0001",
      tenantId: "tenant_lake",
      memberId: "member_lake_peter",
      channel: "sms",
      eventType: "subscription_payment_reminder",
      title: "Subscription payment reminder",
      body: "Lake Farmers SACCO registration review is pending payment confirmation.",
      status: "unread",
      resourceType: "subscription",
      resourceId: "subscription_lake_starter",
      createdAt: now(),
      readAt: null
    }
  ],
  notificationDeliveries: [
    {
      id: "delivery_green_0001",
      tenantId: "tenant_green",
      notificationId: "notification_green_0001",
      memberId: "member_green_amina",
      channel: "sms",
      provider: "demo_sms",
      recipient: "+256701234567",
      status: "sent",
      message: "Mobile money savings deposit GREE-TX-0001 for UGX 250000 was posted.",
      sentAt: now(),
      createdAt: now()
    },
    {
      id: "delivery_green_0002",
      tenantId: "tenant_green",
      notificationId: "notification_green_0001",
      memberId: "member_green_amina",
      channel: "email",
      provider: "demo_email",
      recipient: "amina@example.local",
      status: "sent",
      message: "Mobile money savings deposit GREE-TX-0001 for UGX 250000 was posted.",
      sentAt: now(),
      createdAt: now()
    },
    {
      id: "delivery_lake_0001",
      tenantId: "tenant_lake",
      notificationId: "notification_lake_0001",
      memberId: "member_lake_peter",
      channel: "sms",
      provider: "demo_sms",
      recipient: "+256704111200",
      status: "sent",
      message: "Lake Farmers SACCO registration review is pending payment confirmation.",
      sentAt: now(),
      createdAt: now()
    },
    {
      id: "delivery_lake_0002",
      tenantId: "tenant_lake",
      notificationId: "notification_lake_0001",
      memberId: "member_lake_peter",
      channel: "sms",
      provider: "demo_sms",
      recipient: "+256704111200",
      status: "failed",
      message: "Subscription payment reminder could not be delivered.",
      sentAt: null,
      createdAt: now()
    }
  ],
  providerJobRuns: [
    {
      id: "job_run_mobile_money_reconciliation_seed",
      tenantId: "tenant_green",
      provider: "demo_mobile_money",
      jobType: "mobile_money_reconciliation",
      status: "completed",
      startedAt: now(),
      finishedAt: now(),
      summary: "Demo fallback reconciliation baseline"
    }
  ],
  statementLines: [
    {
      id: "statement_green_0001",
      tenantId: "tenant_green",
      accountCode: "1020",
      channel: "mobile_money",
      amount: 250000,
      externalReference: "GREE-TX-0001",
      description: "Mobile money savings collection",
      statementDate: "2026-07-14",
      importedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "statement_green_0002",
      tenantId: "tenant_green",
      accountCode: "1020",
      channel: "mobile_money",
      amount: 850000,
      externalReference: "LRP-GREE-0001",
      description: "Mobile money loan repayment",
      statementDate: "2026-07-14",
      importedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "statement_green_0003",
      tenantId: "tenant_green",
      accountCode: "1010",
      channel: "bank",
      amount: -25000,
      externalReference: "BANK-FEE-0001",
      description: "Unmatched bank charge awaiting allocation",
      statementDate: "2026-07-14",
      importedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  governanceMeetings: [
    {
      id: "meeting_green_0001",
      tenantId: "tenant_green",
      title: "Quarterly Credit Committee",
      meetingType: "credit_committee",
      scheduledAt: "2026-07-20T09:00:00.000Z",
      chairUserId: "user_green_admin",
      status: "scheduled",
      minutes: "Agenda includes loan portfolio quality, guarantor exposure, and repayment performance.",
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  governanceResolutions: [
    {
      id: "resolution_green_0001",
      tenantId: "tenant_green",
      meetingId: "meeting_green_0001",
      title: "Review high-risk emergency loan files",
      decision: "Credit officer to present guarantor status and repayment capacity before approval.",
      ownerUserId: "user_green_admin",
      dueDate: "2026-07-25",
      status: "open",
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  complaints: [
    {
      id: "complaint_green_0001",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      category: "statement",
      subject: "Statement balance clarification",
      description: "Member requested clarification on loan repayment reflection.",
      priority: "medium",
      status: "open",
      assignedUserId: "user_green_admin",
      resolution: "",
      createdByUserId: "user_green_admin",
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: now(),
      updatedAt: now()
    }
  ],
  suppliers: [
    {
      id: "supplier_green_0001",
      tenantId: "tenant_green",
      name: "Mukono Office Supplies",
      phone: "+256701990011",
      email: "accounts@mukono-office.example",
      taxId: "TIN-883001",
      status: "active",
      createdByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  expenses: [
    {
      id: "expense_green_0001",
      tenantId: "tenant_green",
      supplierId: "supplier_green_0001",
      accountCode: "5000",
      amount: 120000,
      channel: "bank",
      reference: "EXP-GREE-0001",
      description: "Office supplies for Mukono Main",
      expenseDate: "2026-07-12",
      status: "posted",
      recordedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  assets: [
    {
      id: "asset_green_0001",
      tenantId: "tenant_green",
      name: "Dell OptiPlex teller workstation",
      category: "equipment",
      assetAccountCode: "1300",
      cost: 2400000,
      salvageValue: 0,
      usefulLifeMonths: 36,
      purchaseDate: "2026-07-01",
      depreciationStartDate: "2026-07-01",
      channel: "bank",
      reference: "AST-GREE-0001",
      location: "Mukono Main",
      custodianUserId: "user_green_admin",
      status: "active",
      recordedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  sessions: [],
  memberSessions: [],
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

export function publicMember(member) {
  if (!member) return null;
  const { passwordHash, passwordSalt, ...safeMember } = member;
  const balances = memberBalances(member.id);
  return {
    ...safeMember,
    savingsBalance: balances.savings,
    sharesBalance: balances.shares,
    welfareBalance: balances.welfare
  };
}

export function publicTenant(tenant) {
  return tenant;
}

export function memberBalances(memberId) {
  const balances = { savings: 0, shares: 0, welfare: 0 };
  for (const transaction of db.financialTransactions) {
    if (transaction.memberId !== memberId || transaction.status !== "posted") continue;
    const direction = transaction.originalTransactionId ? -1 : 1;
    if (transaction.type === "savings_deposit") balances.savings += transaction.amount * direction;
    if (transaction.type === "withdrawal") balances.savings -= transaction.amount * direction;
    if (transaction.type === "share_purchase") balances.shares += transaction.amount * direction;
    if (transaction.type === "welfare_contribution") balances.welfare += transaction.amount * direction;
  }
  for (const claim of db.welfareClaims || []) {
    if (claim.memberId !== memberId || claim.status !== "paid") continue;
    balances.welfare -= claim.amount;
  }
  return balances;
}

export function guaranteeCapacity(memberId, excludeGuarantorId = null) {
  const balances = memberBalances(memberId);
  const committed = db.loanGuarantors
    .filter((item) => item.id !== excludeGuarantorId && item.memberId === memberId && ["pending", "accepted"].includes(item.status))
    .filter((item) => {
      const loan = db.loans.find((candidate) => candidate.id === item.loanId);
      return loan && loan.status !== "closed" && Number(loan.balance || loan.outstandingBalance || 0) > 0;
    })
    .reduce((sum, item) => sum + item.guaranteedAmount, 0);
  return Math.max(0, balances.savings * 3 - committed);
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

export function createMemberSession(member) {
  const token = `${newId("member_session")}.${cryptoRandomSuffix()}`;
  const session = {
    id: newId("member_session"),
    memberId: member.id,
    tenantId: member.tenantId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    createdAt: now()
  };
  db.memberSessions.push(session);
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

export function findMemberSessionByToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db.memberSessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  const member = db.members.find((item) => item.id === session.memberId && item.status === "active");
  return member ? { session, member } : null;
}

export function removeSession(token) {
  const tokenHash = hashToken(token);
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((item) => item.tokenHash !== tokenHash);
  return before !== db.sessions.length;
}

export function removeMemberSession(token) {
  const tokenHash = hashToken(token);
  const before = db.memberSessions.length;
  db.memberSessions = db.memberSessions.filter((item) => item.tokenHash !== tokenHash);
  return before !== db.memberSessions.length;
}

function cryptoRandomSuffix() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
