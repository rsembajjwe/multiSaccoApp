# saccoApp — RBAC & Access-Control Security Review

**Scope:** Authorization hardening of the role/function matrix across the Java Spring Boot backend, the permission seed/catalog, the frontend JS access model, and the Flutter member app.
**Date:** 2026-08-26
**Reviewer role:** Security Engineer / Code Reviewer (Review Mode)
**Verdict:** The authorization design is **more mature than typical** — strong password hashing, opaque hashed session tokens, consistent tenant guards, and real maker-checker controls. The hardening gaps are **specific and fixable**, not structural rot. No cross-tenant data-leak (IDOR) was found in the sampled controllers. The main theme: authorization is enforced **per-controller by hand with no global default-deny**, and a few endpoints have slipped through that net.

---

## How authorization works today (baseline)

There is **no Spring Security filter chain, `@PreAuthorize`, or `@EnableMethodSecurity`.** Instead every controller method repeats this pattern by hand:

1. `AuthService.currentSession(authorization)` — resolves a bearer token → `AuthSession` (looked up by SHA-256 hash) → active `User`.
2. `authService.hasPermission(user, "module:action")` — checks the user's role→permission grants, **scoped to `user.getTenantId()`** (`AuthService.java:62`).
3. Tenant isolation via a per-controller `canAccess(session, entity.getTenantId())` guard after each `findById(...)`, plus branch scoping.

This works, but it is **opt-in per endpoint**. Nothing fails closed if a developer forgets a step — which is exactly what has happened in the High/Medium findings below.

---

## Severity summary

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| H1 | **High** | No global default-deny; authn/authz is per-controller only | architecture-wide |
| H2 | **High** | Branch list & create have no permission check | `branch/BranchController.java:39,56` |
| M1 | **Medium** | Audit-log listing has no permission check | `identity/AuditController.java:47` |
| M2 | **Medium** | Coarse permission catalog can't express the matrix (Welfare, Savings, Shares, Reconciliation, Audit) | catalog + `finance/WelfareClaimController.java` |
| M3 | **Medium** | Chairperson over-provisioned vs the matrix (least privilege) | `db/migration` role grants |
| L1 | Low | Non-constant-time password comparison | `security/PasswordHasher.java:24` |
| L2 | Low | Actuator metrics/prometheus exposed at app layer | `application*.properties` |
| L3 | Low | Catalog hygiene: dead/undocumented grants | `db/migration` |

---

## HIGH

### H1 — No global default-deny; authorization is per-controller only
**What:** Authentication and authorization are enforced solely by each controller manually calling `currentSession()` and `hasPermission()`. There is no filter chain or method-security layer that denies access by default. The only registered filters are rate-limiting, security headers, subscription enforcement, request correlation, and the mobile-money callback signature check — **none of them authenticate or authorize application endpoints.**

**Why it matters:** Any endpoint (existing or newly added by you or Codex) that omits the check is fully exposed. This is not hypothetical — findings **H2** and **M1** are live instances of exactly this failure mode. As the controller count grows, the probability of another gap approaches certainty.

**Remediation (defense in depth, do not rip out the existing checks):**
- Add a `HandlerInterceptor` or `OncePerRequestFilter` that **requires a valid session for every `/api/**` route** except an explicit allowlist (`/auth/login`, `/auth/password-reset/**`, public SACCO registration, `/health`, mobile-money callbacks). Fail closed with 401.
- Introduce lightweight **method-level permission metadata** — either adopt Spring Security's `@PreAuthorize("hasAuthority('loans:approve')")` (load permissions as authorities at session resolution) or a small custom `@RequiresPermission("loans:approve")` annotation enforced by the interceptor. Keep the per-controller `canAccess` tenant guards as the second layer.
- Add an **archure test** (ArchUnit or a unit test) asserting that every `@RequestMapping` handler in a controller either carries the permission annotation or is on the public allowlist. This makes a forgotten check fail the build, not production.

---

### H2 — Branch management is authenticated but not authorized
**Location:** `branch/BranchController.java` — `listBranches` (`@GetMapping`, line 39) and `createBranch` (`@PostMapping`, line 56).

