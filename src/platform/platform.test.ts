import { describe, expect, it } from "vitest";
import { calculateRenewalScenario } from "./platform";

describe("calculateRenewalScenario", () => {
  it("combines renewal probability and price adjustment", () => {
    expect(calculateRenewalScenario(100, 10_000_000, 80, 5)).toEqual({
      expectedOrganizations: 80,
      expectedValue: 8_400_000,
      downsideValue: 2_100_000,
    });
  });

  it("clamps renewal rates and prevents negative contract value", () => {
    expect(calculateRenewalScenario(10, 1_000_000, 150, -200)).toEqual({
      expectedOrganizations: 10,
      expectedValue: 0,
      downsideValue: 0,
    });
  });
});
