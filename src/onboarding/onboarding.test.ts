import { describe, expect, it } from "vitest";
import { buildSubscriptionSummary, buildSubscriptionRows, subscriptionLifecycleStateFor } from "./onboarding";

describe("subscription lifecycle", () => {
  const now = new Date("2026-09-25T00:00:00Z");

  it("uses expiry dates to distinguish expired, expiring, and active subscriptions", () => {
    expect(subscriptionLifecycleStateFor({ status: "active", expiry: "2026-09-24" }, now)).toBe("expired");
    expect(subscriptionLifecycleStateFor({ status: "active", expiry: "2026-11-15" }, now)).toBe("expiring");
    expect(subscriptionLifecycleStateFor({ status: "active", expiry: "2027-09-25" }, now)).toBe("active");
  });

  it("does not count an expired active record as an active subscription", () => {
    const subscriptions = [
      { id: "expired", tenantId: "one", status: "active", expiry: "2020-01-01", amount: 100, paid: 100 },
      { id: "active", tenantId: "two", status: "active", expiry: "2999-01-01", amount: 100, paid: 100 },
    ];
    const tenants = [
      { id: "one", name: "Expired Group", status: "active" },
      { id: "two", name: "Active Group", status: "active" },
    ];
    expect(buildSubscriptionSummary(subscriptions, buildSubscriptionRows({ subscriptions, tenants })).activeSubscriptions).toBe(1);
  });
});
