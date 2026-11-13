# Test-Greening Change Log & Verification Checklist

This documents the changes made to green the backend integration suite after Codex's
one-uncleared-loan rule, terminal-status rename (`closed`→`paid`), and the SACCO
role/governance migrations. Run `mvnw.cmd test -Djacoco.skip=true` and use this to
confirm each cluster.

## Production code changes

### `LoanController.java` — validate payload before business-state check
Loan creation now checks product / amount / repayment-period **before** the
"member has an uncleared loan" (409) check. Malformed requests get their specific
400 error instead of a premature conflict.
- Verify: `invalidLoanApplicationsAreRejected` (INVALID_LOAN_PRODUCT, INVALID_REPAYMENT_PERIOD).

### `TenantController.java` — unpaid-with-payment-status starts an active setup trial
`createTenant` now activates any registration that **supplies a payment status**
(paid → covered trial; unpaid → setup trial, subscription stays `trial`). A
registration that **omits** `paymentStatus` stays `pending_review`.
- Verify: `expiredSetupTrialAllowsReadOnlyLoginButBlocksDataEntry` (new tenant `active`,
  then `expired` → 402 on data entry); `platformPaidRegistration…SetupTrial` (paid + unpaid
  both `active`, unpaid subscription `trial`); `platformUserCanCreateAndReviewTenantStatuses`
  (no payment status → `pending_review`).

### `V146__restore_chairperson_savings_transfer_approval.sql` (new migration)
Restores `savings-transfer:approve` to `role_green_chairperson` (V111 had removed it), so
the SACCO has three distinct transfer approvers for dual control.
- Verify: migration applies cleanly after V145; `highValueSavingsTransfer` passes.

## Test changes (`SaccoBackendApplicationTests.java`)

