import { describe, expect, it } from "vitest";
import { formatTableValue } from "./formatters";

const region = { currency: "UGX", currencyDigits: 0, direction: "ltr" as const, locale: "en-UG" };

describe("formatTableValue", () => {
  it("turns internal workflow values into readable labels", () => {
    expect(formatTableValue({ status: "pending_review" }, "status", region)).toContain("Pending review");
    expect(formatTableValue({ operatingAccess: "pending_review" }, "operatingAccess", region)).toBe("Pending review");
  });
});
