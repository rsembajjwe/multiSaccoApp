# saccoApp / Tereka Online — Comprehensive Code Review

**Reviewer:** Senior Architect / Security / QA pass
**Date:** 2026-07-22
**Scope:** Full repository review (no functional changes made). Focus on understanding the codebase and identifying, categorising, and prioritising improvements. No major architectural changes were made.

---

## 1. Summary

Tereka Online is a multi-tenant SACCO management platform for Uganda. The repository contains:

- **`backend-java/`** — Spring Boot 4.0.7 / Java 17 REST API. This is the **production backend** (~16,465 lines of Java, 185 files, 44 Flyway migrations V1–V44). H2 for dev, PostgreSQL + Flyway for prod.
- **`backend/`** — A parallel Node.js implementation (`api.mjs` 3,578 lines, `store.mjs` 1,129 lines) described as a "prototype bridge/proxy" that can proxy `/api/v1` to Java.
- **Frontend** — Static HTML/JS app (browser `localStorage` demo data, proxies to the API).
- **`mobile/member_app/`** — Flutter "member app foundation".
- **`docs/`** — Extensive planning, deployment, UAT, and manual documentation.

The breadth of functionality is impressive and the domain modelling is broadly sound: tenant-scoped tables with foreign keys, maker-checker approvals, reversal-instead-of-delete ledger semantics, accounting-period locking, PBKDF2 password hashing, login rate-limiting, MFA, and audit logging are all present. The Java backend was clearly built feature-by-feature (307 commits, all by `rsembajjwe`/Codex).

However, several **critical financial-integrity and security gaps** exist that must be resolved before any production or pilot handling of real money, plus systemic architecture and test-coverage issues that will make the codebase hard to evolve safely.

### Findings by severity

| Severity | Count | Headline items |
|---|---|---|
| **Critical** | 3 | Unauthenticated mobile-money callback; non-atomic financial mutations; near-zero backend test coverage |
| **High** | 4 | Demo accounts seeded into prod DB; idempotency/reference race conditions; business logic in fat controllers; balance lost-update (no locking) |
| **Medium** | 7 | No loan interest model; MFA brute-force; no global exception handler; API-bypassable tenant scoping; duplicate Node backend; incomplete security headers; money scale not normalised |
| **Low** | 5 | Flutter app is a static mock; stale draft migrations; missing DB CHECK constraints; verify actuator/H2 lockdown; unverified Spring Boot 4 build reproducibility |

---

## 2. Architecture & Repository Structure

The Java backend is organised by domain package (`identity`, `tenant`, `branch`, `member`, `finance`, `loan`, `accounting`, `subscription`, `approval`, `governance`, `complaint`, `notification`, `security`, `health`, `config`). Each domain has entities, Spring Data repositories, response DTOs, and a controller. DTOs are used at the API boundary (entities are not serialised directly) — good.

**Authentication/authorisation is hand-rolled — there is no Spring Security dependency.** Each controller method repeats the same pattern:

```java
AuthService.CurrentSession currentSession = authService.currentSession(authorization);
if (currentSession == null) return authService.authRequired();
if (!authService.hasPermission(currentSession.user(), "x:y")) return authService.permissionRequired("x:y");
String tenantId = tenantScope(currentSession, requestedTenantId);
if (tenantId == null) return tenantAccessDenied();
```

Bearer tokens are opaque random tokens, stored hashed (SHA-256) in `auth_sessions`, resolved per request. This works, but pushing cross-cutting concerns (authN, authZ, tenant scoping) into every handler by hand is the root cause of several findings below: it is repetitive, untested, and one forgotten check equals a tenant/permission leak.

---

## 3. Critical Findings

### C-1. Mobile-money callback endpoint is unauthenticated and unverified
`accounting/MobileMoneyController.receiveCallback` (`POST /api/v1/integrations/mobile-money/callback`) has **no authentication and no provider signature/HMAC verification**. It accepts a JSON body (`tenantId`, `memberId`/`memberIdentifier`, `amount`, `purpose`, `externalReference`) and, for contributions, directly calls `member.applyPostedTransaction(...)` and writes a **`posted`** `FinancialTransaction` (maker = hardcoded `user_platform_admin`), **bypassing maker-checker entirely**. For loan repayments it reduces the loan balance.

