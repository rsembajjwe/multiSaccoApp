import { describe, expect, it } from "vitest";
import { buildCollectionAccountDisplayRows, buildMobileMoneyIntegrationSummary } from "./settings";
import type { TerekaCollectionAccount, TerekaProviderConfig, TerekaRecord } from "../types/domain";

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

describe("mobile money integration summary", () => {
  it("recognizes configured platform keys without exposing secret values", () => {
    const providers: Array<TerekaProviderConfig & TerekaRecord> = [
      {
        provider: "MTN MoMo",
        active: true,
        settings: [
          { key: "SACCO_MOBILE_MONEY_CALLBACK_SECRET", configured: true, secret: true },
          { key: "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS", configured: true, secret: false, value: "true" },
        ],
      },
      {
        provider: "Airtel Money",
        active: false,
        settings: [{ key: "SACCO_AIRTEL_MONEY_CLIENT_SECRET", configured: true, secret: true }],
      },
    ];

    expect(buildMobileMoneyIntegrationSummary({ providers, callbacks: [{ status: "failed" }], requests: [{ id: "p1" }] })).toEqual({
      activeProvider: "MTN MoMo",
      callbackSecret: "Configured",
      failedCallbacks: 1,
      paymentRequests: 1,
      providerCallbacks: 1,
      providerSelected: true,
      signedCallbacks: "Required",
    });
  });

  it("shows the stored demo provider instead of treating it as missing", () => {
    const providers: Array<TerekaProviderConfig & TerekaRecord> = [
      {
        provider: "MTN MoMo",
        active: false,
        settings: [
          { key: "SACCO_MOBILE_MONEY_PROVIDER", configured: true, secret: false, value: "demo_mobile_money" },
          { key: "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS", configured: true, secret: false, value: "false" },
        ],
      },
    ];

    expect(buildMobileMoneyIntegrationSummary({ providers, callbacks: [], requests: [] })).toMatchObject({
      activeProvider: "Demo / disabled",
      providerSelected: true,
      signedCallbacks: "Not required",
    });
  });
});
