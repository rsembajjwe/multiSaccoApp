# UAT Scripts

Use these scripts for staging acceptance testing before a hosted demo, pilot onboarding, or release candidate sign-off. Each script should be run against the Java backend with the staging database, not local browser-only demo data.

Record each result as `Pass`, `Fail`, or `Accepted with finding`. Failed items must include the defect link, owner, and retest date.

## Test Evidence

Capture this evidence for every UAT session:

| Field | Value |
| --- | --- |
| Environment URL |  |
| API base URL |  |
| Build or commit SHA |  |
| Tester name |  |
| Role tested |  |
| Test date |  |
| Browser/device |  |
| Demo logins enabled? |  |
| Result |  |
| Open findings |  |

## Platform Admin Script

Persona: platform operator responsible for onboarding SACCOs, billing, oversight, and release readiness.

| Step | Action | Expected result | Result |
| ---: | --- | --- | --- |
| 1 | Log in as a platform administrator. | Dashboard shows Java-backed source, tenant scope, session status, and last sync. |  |
| 2 | Open SACCO Registration. | Applications, approval states, licence watch, onboarding progress, and activation gates load from the backend. |  |
| 3 | Create or review a SACCO tenant application. | Tenant record is saved or displayed with audit-safe status, legal profile fields, and no cross-tenant leakage. |  |
| 4 | Approve or update SACCO tenant status. | Status change is accepted only for platform admin and appears in tenant details. |  |
| 5 | Open Subscriptions. | Packages, invoice totals, billable members, outstanding balances, and payment gates are visible. |  |
| 6 | Post a subscription payment with a unique external reference. | Payment is posted once, updates outstanding balance, and duplicate reference is rejected or treated idempotently. |  |
| 7 | Open Operations with platform scope. | Database status, alerts, pending postings, callback exceptions, delivery exceptions, and readiness indicators are visible. |  |
| 8 | Switch Operations to a tenant scope. | Counts and alerts are limited to the selected SACCO. |  |
| 9 | Open Reports with platform/consolidated access where available. | Regulatory and operational summaries render without backend errors. |  |
| 10 | Log out. | Session is revoked and protected screens require login again. |  |

Pass criteria:

- Platform admin can complete onboarding, subscription, operations, and reporting checks.
- SACCO-only actions remain tenant-scoped.
- Payment and status changes leave clear audit evidence.

## SACCO Staff Script

Persona: SACCO administrator or staff member responsible for daily member, finance, loan, and approval work.

| Step | Action | Expected result | Result |
| ---: | --- | --- | --- |
| 1 | Log in as SACCO staff. | Dashboard shows the SACCO tenant, Java-backed sync state, and no platform-wide data. |  |
| 2 | Open Members. | Member totals, balances, branch coverage, KYC/profile actions, and statement actions load from the backend. |  |
| 3 | Register or update a test member. | Member is saved under the current SACCO tenant with validation feedback for required fields. |  |
| 4 | Open the member statement. | Posted movements and running savings/share/welfare balances are visible. |  |
| 5 | Submit a savings/share/welfare transaction. | Transaction enters the expected approval or posted state based on workflow rules. |  |
| 6 | Approve, reject, or correct a pending transaction from Approvals. | Maker-checker rules are enforced and decision history is visible. |  |
| 7 | Reverse an eligible posted transaction. | Reversal references the original transaction and balance impact is visible in the statement. |  |
| 8 | Create or review a loan application. | Product, borrower, amount, term, DSR, guarantor, and lifecycle states are clear. |  |
| 9 | Request or review guarantors. | Guarantor status is visible and loan approval is blocked until required guarantors accept. |  |
| 10 | Disburse or repay an approved loan. | Outstanding balance, repayment totals, and journal/report impact update correctly. |  |
| 11 | Open Reports. | Ledger integrity, reconciliation, compliance, governance, accounting periods, and assets load from backend data. |  |
| 12 | Open Operations. | SACCO staff sees only their tenant status and operational alerts. |  |
| 13 | Log out. | Session is revoked and protected screens require login again. |  |

Pass criteria:

- Staff can operate members, transactions, approvals, loans, reports, and operations without platform access.
- Tenant isolation is visible in the UI and confirmed by attempted cross-tenant access where practical.
- Financial actions show clear pending, posted, rejected, reversed, or blocked states.

## Member Portal Script

Persona: SACCO member checking balances, loans, notifications, guarantor requests, and self-service actions.

| Step | Action | Expected result | Result |
| ---: | --- | --- | --- |
| 1 | Log in as an active member. | Member Portal shows member name, SACCO, backend source, last sync, and own balances only. |  |
| 2 | Review balance cards. | Savings, shares, welfare, total balance, and status are clear and match the backend member record. |  |
| 3 | Review active loans. | Outstanding balance, repayments, loan exposure, and loan state are visible. |  |
| 4 | Submit a member loan application if enabled. | Application is accepted with confirmation or rejected with clear validation. |  |
| 5 | Review guarantor requests. | Pending requests show borrower, amount, and accept/reject actions. |  |
| 6 | Accept or reject a guarantor request. | Decision is saved and no duplicate decision is allowed. |  |
| 7 | Review notifications. | Payment, loan, complaint, and guarantor notifications display from the backend. |  |
| 8 | Save an offline complaint draft. | Draft remains visible locally and is marked as not yet synced. |  |
| 9 | Sync the complaint draft. | Draft becomes a server complaint and member receives confirmation state. |  |
| 10 | Attempt to access another member record through the UI or URL if possible. | Access is blocked and only the authenticated member's records are shown. |  |
| 11 | Log out. | Member session is revoked and portal requires login again. |  |

Pass criteria:

- Member sees only their own balances, loans, notifications, guarantor requests, and drafts.
- Offline draft behavior is understandable and non-financial.
- Self-service actions produce clear success or validation feedback.

## Sign-Off

| Role | Sign-off owner | Result | Date | Notes |
| --- | --- | --- | --- | --- |
| Platform admin |  |  |  |  |
| SACCO staff |  |  |  |  |
| Member portal |  |  |  |  |

Release candidate UAT passes only when all three roles are `Pass` or explicitly `Accepted with finding` by the product owner.
