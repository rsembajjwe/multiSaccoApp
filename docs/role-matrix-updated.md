# saccoApp — Corrected Role → Permission Matrix (post-hardening)

**Date:** 2026-08-26
**Supersedes:** the originally pasted role/function matrix, which predates this security pass.
**Applies to:** the SACCO (tenant) roles as seeded for the demo tenant. Real tenants create their own roles via the Users & Roles screen; this is the reference model those should follow.

This reflects the permission catalog **after migrations V109–V112**. Where a role's authority changed in this pass, it is marked **[changed]**.

---

## What changed in this pass (delta)

| Role | Added | Removed |
|------|-------|---------|
| **SACCO Administrator** | `audit:view`, `welfare:view/manage`, `member-subscription:view/manage`, `loans:disburse` | `savings-transfer:manage` (dead) |
| **Treasurer** | `members:view`, `savings-transfer:approve`, `loans:disburse`, `welfare:view`, `member-subscription:view/manage` | `savings-transfer:manage` (dead) |
| **Secretary** | `welfare:view/manage`, `member-subscription:view/manage`, `savings-transfer:approve`, `savings-transfer:view` | — |
| **Chairperson** | `fund-types:manage` | `members:create`, `members:approve`, `transactions:create`, `transactions:approve`, `accounting:post`, `savings-transfer:approve/manage/view`, `loans:disburse` |
| **Accountant** | `welfare:view` | — |
| **Auditor** | `audit:view` | — |
| **Teller / Cashier** | — | — |
| **Loans Officer** | — | — |

New permissions introduced: `audit:view`, `welfare:view`, `welfare:manage`, `member-subscription:view`, `member-subscription:manage`, `loans:disburse`. Removed: `savings-transfer:manage` (was never enforced).

---

## Key design decisions encoded here

- **Loan approval ≠ loan disbursement.** `loans:approve` decides a loan; the new `loans:disburse` releases the funds. Disbursement stays **two-officer dual control** — **Admin + Treasurer** are the two disbursing officers. The **Chairperson keeps loan *approval*** but can no longer disburse.
- **Savings-transfer approval** moved off the Chairperson to the **Treasurer** (the SACCO's choice) **+ Secretary**. The Secretary is the non-maker second signatory required by the two-distinct-approver **high-value** transfer flow (the Treasurer is the transfer *maker* and cannot approve their own transfer).
- **Welfare** is now its own permission. Claim lifecycle (submit/decide) = `welfare:manage` → **Admin + Secretary**. Viewing = `welfare:view` → Admin, Secretary, **Treasurer, Accountant** (so the officers who *disburse* welfare — payment still on `accounting:post` — can see the queue).
- **Audit logs** are now gated by `audit:view` → **Admin + Auditor** (SACCO side).
- **Member Subscriptions** now their own permission → **Admin + Treasurer + Secretary** (previously the Treasurer could see the menu but got no data).
- **Chairperson is read-only for member accounts.** The role keeps `members:view` and `transactions:view`, manages fund types/products, and cannot create or approve members or post/approve financial transactions. Treasurer remains the posting official among the three elected SACCO officials.

---

## Current SACCO role → permissions

### SACCO Administrator  *(protected; full operator)*
`audit:view` · `accounting:post/view` · `approvals:decide/view` · `complaints:manage/view` · `dashboard:view` · `finance-source:manage/view` · `fund-types:manage/view` · `governance:manage/view` · `loans:approve/create/view/`**`disburse`** · `member-subscription:view/manage` · `members:approve/create/view` · `notifications:manage/view` · `operations:view` · `reports:view` · `roles:create/view` · `sacco-profile:manage` · `savings-transfer:approve/create/view` · `subscriptions:view` · `tenants:manage/view` · `transactions:approve/create/view` · `users:create/view` · `welfare:view/manage`

### Treasurer  *(finance; transfer maker, disbursing officer)*  **[changed]**
`accounting:post/view` · `approvals:view` · `complaints:view` · `dashboard:view` · `finance-source:manage/view` · `fund-types:view` · `loans:disburse` · `member-subscription:view/manage` · `members:view` · `operations:view` · `reports:view` · `savings-transfer:approve/create/view` · `transactions:approve/create/view` · `welfare:view`

### Secretary  *(governance; welfare & member-subs manager, transfer co-approver)*  **[changed]**
`approvals:view` · `complaints:manage/view` · `dashboard:view` · `finance-source:view` · `fund-types:view` · `governance:manage/view` · `member-subscription:view/manage` · `members:approve/create/view` · `reports:view` · `savings-transfer:approve/view` · `welfare:view/manage`

### Chairperson  *(oversight + loan approval + settings)*  **[changed]**
`approvals:decide/view` · `complaints:view` · `dashboard:view` · `finance-source:manage/view` · `fund-types:manage/view` · `governance:view` · `loans:approve/view` · `members:view` · `notifications:view` · `operations:view` · `reports:view` · `sacco-profile:manage` · `subscriptions:view` · `transactions:view`
*Member accounts are read-only. No `members:create`, `members:approve`, `transactions:create`, `transactions:approve`, `accounting:post`, savings-transfer authority, or `loans:disburse`.*

Fund types and financial products use the same access boundary: the Chairperson manages them with `fund-types:manage`; Secretary, Treasurer, and other granted staff can only read them with `fund-types:view`.

### Accountant  *(finance postings)*  **[changed]**
`accounting:post/view` · `dashboard:view` · `fund-types:view` · `operations:view` · `reports:view` · `transactions:create/view` · `welfare:view`

### Auditor  *(read-only oversight)*  **[changed]**
`audit:view` · `accounting:view` · `approvals:view` · `dashboard:view` · `loans:view` · `members:view` · `operations:view` · `reports:view` · `transactions:view`

### Teller / Cashier  *(counter capture)*
`dashboard:view` · `members:view` · `transactions:create/view`

### Loans Officer  *(loan intake)*
`approvals:view` · `complaints:view` · `loans:create/view` · `members:view`

---

## Notes for real (non-demo) tenants

- These grants live in `role_permissions`; a tenant's SACCO Administrator assigns them to that tenant's own roles via Users & Roles. The permission **catalog** (the `permissions` table) is shared, so once V109–V112 have run, every tenant can grant the new permissions.
- Dual-control flows (loan disbursement; high-value savings transfers) require **at least two distinct users** holding the relevant permission. A tenant with a single admin user cannot complete them — ensure at least two staff hold `loans:disburse`, and that transfer approvers outnumber the maker.
- Welfare **payment/disbursement** remains on `accounting:post` (a financial posting), deliberately separate from `welfare:manage` (claim lifecycle) for segregation of duties.