**Impact:** Anyone who can reach this endpoint can inflate any member's savings/shares/welfare balance or mark loans repaid, at will. This is direct financial fraud. The project's own rules require "request verification" for mobile money.

**Recommendation:** Require a provider-shared secret / HMAC signature over the raw payload (and timestamp/nonce to prevent replay), validate it before any state change, restrict by source IP/mTLS where the provider supports it, and record the raw signed payload. Do not trust `tenantId`/`amount` from an unauthenticated body.

### C-2. Financial state mutations are not transactional
Money-mutating handlers perform multiple independent `save()` calls with **no `@Transactional`**:

- `FinancialTransactionController.decideTransaction` → saves member (balance) then transaction.
- `FinancialTransactionController.reversePostedTransaction` → saves member then reversal.
- `MobileMoneyController.postContribution` / `postLoanRepayment` → saves member/loan, transaction/repayment, statement line, notification, callback.
- `LoanController.createRepayment` / `disburse` / `createGuarantor` → saves loan/guarantor across steps.

Across the controllers, only 4 of ~20 use `@Transactional`, and mostly on the bulk *import* endpoints, not the per-operation money paths. `MobileMoneyController`, `AccountingController`, `WelfareClaimController` have **zero**.

**Impact:** A failure between saves (exception, DB constraint violation, crash) leaves the member balance updated without a corresponding ledger row — or the reverse. Money is silently created or destroyed and the ledger no longer reconciles. This breaks the "transactional integrity" and "immutable posted transactions / balanced ledger" rules.

**Recommendation:** Wrap every balance-affecting operation in a single transaction (ideally in a service method). Catch `DataIntegrityViolationException` and translate to a clean 409.

### C-3. Effectively no automated test coverage on the production backend
`backend-java/src/test` contains **one** file — the default `SaccoBackendApplicationTests.contextLoads`. The 16k-line production backend, including all financial math, tenant isolation, permission checks, reversals, and mobile-money callbacks, has **no unit or integration tests**. Commit messages such as "Add tenant isolation regression coverage" and "Strengthen financial correctness tests" refer to Node/Playwright scripts, not the Java code that will run in production.

**Impact:** None of the critical/high issues below would be caught by CI. Refactoring is unsafe. The project charter explicitly requires tests for tenant isolation, permissions, financial calculations, and callbacks.

**Recommendation:** Prioritise `@DataJpaTest`/`@SpringBootTest` + MockMvc coverage for: tenant isolation (cross-tenant access denied), maker-checker, withdrawal insufficient-funds, reversal balance math, idempotent callbacks, and permission enforcement, before further feature work.

---

## 4. High Findings

### H-1. Demo/seed accounts (with committed credentials) are loaded into every environment
Migrations such as `V38__demo_role_accounts.sql` and `V40__platform_specialist_demo_accounts.sql` `INSERT` users with **hardcoded `password_hash` + `password_salt`** (committed to git) plus roles/permissions. These are ordinary versioned Flyway migrations — they run in **production** too. Runtime login is gated by `SACCO_DEMO_LOGINS_ENABLED=false`, but the known-credential accounts still physically exist in the prod database.

**Impact:** A misconfiguration, a code path that skips `DemoCredentialPolicy`, or simply the flag being flipped exposes admin/treasurer accounts whose passwords are public in the repo.

**Recommendation:** Move all seed/demo data out of the baseline migration chain (separate `demo`-profile-only migration location or a seeding script), so production schemas never contain demo principals.

### H-2. Idempotency and reference generation are racy
- Duplicate mobile-money callbacks are detected via `findByTenantIdAndExternalReference(...)` **then** insert — a check-then-act with no unique-key transaction guard. Two concurrent identical callbacks can both pass the check and double-post (and, per C-2, mutate the balance before the second insert fails on the DB unique constraint, leaving an orphaned balance change).
- `FinancialTransactionController.referenceForTenant` builds references from `countByTenantId(...) + 1`, which collides under concurrency.

