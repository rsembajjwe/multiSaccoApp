import { describe, expect, it } from "vitest";
import {
  buildRoleCoverageRows,
  buildRoleFunctionMatrixRows,
  roleFunctionRowsFor,
} from "./access";

describe("access role function matrix", () => {
  it("maps platform roles to function descriptions", () => {
    const rows = buildRoleFunctionMatrixRows([
      { id: "role_platform_super_admin", tenantId: "tenant_platform", name: "Platform Super Admin" },
      { id: "role_platform_billing_officer", tenantId: "tenant_platform", name: "Platform Billing Officer" },
      { id: "role_platform_support_officer", tenantId: "tenant_platform", name: "Platform Support Officer" },
    ], true);

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        roleName: "Platform Super Admin",
        status: "Mapped",
        functions: expect.stringContaining("System Settings"),
        descriptions: expect.stringContaining("Manage protected platform configuration"),
      }),
      expect.objectContaining({
        roleName: "Platform Billing Officer",
        functions: expect.stringContaining("Subscriptions"),
        descriptions: expect.stringContaining("subscription payments"),
      }),
      expect.objectContaining({
        roleName: "Platform Support Officer",
        functions: expect.stringContaining("Complaints"),
        descriptions: expect.stringContaining("support tickets"),
      }),
    ]));
  });

  it("maps SACCO roles and adds function counts to role coverage", () => {
    const roles = [
      { id: "role_green_admin", tenantId: "tenant_green", name: "SACCO Administrator" },
      { id: "role_green_chairperson", tenantId: "tenant_green", name: "Chairperson" },
      { id: "role_green_teller", tenantId: "tenant_green", name: "Teller / Cashier" },
    ];
    const coverage = buildRoleCoverageRows({
      platformOnly: false,
      roles,
      users: [
        { id: "user_green_admin", tenantId: "tenant_green", roleIds: ["role_green_admin"] },
        { id: "user_green_teller", tenantId: "tenant_green", roleIds: ["role_green_teller"] },
      ],
    });

    expect(roleFunctionRowsFor("Chairperson", false).map((row) => row.functionName)).toContain("Loan Approval");
    expect(coverage).toEqual(expect.arrayContaining([
      expect.objectContaining({ roleName: "SACCO Administrator", assignedUsers: 1, functionCount: expect.any(Number) }),
      expect.objectContaining({ roleName: "Chairperson", assignedUsers: 0, functionCount: expect.any(Number) }),
      expect.objectContaining({ roleName: "Teller / Cashier", assignedUsers: 1, functionCount: 4 }),
    ]));
    expect(coverage.find((row) => row.roleName === "SACCO Administrator")?.functionCount).toBeGreaterThan(5);
  });
});