**What:** Both endpoints check `currentSession == null` and scope the tenant via `tenantScope(...)`, but **neither calls `hasPermission(...)`**. Any authenticated staff user in a tenant — a Teller, Auditor, or Loans Officer — can **list and create branches** in their own SACCO.

**Why it matters:** Branch is an **isolation primitive**: branch-scoped users are limited to a branch, and much of the reporting/reconciliation logic keys off branch membership. Letting an unprivileged user mint branches (or enumerate them) is a function-level authorization break with downstream isolation impact. Per your matrix, branch/settings management belongs to SACCO Administrator (and Chairperson for profile), gated on `sacco-profile:manage`.

**Remediation:** Gate `createBranch` on `sacco-profile:manage` (or `tenants:manage`), and `listBranches` on at least `members:view`/`sacco-profile:manage` per your intended matrix. Add the maker audit already present.

---

## MEDIUM

### M1 — Audit-log listing has no permission check
**Location:** `identity/AuditController.java` — `listAuditEvents` (`@GetMapping`, line 47).

**What:** The endpoint authenticates and correctly scopes results to the caller's tenant (and, for branch-scoped users, to their own actor events), **but performs no `hasPermission` check.** Any authenticated tenant user — including a Teller/Cashier — can read their SACCO's audit trail (actor names, actions, resource IDs, IP addresses).

**Why it matters:** Your role matrix restricts **Audit Logs** to **SACCO Administrator** and **Auditor** only. Audit records are sensitive (they reveal who did what, from which IP). This is broken function-level authorization on sensitive data.

**Remediation:** Introduce an `audit:view` permission (see M2), grant it only to Administrator and Auditor roles, and gate `listAuditEvents` on it. As an interim fix without a new permission, gate on `tenants:manage` (Admin) — but that would exclude the Auditor, which is why the dedicated permission is the correct fix.

---

### M2 — Coarse permission catalog cannot express the documented matrix
**What:** The catalog has ~39 coarse `module:action` permissions, but your matrix defines many finer-grained functions (Savings, Shares, Welfare, Expenses, Reconciliation, Member Subscriptions, Guarantors, Audit Logs, Fund Types, Sources of Funds). Several of these have **no dedicated permission** and are piggy-backed onto broad ones, producing both **over-** and **under-**grants.

**Proven instance — Welfare** (`finance/WelfareClaimController.java`): gated on `transactions:view` (67), `transactions:create` (98), `transactions:approve` (157), `accounting:post` (182).
- Your matrix assigns **Welfare** to **Secretary**. But the Secretary role has **no `transactions:*` grants** → a Secretary **cannot use Welfare at all.**
- A **Teller** has `transactions:create` → a Teller **can create welfare claims**, which your matrix never grants.

