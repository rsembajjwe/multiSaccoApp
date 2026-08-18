# Roles, Fund Sources & Reporting — Conformance Review

**Date:** 2026-08-17
**Reference:** uploaded `roles.docx`
**Scope:** Does the implemented system match the roles, multi-role/maker-checker rules, fund-source model and reporting described in the document, and how "advanced" is the reporting UI?

## Verdict at a glance

The **role model is a strong match** — every SACCO and platform role in the document exists in the system with permission-based access, multi-role assignment is supported at the data layer, maker-checker is enforced, and the platform/SACCO tenant separation matches the document's "platform manages the service; each SACCO manages its own money" rule.

Two areas **do not yet match**: (1) **configurable fund sources** — the system hard-codes exactly three fund types (savings, shares, welfare) and cannot create custom funds like Burial/Education/Development; and (2) **financial-statement reporting** — trial balance and journals exist, but there is no Income Statement or Balance Sheet. The reporting **UI is functional but not "advanced"** in the data-visualization sense: it is table- and KPI-card-based with role-specific dashboards, but has almost no charts, trends or interactive analytics.

## 1. SACCO roles

| Document role | System role | Match | Notes |
|---|---|---|---|
| SACCO Administrator | `SACCO Administrator` | Full | Users/roles, branches, products, settings. Can create custom roles (`roles:create`). |
| Chairperson | `Chairperson` | Full | Oversight, approvals (`approvals:decide`), loan approval, reports, governance. |
| Treasurer | `Treasurer` | Full | Transactions, accounting post, reconciliation, reports. |
| Secretary | `Secretary` | Full | Members, records, reports. |
| Loans/Credit Officer | `Loans Officer` | Full | `loans:create`/`view` to assess and recommend. |
| Loan Committee | *(no distinct role)* | Partial | Covered functionally by `loans:approve` on Chairperson/approvers; the admin can create a "Loan Committee" custom role, but none is seeded. |
| Accountant | `Accountant` | Partial | Chart, journals, trial balance present; **Income Statement / Balance Sheet missing** (see §5). |
| Teller/Cashier | `Teller / Cashier` | Full | Counter deposits/withdrawals, receipts. |
| Auditor / Supervisory | `Auditor` | Full | Read-only across transactions, approvals, reports, audit trail. |
| Member | member portal | Full | Balances, MoMo deposits, loan applications, statements, receipts, notifications. |

## 2. Platform roles

| Document role | System role | Match |
|---|---|---|
| Super Administrator | `Platform Super Admin` (+ `Platform Administrator`) | Full |
| Operations Officer | `Platform Operations Officer` | Full |
| Billing Officer | `Platform Billing Officer` | Full |
| Compliance Officer | `Platform Compliance Officer` | Full |
| Support Officer | `Platform Support Officer` | Full |
| Technical/System Administrator | *(no distinct role)* | Partial — covered by Super Admin + operations tooling; no separate seeded role. |
| Platform Management / Analytics | platform dashboards | Partial — a platform dashboard exists; a dedicated analytics role/surface is not separated. |

## 3. Multi-role, maker-checker, tenant separation

Multi-role assignment **is supported**: `user_roles` is a many-to-many table (composite key `user_id + role_id`), so a staff user can hold several roles (e.g. Treasurer + Accountant). Maker-checker **is enforced** — the same user cannot both initiate and approve a sensitive transaction (409 `MAKER_CHECKER_REQUIRED`). Tenant/branch isolation is enforced in the service layer, and platform administrators do not gain SACCO money/approval authority — matching the document's fundamental rule.

**One structural gap:** members and staff are **separate identities** (a `members` table for the member portal vs a `users` table for staff roles), with no link between them. The document's example "Member + Treasurer + Accountant" implies one person holding member *and* officer roles under a single identity. Today such a person would need two separate accounts (one member login, one staff login). This is a design decision rather than a defect, but it does not literally match the "a member/officer can hold multiple roles" phrasing.

## 4. Fund sources — main functional gap

The document defines **fund sources** as member contribution funds: every SACCO starts with Savings, Shares and Welfare, and the **SACCO Administrator can create additional funds** (Burial, Education, Development, Emergency, or any SACCO-specific contribution), with **separate per-member balances per fund**.

The system today supports only a **fixed set of three fund types** — `PRODUCT_TYPES = {savings, shares, welfare}` is hard-coded and validated on create/update; anything else is rejected with `INVALID_PRODUCT_TYPE`. Consequences:

- The Administrator **cannot create custom funds** (Burial, Education, etc.).
- Members therefore cannot hold balances in SACCO-specific funds beyond the three built-in types.

Note a naming clash worth clarifying: a **"Sources of Funds" register** was recently added (capital origins — grants, borrowings, share capital as capital). That is a *different* concept from the document's contribution "fund sources" and does **not** satisfy this requirement. Meeting the document needs making the fund/product type **configurable** (a fund-type registry per SACCO) plus per-member balances for each configured fund.

## 5. Reporting

Present: role-specific **dashboards** for Admin, Chairperson, Treasurer, Accountant, Auditor, Loans Officer, Secretary and Teller; **Chart of Accounts, Journals, Trial Balance**; regulatory/exception reporting; member statements and receipts; audit trail; reconciliation (bank/MoMo) including the new per-SACCO account attribution.

Missing vs the document's Accountant scope:

- **Income Statement** (profit & loss / income & expenditure) — not implemented.
- **Balance Sheet** (statement of financial position) — not implemented.

These are the two named financial statements the Accountant role is expected to produce, so this is a real reporting gap.

## 6. "Advanced UI" assessment

The UI is clean, role-aware and consistent (KPI summary cards, tabbed modules, searchable/paginated tables, role-specific dashboards, maker-checker workflows). By the standard of **advanced reporting UI**, however, it is **basic**: there are essentially no data visualizations — a search of the frontend finds only a couple of CSS `bar-chart` helpers and a single inline SVG, no charting library, no trend lines, no drill-down analytics, no exportable pivot/aggregation views beyond flat tables. To read as "advanced," reporting would need charts (trends, distributions, portfolio aging), interactive filters/drill-downs, and richer visual dashboards.

## 7. Recommended priorities

1. **Configurable fund sources (highest business impact).** Replace the hard-coded three-type restriction with a per-SACCO fund-type registry the Administrator manages (seed Savings/Shares/Welfare as defaults, allow Burial/Education/Development/etc.), and give each member per-fund balances. This is the clearest divergence from the document.
2. **Financial statements.** Add Income Statement and Balance Sheet built from the existing chart of accounts and journals, exposed to Accountant/Treasurer/Chairperson.
3. **Advanced reporting UI.** Introduce charts and interactive dashboards (loan portfolio aging, arrears trend, savings growth, income vs expenditure) — the app's artifact/visualization capability can back these.
4. **Optional role fidelity.** Seed a distinct **Loan Committee** role (or document that it is created as a custom role), and decide whether to **link member and staff identities** so one person can hold member + officer roles under a single login.

## What already matches well

Roles and permissions, multi-role assignment, maker-checker, tenant/branch isolation, platform-vs-SACCO separation, member self-service (including MoMo deposits and statements), reconciliation, and audit trails all conform to the document. The gaps are concentrated in configurable funds, two financial statements, and reporting-UI richness.