**Recommendation:** Rely on DB unique constraints inside a transaction and handle the violation; generate references from a sequence or the row id, not a count.

### H-3. Business logic lives in fat controllers (no service layer)
Controllers are very large and contain validation, money math, CSV generation, and import logic: `MemberController` 1,310 lines, `LoanController` 1,171, `AccountingController` 1,037, `FinancialTransactionController` 726. This directly contradicts the project's stated standards ("service layer business logic", "no business logic inside controllers"). It also concentrates the auth/tenant boilerplate (H/C root cause) and makes unit testing impractical.

**Recommendation:** Extract domain services (`FinancialTransactionService`, `LoanService`, `MobileMoneyService`, …) holding the business rules and `@Transactional` boundaries; keep controllers thin (parse → authorise → delegate → map).

### H-4. Balance updates have no concurrency control (lost updates)
Member and loan balances are read-modify-write on the entity with no `@Version` optimistic locking or pessimistic row lock. Two concurrent postings/repayments for the same member/loan read the same starting balance and the second `save` overwrites the first — a classic lost update in a financial ledger.

**Recommendation:** Add `@Version` to `Member`/`Loan` (or use locking queries / ledger-derived balances) and retry on `OptimisticLockException`.

---

## 5. Medium Findings

### M-1. No loan interest / amortisation model
`Loan` tracks `amount`, `dsr`, `repaymentMonths` but **no interest rate, total repayable, or schedule**. `recordRepayment` subtracts from principal only. The computed `dsr` is stored but never enforced as an approval ceiling. For a SACCO, interest-bearing loans and DSR limits are core business rules — this appears missing rather than merely incomplete. Confirm against the requirements document and, if required, model interest, installment schedule, arrears, and enforce DSR/limits at approval.

### M-2. MFA verification is not throttled
`verifyMfa` compares a 6-digit code within a 5-minute window with **no per-challenge attempt limit or lockout**, and the challenge is not invalidated after wrong guesses. Brute force is feasible (requires a valid password first, so it is defence-in-depth). Add an attempt counter that fails/locks the challenge.

### M-3. No global exception handling
There is no `@ControllerAdvice`/`@ExceptionHandler`. Uncaught exceptions — `orElseThrow()` in import loops, `NumberFormatException`, `DataIntegrityViolationException` from concurrent inserts — produce default Spring error responses (potential detail leakage) and, combined with C-2, can return 500 *after* a partial balance write. Add a global handler that maps domain/technical exceptions to the existing `ApiErrorResponse` shape.

### M-4. Staff-login tenant scoping is enforced only in the UI
`AuthController.login` requires a `saccoCode` in the UI, but when `saccoCode` is blank the API falls back to a **global** `findByEmailIgnoreCase`. The "SACCO code required for staff login" control is therefore bypassable directly against the API. Enforce the code server-side (reject blank code) or make the fallback explicit and safe.

### M-5. Two full backends to keep in sync
`backend/api.mjs` (3,578 lines) + `store.mjs` (1,129) is a complete second implementation of the domain, not just a proxy. Every business rule now has to be maintained in two languages, and they will drift (the Node version predates the Java hardening). Decide on one source of truth; if Node must remain for the static frontend, reduce it to a pure proxy.