The same class of gap applies to **Audit Logs** (no `audit:*` permission → M1), **Savings/Shares** (served via `members:view`, so any member-viewer sees them regardless of the matrix's per-role intent), and **Reconciliation** (folded into `accounting:*`).

**Why it matters:** The matrix is your source-of-truth separation-of-duties contract. When enforcement can't distinguish these functions, roles silently get more or less than intended, and the matrix becomes documentation that the system doesn't actually enforce.

**Remediation:** Add dedicated permissions for the functions your matrix separates — at minimum `welfare:view/manage`, `audit:view`, `savings:view`, `shares:view`, `reconciliation:view`, `member-subscription:view/manage` — seed them onto the correct roles from the matrix, and switch the corresponding controllers to check them. This is mechanical and low-risk if done migration-by-migration with tests. (I can generate the migration + controller edits + a role-matrix test as the next step.)

---

### M3 — Chairperson role is over-provisioned versus the matrix
**What:** The seeded `role_green_chairperson` grants include `finance-source:manage`, `savings-transfer:approve`, `savings-transfer:manage`, and `approvals:decide`. Your matrix scopes the Chairperson to **oversight** — dashboard, loan review + **Loan Approval**, governance view, member/transaction/savings **view**, complaints, and **Settings** (profile + membership calendar). It does **not** grant the Chairperson the power to *manage capital/funding sources* or *create/approve savings transfers*.

**Why it matters:** Least privilege. An oversight/governance role holding finance-mutation permissions undermines the separation the matrix is designed to create, and enlarges the blast radius if a chairperson account is compromised.

**Remediation:** Trim the Chairperson grants to match the matrix: keep `loans:approve`, `sacco-profile:manage`, `dashboard:view`, the various `*:view`, `governance:view`, `complaints:view`, `subscriptions:view`; drop `finance-source:manage`, `savings-transfer:approve`, `savings-transfer:manage`. Keep `savings-transfer:view` only if oversight visibility is intended. (Minor sibling: Secretary holds `finance-source:view`, which the matrix doesn't list — confirm intent.)

*Note on Treasurer/Admin holding both create + approve:* this is **matrix-consistent** and, importantly, **maker-checker is enforced at the record level** — a maker cannot approve their own transaction/loan/transfer (see "What's already strong"). So this is acceptable as-is; no change required.

---

## LOW / INFORMATIONAL

### L1 — Non-constant-time password comparison
`security/PasswordHasher.java:24` — `matches()` uses `hash(...).equalsIgnoreCase(expectedHash)`. String `equals` short-circuits and is not constant-time. Prefer `MessageDigest.isEqual(decodedActual, decodedExpected)` on the raw bytes to remove the (small) timing side channel. The hashing itself (PBKDF2-HMAC-SHA256, 210k iterations, random salt) is excellent — do not change it.

### L2 — Actuator surface exposed at the app layer
`application.properties` / `application-prod.properties` expose `health,info,metrics,prometheus`. A comment notes the Caddy edge only proxies `health`/`info`, so `metrics`/`prometheus` aren't publicly reachable — but that is a single-control dependency. For defense in depth, bind actuator to a separate management port or require auth on it, so a proxy misconfiguration doesn't expose operational metrics.

### L3 — Catalog hygiene
`savings-transfer:manage` is seeded but never checked by any controller (dead grant). `dashboard:view` is purely a menu hint. Secretary's `finance-source:view` isn't in the matrix. None are exploitable, but reconciling them keeps the catalog honest and auditable.

---

## What's already strong (do **not** change these while hardening)

- **Password hashing:** PBKDF2-HMAC-SHA256, 210,000 iterations, 256-bit, random 16-byte salt — OWASP-aligned. (`PasswordHasher.java`)
- **Session tokens:** opaque, 256-bit random, stored **only as SHA-256 hashes**, with expiry and revocation. Not JWTs — no client-side trust. (`TokenGenerator.java`, `AuthService.java`)
- **Tenant isolation:** consistent `canAccess(session, entity.getTenantId())` guards after `findById` across Loan, Accounting, Governance, Complaint, Approval, Welfare, Financial-Transaction controllers. No cross-tenant IDOR found in the sample.
- **Maker-checker:** enforced at the record level and hard to bypass — maker cannot approve their own **loan** (`LoanController.decideLoan:1292,1297`), **transaction** (`FinancialTransactionController:479`, and even blocks approving your own linked member account, `:486`), or **savings transfer** (`:183`), with **dual distinct approvers required for high-value transfers** (`:201`).
- **Member portal & member chat:** every endpoint scopes to `currentSession.member().getId()` and verifies ownership before returning data (e.g., `ownsThread(...)`, notification-acknowledge ownership check). No member-to-member IDOR found.
- **Frontend gating is permission-driven, not role-name heuristics:** login/`me` returns the user's real `permissionIds`; `app.shell.js:hasPermission()` gates nav and `app.session.js` gates data fetches on those. The backend still enforces independently, so the UI layer is a correct convenience, not a security dependency.
- **Config hygiene:** no hardcoded secrets in prod properties; rate limiting, security headers, request-correlation, idempotency guard, and mobile-money callback signature verification are all present.

---

## Recommended remediation sequence

1. **H2 + M1 first** — two-line permission checks on Branch and Audit endpoints. Immediate, low-risk, closes live gaps.
2. **H1** — add the default-deny interceptor + the ArchUnit/handler test. This prevents the *next* H2/M1 from ever shipping.
3. **M2** — introduce the dedicated permissions your matrix separates (`welfare:*`, `audit:view`, `savings:view`, `shares:view`, `reconciliation:view`, `member-subscription:*`), migration-by-migration, each with a role-matrix assertion test.
4. **M3** — trim Chairperson (and confirm Secretary) grants to the matrix.
5. **L1–L3** — constant-time compare, actuator isolation, catalog cleanup.

Each of steps 1–4 can be delivered as a focused, tested change set that reuses the existing `hasPermission` machinery — no rewrite of the auth model required.

---

# Remediation status (applied this session)

All eight findings were implemented. **These changes were not compiled or tested in this session** — the environment has no usable JDK/Maven and Maven Central is blocked, so the build must be run on a dev machine (`cd backend-java && ./mvnw test`).

> **Working-tree note:** the repository already contained extensive *unrelated* uncommitted changes (Codex/other work) when this pass began — 130+ files. The manifest below is the **only** set this security pass touched; stage these selectively rather than committing the whole dirty tree.

| # | Finding | Status | Where |
|---|---------|--------|-------|
| H1 | No global default-deny | ✅ done | `config/AuthenticationGuardFilter.java` (new) + `test/.../config/AuthorizationCoverageTest.java` (new) |
| H2 | Branch endpoints unauthorized | ✅ done | `branch/BranchController.java` |
| M1 | Audit-log listing unauthorized | ✅ done | `identity/AuditController.java` + `V109` |
| M2 | Coarse catalog (Welfare, Member-Subs) | ✅ done | `finance/WelfareClaimController.java`, `member/MemberSubscriptionController.java`, `app.navigation.js`, `app.session.js` + `V110` |
| M3 | Chairperson money-movement authority | ✅ done (rescoped) | `loan/LoanController.java`, `SaccoBackendApplicationTests.java` + `V111` |
| L1 | Non-constant-time password compare | ✅ done | `security/PasswordHasher.java` |
| L2 | Actuator exposure | ✅ done (app-level; port isolation left as commented recommendation) | `application-prod.properties` |
| L3 | Dead permission | ✅ done | `V112` |

### Exact file manifest (this pass only)

**New files**
- `backend-java/src/main/java/com/methaltech/sacco/config/AuthenticationGuardFilter.java`
- `backend-java/src/test/java/com/methaltech/sacco/config/AuthorizationCoverageTest.java`
- `backend-java/src/main/resources/db/migration/V109__audit_view_permission.sql`
- `backend-java/src/main/resources/db/migration/V110__welfare_membership_permissions.sql`
- `backend-java/src/main/resources/db/migration/V111__chairperson_transfer_disbursement_removal.sql`
- `backend-java/src/main/resources/db/migration/V112__remove_dead_savings_transfer_manage.sql`
- `docs/security-review-rbac-2026-08-26.md` (this document)

**Modified files**
- `backend-java/.../branch/BranchController.java`
- `backend-java/.../identity/AuditController.java`
- `backend-java/.../finance/WelfareClaimController.java`
- `backend-java/.../member/MemberSubscriptionController.java`
- `backend-java/.../loan/LoanController.java`
- `backend-java/.../security/PasswordHasher.java`
- `backend-java/src/main/resources/application-prod.properties`
- `backend-java/src/test/java/com/methaltech/sacco/SaccoBackendApplicationTests.java`
- `app.navigation.js`, `app.session.js`

### Migration reference
- **V109** `audit:view` → Platform Super Admin, Platform Admin, Compliance Officer, SACCO Admin, Auditor.
- **V110** `welfare:view/manage`, `member-subscription:view/manage` — welfare view also to Treasurer/Accountant (for disbursement); manage to Admin/Secretary; member-subs to Admin/Treasurer/Secretary.
- **V111** new `loans:disburse` (Admin, Treasurer); `savings-transfer:approve` added to Treasurer + Secretary; removed Chairperson's `savings-transfer:*`.
- **V112** removed dead `savings-transfer:manage`.

### Verification checklist for the dev machine
1. `cd backend-java && ./mvnw test` — full suite (AuthorizationCoverageTest gates default-deny coverage; the M3 rewrites touched money-movement dual-control tests).
2. Smoke-test logins per role against the new permission map (Secretary→Welfare, Treasurer→Member-Subs + transfer approval + disburse, Chairperson no longer approves transfers/disburses).
3. Confirm the SPA menus match (Welfare/Member-Subscriptions/Transfers visibility per role).
