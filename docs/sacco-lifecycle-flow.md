# SACCO Lifecycle: From Registration to Members Depositing

This is the end-to-end flow for onboarding a SACCO on Tereka Online and getting to the point where members can save money. It names the actors, the system steps behind each stage, and the control gates that must pass before money can move.

## Actors

- **Platform Super Admin** — Tereka staff. Registers/approves SACCOs, manages subscriptions and platform settings.
- **SACCO Administrator / Chairperson** — the SACCO's own top staff. Sets up officials, members, products.
- **Treasurer** — records and approves money in/out (the "checker" on deposits).
- **Secretary** — member records, governance, welfare.
- **Member** — the saver/borrower. Can self-serve via the member portal.

Every step is tenant-isolated (one SACCO can never see another's data) and every money action uses `BigDecimal`, immutable posted transactions, and maker≠checker approval.

---

## Stage 1 — SACCO Registration

Two entry points create the SACCO tenant:

1. **Platform-created** — Platform Admin fills the "Register SACCO inside platform" form (`POST /api/v1/tenants`).
2. **Self-registration** — the SACCO applies itself; the Platform Admin reviews it on the Self-registration approval path.

On creation the system automatically provisions, in one transaction:

- the **tenant** with a generated 4-letter SACCO code (e.g. `GREE`) and status `pending_review`;
- a **Main Branch** (`ensureMainBranch`);
- the **SACCO Administrator role** (`ensureAdministratorRole`);
- the **SACCO profile** (legal name, registration no., contacts);
- an **initial subscription** (billing package);
- the **built-in fund types** — savings, shares, welfare;
- *(demo/testing only)* **three starter members**, so officials can be assigned immediately.

## Stage 2 — Subscription & Payment

The SACCO gets a **one-month setup/testing trial** so it can be configured before paying. Billing is member-based (per-member pricing or a fixed tier).

- **Paid** → subscription marked active; the SACCO can operate fully once approved.
- **Unpaid** → trial continues; data entry stops when the trial ends until the subscription is paid.

The Platform Admin also sets the **allowed collection mode** for the SACCO — `NONE`, `MOBILE_MONEY_ONLY`, `BANK_ONLY`, or `BOTH` — which later governs how members are allowed to deposit.

## Stage 3 — Officials (activation gate)

Before the SACCO can be activated, its governance must be in place. The SACCO Admin, from **SACCO officials** on the SACCO detail:

1. ensures at least **3 members** exist (see Stage 4 — in practice officials are assigned from registered members);
2. assigns exactly one **Chairperson**, one **Secretary**, and one **Treasurer** (one member per office);
3. optionally clicks **Grant staff access** to give each official a staff login with their office role.

**Gate:** setting a SACCO to `active` is rejected with `409 SACCO_OFFICIALS_REQUIRED` until all three offices are filled. This guarantees no SACCO operates without proper governance.

## Stage 4 — Members

The Chairperson/SACCO Admin registers members (`POST /api/v1/members`):

- each gets a unique **membership number** (`<CODE>-0001`, `-0002`, …);
- members are **trusted on entry** (entered by SACCO staff), so KYC is recorded as verified — there is no separate approval step;
- each member is attached to a **branch** and given a **mandatory membership subscription** (dues);
- credentials for the member portal can be sent by **SMS or email**.

Members can also be **imported in bulk** from a spreadsheet.

## Stage 5 — Activation

With payment sorted and officials assigned, the Platform Admin sets the SACCO status to **active**. Operating access opens: staff can transact and members can deposit. (Expired/unpaid subscriptions drop the SACCO to read-only.)

---

## Stage 6 — Members Depositing

A member can save into **savings, shares, or welfare**. There are two channels, both of which enforce the same access checks and post through the same immutable ledger.

### Access checks (both channels)
Every deposit first passes `memberDepositAccessCheck`:
- the SACCO's **subscription/operating access** must be active (not expired/read-only, within paid member capacity);
- the requested method must be within the SACCO's **allowed collection mode** — otherwise `403 COLLECTION_METHOD_NOT_ALLOWED`.

### A. Cash / bank deposit (staff-recorded)
1. A **Teller/Treasurer** records the deposit against the member and fund.
2. It is created as **pending** and must be approved by a **second officer** (maker≠checker) — the person who records it cannot also approve it.
3. On approval it is **posted**: an immutable `financial_transaction` (amount in `BigDecimal`, unique reference), which updates the member's **savings/shares/welfare balance** and the **per-fund ledger** (`member_fund_balances`), and writes an **audit** entry.

### B. Mobile money deposit (member self-service)
1. The member initiates a deposit from the **member portal** (mobile money). No PIN is ever collected or stored.
2. The provider sends a **callback**; the system verifies the signature and matches it to the SACCO's **collection account** by network during reconciliation.
3. The incoming payment is recorded as **pending treasurer approval** — it does not credit the member until a treasurer confirms it (guards against duplicate/unmatched callbacks).
4. On approval it posts exactly like a cash deposit above: immutable transaction + balance update + per-fund ledger + audit.

### Corrections
Posted transactions are **never edited or deleted**. A mistake is fixed with a **reversal transaction** that points at the original, preserving a full audit trail.

---

## The flow at a glance

```
Register SACCO ──▶ Provision (branch, admin role, funds, subscription)
      │
      ▼
Trial / Payment ──▶ Platform sets allowed collection mode
      │
      ▼
Add ≥3 Members ──▶ Assign Chairperson + Secretary + Treasurer   ◀── activation gate
      │                         (Grant staff access → office logins)
      ▼
Platform sets SACCO = ACTIVE
      │
      ▼
Member deposits (cash via staff, or mobile money self-service)
      │   • access + collection-mode check
      │   • pending → approved (maker ≠ checker / treasurer)
      ▼
Posted: immutable BigDecimal transaction → savings/shares/welfare balance
        + per-fund ledger + audit   (corrections via reversal only)
```

## Key guarantees along the way

- **Tenant isolation** — SACCOs never share members, funds, or transactions.
- **Governance before money** — activation is blocked until the three officials are assigned.
- **Maker ≠ checker** — deposits are recorded by one person and approved by another.
- **Immutable money** — posted transactions are never deleted; only reversed.
- **No stored PINs** — mobile money never collects or stores customer PINs.
- **Auditability** — every registration, approval, deposit, and reversal is recorded in the audit log.