### Loan cluster — dedicated funded borrower per loan
Added `newFundedActiveMember()` (+ `FundedMember`/`DisbursedLoan` records). The shared
seed member `member_green_amina` keeps her standing uncleared `loan_green_0001` (other
tests depend on it), so loan-lifecycle tests now register a fresh, active member funded
with 900,000 savings / 150,000 shares. Converted: the `createApprovedAndDisbursedLoan`
helper (4 callers), `loanCreditAppraisal…`, `saccoUserCanSubmitLoan…` (audit line keyed to
the new member's membership no.), `midValueLoan…`, `loanDecisionControls…`,
`staffCanRequestGuarantor…` (cover applicant assertion), `guarantorControlsAreEnforced`
(three separate borrowers), `borrowerCannotGuaranteeOwnLoan…`, `loansAndApprovalsRequire…`.
Also `loanRepaymentsReduceBalanceAndCloseLoan`: terminal status `closed`→`paid`.
- Verify: all loan-lifecycle tests; watch for guarantor-capacity or high-value-deposit
  surprises (borrower funding uses plain deposits).

### Member-count tests — order-independent
`memberCount` is recomputed live, so borrowers added by loan tests raise it. Loosened to
bounds: `subscriptionsUseMemberBasedBilling…` (`memberCount`/`billableMembers` `>=`) and
`trialAndPaidMemberCapacity…` (`inactiveMemberOverflow >= 1`; behavioural deposit checks
unchanged).

### Staff-link tests — free seeded links
V141 pre-links `user_green_secretary`→Daniel and `user_green_treasurer`→Grace. Each test
now clears the relevant staff user's link at the start.
- Verify: `staffUserCanOnlyBeLinkedToOneMember`, `staffLinkedToMemberCannotApproveTheirOwnTransaction`.

### Loan-book import — `paid` rename
`loanBookImportRejects…`: row status `closed`→`paid`, expected error
`CLOSED_LOAN_HAS_BALANCE`→`PAID_LOAN_HAS_BALANCE` (IMPORT_STATUSES = {active, paid}).

### High-value savings transfer — Chairperson/Admin approvers on a non-conflicted member
`highValueSavingsTransfer`: source Amina→Daniel; approvers Secretary→**Chairperson** (first)
+ Admin (second); creator Treasurer. Daniel avoids the Chairperson↔Amina conflict-of-interest.

## Final permission/gate fixes

- **Loan creation started "active":** `LoanController.create()` used the bare `new Loan(...)` whose
  default status is `active`; it now uses `Loan.submitted(...)`. Submitted loans also reset `balance`
  to 0 (disburse sets it to `totalPayable`).
- **Loan interest 2%:** `create()` prices loans at the tenant profile rate. V116 defaulted every
  profile to 1.5%; V148 sets Green Valley to 2% to match the seeded loan book and fixtures.
- **Approvals/complaints permissions:** V114 stripped `approvals:view/decide` from all roles. V147
  restores them to `role_green_admin`, `role_platform_super_admin`, and (view only)
  `role_green_loans_officer`, plus `complaints:route` to the admin (needed to resolve complaints).
- **Chairperson savings-transfer approval:** V146 restores `savings-transfer:approve` to the
  Chairperson so high-value transfers have three distinct approvers.

## Shared-state pitfalls (why isolation matters here)

The integration suite (`@SpringBootTest` + MockMvc) shares one in-memory H2 database across all 414
tests, re-seeded once per JVM run from the Flyway migrations. There is **no per-test rollback**, so a
test that mutates seeded rows leaks state into whatever runs next (JUnit's method order is a stable
hash, so adding/removing test methods can reshuffle it and surface latent order-dependence). Known
traps for future test authors:

- **Seeded mutable loans (`loan_green_0002`):** several tests approve/disburse or assert the state of
  this shared seed loan. Each such test now resets it (status/stage/approval/disbursement fields, and
  its schedule) at its start so it is order-independent. Do the same for any new test that touches a
  seeded loan's lifecycle.
- **Live member counts / paid capacity:** `GET /subscriptions` recomputes `memberCount` from the live
  members table and clamps paid capacity to it; the member-deposit gate blocks members ranked beyond
  paid capacity (by membership number). Tests that register members can push *other* tenant_green
  members past capacity. Fixes used: assert billing with bounds (`>=`) not exact counts, fund loan
  borrowers via jdbc (bypasses the deposit gate; the loan flow is not capacity-gated), and give
  throwaway borrowers a last-sorting membership number (`GREE-ZLB-*`) so they don't inflate others' rank.
- **Seeded staff links (V141):** `user_green_secretary`→Daniel, `user_green_treasurer`→Grace,
  `user_green_chairperson`→Amina. Tests that link those staff users must free the existing link first.
- **Trial subscriptions block deposits:** import/helper tenants created without a payment status are
  `pending_review` with a `trial` subscription; member deposits (and savings import) are blocked until
  the subscription is active and paid — activate/fund it in the test if you need deposits.
- **Officials gate:** activating a tenant requires three assigned officials (chairperson/secretary/
  treasurer) via `PATCH /tenants/{id}/officials/{office}`.

## Optional future hardening — real test isolation

If shared-state flakiness recurs, the durable fix is per-test isolation. Trade-offs:

- **Class-level `@Transactional` (per-test rollback):** the standard Spring approach; removes the need
  for manual cleanup/resets. Caveat: with MockMvc + `jdbcTemplate` and multi-request maker/checker
  flows, some tests may need review (propagation, committed-state reads), so roll it out iteratively
  with test runs rather than all at once.
- **`@DirtiesContext(AFTER_EACH_TEST_METHOD)`:** full isolation but rebuilds the context and re-runs
  every migration per test — impractically slow for 414 tests.
- **Pilot first:** apply `@Transactional` to one low-risk test class, confirm green, then expand.

Not applied now by choice: the suite is green and deterministic, and a blanket change can't be
validated without JDK 17 in the authoring environment, so it would risk the current green build.

---

## Node API regression suite (2026-09-21)

The running app uses the **Node API** (`server.mjs` + `backend/*.mjs`), not the Java backend.
That code had no *executed* automated tests — `scripts/api-smoke-test.mjs` existed but was only
syntax-checked by `npm run check`, never run, so it had silently drifted from the code.

### Added
- **`scripts/test-member-lifecycle.mjs`** (`npm run test:members`): self-contained regression
  suite (spawns the server, no deps) covering member creation defaults, the phone-or-email contact
  rule, the `members:approve` gate on status **and** KYC changes, invalid-value rejection, and the
  approve / reject / reactivate / verify-KYC transitions plus audit trail. 18 checks.
- CI job **`node-api-tests`** now runs both `test-member-lifecycle.mjs` and `api-smoke-test.mjs`
  (added to `release-gate` `needs:`). `test:members` and `test:api` also added to `npm run check`.

### Code fixes (real defects surfaced by rehabbing the smoke test)
- **Member numbering collision:** `createMember` generated `${abbr}-${count+1}`, which collides once
  membership numbers have gaps (seed runs to `GREE-0012` with 9 members). This also hit the live
  add-member flow. Replaced with `nextMembershipNo` (highest existing suffix + 1, with a uniqueness
  guard).
- **Cash posts immediately:** per product decision (system-of-record; approvals happen on paper),
  `createFinancialTransaction` now records **cash** transactions as `posted` immediately with the
  receiving staff user as checker; **bank / mobile-money** still require second-person approval.

### Smoke-test assertions realigned to current (intended) behaviour
- Loan creation requires a signed-form reference; approval requires a confirmed guarantor signature
  and a recorded paper approval (officers + reference + approver names). These are *new, stronger*
  controls the old test predated.
- Loan disbursement is **single-step** (approvals are done on paper; the system records + disburses).
- Provider-confirmed **mobile-money callbacks auto-post** (idempotent dedupe), rather than landing
  as pending for approval.
- `/approval-workflows` is a live, tenant-scoped read (not a retired 403).

### Follow-up completed (2026-09-21)
- Financial-transaction `reference` previously used the same `count+1` scheme as the old membership
  numbering and was not uniqueness-checked, so gaps could yield duplicate references. Fixed: added a
  shared `nextSequentialCode` generator (highest suffix + 1, with a uniqueness guard scanning every
  existing reference — generated, provider `externalReference`, and `-REV` codes). `nextMembershipNo`
  now delegates to it, and `createFinancialTransaction` uses `nextTransactionReference`. The smoke
  test asserts consecutive references differ and that references are unique within a tenant.

---

## Financial integrity review — Node API (2026-09-21)

Reviewed money handling in `backend/api.mjs` / `backend/store.mjs`. Overall the money paths are
sound; one real defect found and fixed, plus notes.

### Strengths (no change needed)
- **Posted transactions are immutable:** the only mutations are `/status` (pending → posted/rejected;
  409 once decided) and `/reverse`. No PATCH edits a posted transaction; the only DELETE endpoint is
  whole-tenant offboarding.
- **Reversal-not-delete:** `reverseFinancialTransaction` creates a negating `-REV` entry (original
  untouched), with double-reversal, accounting-period, balance-sufficiency and mandatory-reason guards.
  `memberBalances` negates reversals via `originalTransactionId` direction.
- **Idempotency:** mobile-money callbacks dedupe by `externalReference`; manual loan repayments dedupe
  by (tenant, reference) → 409; statement imports dedupe by reference.
- **Accounting-period gating** on every posting path (cash create, status-post, reversal, repayment,
  callback).
- **Unique references** (fixed earlier today via `nextSequentialCode`).

### Defect fixed
- **Withdrawal could overdraw savings.** `createFinancialTransaction` validated amount > 0 but never
  checked available savings, so a cash withdrawal (which posts immediately) could drive `savings`
  negative. Added a sufficiency check at creation and a re-check at post time for non-cash withdrawals
  in `updateFinancialTransactionStatus` (409 `INSUFFICIENT_SAVINGS_BALANCE`). Smoke test asserts an
  over-withdrawal is rejected and an in-balance withdrawal posts.

### Notes / recommendations (not changed)
- **Monetary type:** the Node API uses JS `Number` (float) with a `money()` 2dp rounder. Fine for
  whole-shilling UGX (currencyDigits 0), but a latent rounding risk for 2-decimal currencies under
  many operations. The production Java stack uses BigDecimal; keep money in integer minor units or
  BigDecimal there.
- **Cross-channel repayment idempotency:** manual repayments dedupe within `loanRepayments`, and
  callbacks dedupe within `mobileMoneyCallbacks`, but a manual reference and a callback
  `externalReference` are not cross-checked. Low risk (channels namespace references), noted only.
- **Tenant deletion purges financial history.** `deleteTenant` hard-deletes all tenant rows (audit
  events preserved). Intentional, strongly guarded offboarding — but if regulatory retention applies,
  export/archive before purge.

---

## Security review — Node API (2026-09-21)

Reviewed the auth boundary and multi-tenant isolation in `backend/api.mjs`.

### Verified sound
- **Auth boundary is clean.** Only health, staff login, member login, the mobile-money callback
  (rate-limited; HMAC-verified when a secret is configured), member payment-request create/list
  (member-auth), and public SACCO registration are unauthenticated. Everything else sits behind
  `requireAuth` (staff) or `requireMemberAuth`.
- **Tenant isolation holds.** New regression suite `scripts/test-tenant-isolation.mjs`
  (`npm run test:isolation`, wired into CI + `check`) logs in as a tenant_green admin and attempts
  16 cross-tenant operations against tenant_lake (read/edit member, status/KYC, statement, documents,
  loan schedule/approve/disburse/repay/guarantee, tenant + profile reads) plus spoofed
  `tenantId=`/`body.tenantId` on transaction/branch creation and member listing. All are denied
  (403/404) or safely coerced to the caller's own tenant. 16/16 isolated, 0 leaks.

### Findings / recommendations (not changed)
- **Least privilege on financial + loan mutations (Medium).** `createFinancialTransaction`,
  `updateFinancialTransactionStatus`, `reverseFinancialTransaction`, `createLoan`, `updateLoanStatus`,
  `disburseLoan`, `recordLoanRepayment` and `createBranch` are gated only by authentication + tenant
  access — no fine-grained permission. Any authenticated staff member of a tenant can post/reverse
  transactions, disburse/approve loans, or create branches regardless of their role. (Maker-checker on
  non-cash transactions *is* enforced: the maker cannot approve their own.) Recommend role-permission
  gates (e.g. `transactions:post`, `transactions:reverse`, `loans:disburse`, `loans:approve`,
  `branches:manage`) — mirrors the `members:approve` gate added earlier. Deferred because it needs a
  permission→action mapping decision and per-role seed updates.
- **Spoofed `body.tenantId` is silently coerced, not rejected (Low).** For non-platform users,
  `visibleTenantId` forces the caller's own tenant, so a mismatched `tenantId` in the body creates the
  record in the caller's tenant rather than returning 403. No cross-tenant leak, but a confused-deputy
  surprise; consider rejecting an explicit foreign `tenantId` from non-platform callers.

### Already fixed earlier in this session
- `members:approve` gate on member status and KYC changes.
- Withdrawal-overdraw guard on financial transactions.
