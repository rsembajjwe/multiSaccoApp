import { describe, expect, it } from "vitest";
import { buildCollectionAccountDisplayRows } from "./settings";
import type { TerekaCollectionAccount, TerekaRecord } from "../types/domain";

const labelize = (value: unknown): string => String(value ?? "").replace(/_/g, " ");

function account(overrides: Partial<TerekaCollectionAccount>): TerekaCollectionAccount & TerekaRecord {
  return { active: true, ...overrides } as TerekaCollectionAccount & TerekaRecord;
}

describe("collection account display rows", () => {
  it("titles a mobile-money account by its uppercased network", () => {
    const [row] = buildCollectionAccountDisplayRows(
      [account({ id: "a1", channel: "mobile_money", network: "mtn", accountName: "Green Valley", accountNumber: "0779123456" })],
      labelize,
    );
    expect(row.title).toBe("MTN");
    expect(row.channelLabel).toBe("mobile money");
    expect(row.detail).toBe("Green Valley / 0779123456");
    expect(row.active).toBe(true);
  });

  it("titles a bank account by its bank name and includes the branch in the detail", () => {
    const [row] = buildCollectionAccountDisplayRows(
      [account({ id: "b1", channel: "bank", bankName: "Stanbic", accountName: "Green Valley", accountNumber: "01234567890", branch: "Kampala", instructions: "Use membership no." })],
      labelize,
    );
    expect(row.title).toBe("Stanbic");
    expect(row.detail).toBe("Green Valley / 01234567890 / Kampala");
    expect(row.instructions).toBe("Use membership no.");
  });

  it("falls back to 'Mobile money' when a network is missing and preserves inactive status", () => {
    const [row] = buildCollectionAccountDisplayRows(
      [account({ id: "c1", channel: "mobile_money", accountName: "X", accountNumber: "1", active: false })],
      labelize,
    );
    expect(row.title).toBe("MOBILE MONEY");
    expect(row.active).toBe(false);
  });
});
