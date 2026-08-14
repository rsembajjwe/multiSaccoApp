import { describe, expect, it } from "vitest";
import {
  buildMemberDirectoryRows,
  buildMemberDirectorySummary,
  buildQuickSearchModel,
  buildQuickSearchResult,
  buildSaccoAccountHealthRows,
  buildSaccoAccountSummary,
  memberUnreadNotificationCount,
  pendingMemberKycRows,
  staffUnreadNotificationCount,
  uniqueNavigationValues,
} from "./navigation";

describe("navigation model", () => {
  it("builds SACCO account health rows and summary counts", () => {
    const subscriptions = [
      { id: "sub-1", tenantId: "tenant-active", status: "active", tierLabel: "Starter", expiry: "2026-12-31", billableMembers: 120 },
      { id: "sub-2", tenantId: "tenant-risk", status: "expired", packageName: "Growth", expiryDate: "2026-07-31", memberCount: 300 },
    ];
    const rows = buildSaccoAccountHealthRows({
      accountHealth: (tenant, subscription) => subscription?.status === "expired" ? "Billing risk" : "Healthy",
      approvalStage: (tenant) => tenant.status === "pending" ? "Awaiting approval" : "Approved",
      paymentStage: (tenant, subscription) => subscription ? "Paid" : "No payment",
      subscriptionForTenant: (tenantId) => subscriptions.find((subscription) => subscription.tenantId === tenantId),
      tenants: [
        { id: "tenant-active", name: "Green Valley", abbreviation: "GVS", status: "active", memberCount: 100 },
        { id: "tenant-risk", name: "Lake Farmers", code: "LF", status: "active", memberCount: 250 },
        { id: "tenant-suspended", name: "Town SACCO", status: "suspended", memberCount: { estimate: 50 } },
      ],
    });

    expect(rows[0]).toMatchObject({
      saccoCode: "GVS",
      accountHealth: "Healthy",
      packageName: "Starter",
      paymentStage: "Paid",
      action: "tenant-detail",
    });
    expect(rows[2]).toMatchObject({
      saccoCode: "tenant-suspended",
      subscriptionStatus: "No subscription",
      billableMembers: "[object Object]",
    });
    expect(buildSaccoAccountSummary(rows, subscriptions)).toEqual({
      activeAccounts: 2,
      expiringSoon: 1,
      suspendedAccounts: 1,
      withoutSubscription: 1,
    });
  });

  it("builds searchable grouped quick-search results with active selection safety", () => {
    const index = [
      buildQuickSearchResult("SACCOs", "gvs", "sacco-applications", "Green Valley SACCO", "GVS / Wakiso"),
      buildQuickSearchResult("Members", "m-1", "members", "Amina Nakutende", "GVS-0001"),
      buildQuickSearchResult("Members", "m-2", "members", "Brian Kato", "GVS-0002"),
    ];

    const model = buildQuickSearchModel({ activeId: "members:m-1", index, query: "gvs", limit: 10 });

    expect(model.results.map((row) => row.id)).toEqual(["sacco-applications:gvs", "members:m-1", "members:m-2"]);
    expect(model.activeId).toBe("members:m-1");
    expect(model.groups.map((group) => group.group)).toEqual(["SACCOs", "Members"]);

    expect(buildQuickSearchModel({ activeId: "missing", index, query: "amina" }).activeId).toBe("");
    expect(buildQuickSearchModel({ index, query: "a" }).results).toEqual([]);
  });

  it("summarizes member directory readiness and balances", () => {
    const members = buildMemberDirectoryRows({
      kycReadiness: (member) => member.kycStatus === "verified" ? "Complete" : "Pending documents",
      members: [
        { id: "m1", fullName: "Amina", status: "active", kycStatus: "verified", savingsBalance: 1000, sharesBalance: 2000, welfareBalance: 500 },
        { id: "m2", fullName: "Brian", status: "pending", kycStatus: "pending", savingsBalance: 3000, sharesBalance: 0, welfareBalance: 0 },
      ],
    });

    expect(members[0]).toMatchObject({ totalBalance: 3500, kycReadiness: "Complete", action: "member-detail" });
    expect(pendingMemberKycRows(members).map((member) => member.id)).toEqual(["m2"]);
    expect(buildMemberDirectorySummary(members)).toEqual({
      activeMembers: 1,
      pendingKyc: 1,
      portalReady: 1,
      registeredMembers: 2,
      totalBalances: 6500,
    });
  });

  it("keeps filter option and notification count helpers deterministic", () => {
    expect(uniqueNavigationValues([
      { id: "1", branch: "Central" },
      { id: "2", branch: "North" },
      { id: "3", branch: "Central" },
      { id: "4", branch: "" },
    ], "branch")).toEqual(["Central", "North"]);

    expect(memberUnreadNotificationCount([
      { id: "n1", status: "unread" },
      { id: "n2", status: "read" },
      { id: "n3", readAt: "2026-08-14T08:00:00Z" },
    ])).toBe(1);

    expect(staffUnreadNotificationCount([
      { id: "d1", notificationId: "n1" },
      { id: "d2", notificationId: "n1" },
      { id: "d3", notificationId: "n2", readAt: "2026-08-14T08:00:00Z" },
    ])).toBe(1);
  });
});