### M-6. Security headers incomplete; non-constant-time hash compare
`SecurityHeadersFilter` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Resource-Policy` but **no Content-Security-Policy and no HSTS** (`Strict-Transport-Security`). Separately, `PasswordHasher.matches` uses `equalsIgnoreCase` rather than a constant-time compare (`MessageDigest.isEqual`). Low individually but easy wins.

### M-7. Monetary scale is not normalised
Amounts are parsed with `new BigDecimal(value.trim())` (imports, callbacks, create) without `setScale(2, HALF_UP)`. Values with more than two decimals are silently rounded on persist to `DECIMAL(18,2)`, and in-memory math can carry inconsistent scale. Normalise all money to a fixed scale/`RoundingMode` at the boundary.

---

## 6. Low Findings

- **L-1. Flutter member app is a static mock.** `mobile/member_app/lib/main.dart` renders hardcoded data ("Amina Nakitende", fixed balances) with empty `onPressed` handlers, no networking, no auth, no secure token storage. It is a legitimate "foundation", but README/commit language ("mobile loan application flow", "offline complaint draft sync") overstates it. No real secrets are exposed.
- **L-2. Stale draft migrations.** `docs/migrations/*.sql` are self-described as "documentation until database tooling is added" and duplicate the real `V1–V44` chain — confusing; consider removing or clearly marking as historical.
- **L-3. Missing defensive DB CHECK constraints** (e.g., `amount > 0`, status enums). App-level checks exist, but DB-level constraints add safety. Immutability of posted rows is app-enforced only; consider triggers if regulator requires.
- **L-4. Verify actuator/H2 lockdown in prod.** Good: only `health,info` exposed; H2 console not enabled by config. The `spring-boot-h2console` dependency is on the classpath — confirm it stays disabled in the prod profile.
- **L-5. Build reproducibility unverified here.** Spring Boot `4.0.7` with non-standard starter artifact names (`spring-boot-starter-webmvc`, `spring-boot-h2console`, `spring-boot-starter-*-test`, etc.) could not be compiled in this review sandbox (JDK 11 only, no network). Confirm CI resolves these reproducibly on JDK 17.

---

## 7. Build & Test Execution

- **Could not run the Java build/tests in the review environment.** The sandbox has only **JDK 11** (project targets **Java 17 / Spring Boot 4**), no privileges to install a JDK, and no network access to fetch the Maven wrapper distribution or dependencies. `./mvnw compile` failed at `wget ... apache-maven-3.9.16-bin.zip`.
- **Pre-existing evidence:** `backend-java/target/surefire-reports/TEST-...SaccoBackendApplicationTests.xml` shows the single `contextLoads` test passing (21.3s) from an earlier run on the developer machine. This confirms the app context wires up, but exercises none of the business logic (see C-3).
- **Recommendation:** Run `npm run check` / `npm run java:test` locally on JDK 17 to confirm, then add the coverage described in C-3.

---

## 8. What is done well (preserve this)

- PBKDF2-HMAC-SHA256 password hashing at 210k iterations with per-user salt; session tokens stored hashed at rest.
- Maker-checker on manual transactions (maker cannot approve own); reversal-instead-of-delete ledger semantics; accounting-period close blocks postings.
- Multi-tenant schema: `tenant_id` on tenant-owned tables, foreign keys, `UNIQUE(tenant_id, reference)`, useful composite indexes.
- Login rate-limiting + lockout, MFA challenge flow, password reset with session revocation, and pervasive audit logging.
- `BigDecimal` used throughout for money; import flows (opening balances, loan book, repayment history) have thorough, well-structured validation with dry-run support.

---

## 9. Suggested Remediation Order (incremental, low-risk first)

1. **C-1** Authenticate + verify the mobile-money callback (blocks active fraud vector).
2. **C-2 / H-4** Wrap money operations in transactions; add `@Version` optimistic locking.
3. **H-1** Remove demo seed data from the production migration chain.
4. **H-2** Fix idempotency/reference races (DB unique + handled violation).
5. **C-3** Add the first tier of tenant-isolation, permission, and financial-correctness tests.
6. **H-3** Extract service layer for finance/loans/mobile-money (enables the tests above and future work).
7. **M-3, M-4, M-6, M-7, M-2** Global exception handler, server-side login-code enforcement, CSP/HSTS + constant-time compare, money scaling, MFA throttle.
8. **M-1** Confirm and, if required, implement loan interest/DSR business rules.
9. **M-5 / L-1** Decide Node-backend fate; plan real Flutter integration.

None of these were implemented in this pass, per instruction. Recommend tackling them in the order above, each behind its own tests.
