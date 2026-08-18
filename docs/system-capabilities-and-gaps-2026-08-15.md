# Tereka Online — System Capabilities & Gaps Review

**Date:** 15 August 2026
**Scope:** Full platform — backend (Spring Boot), frontend SPA, database, integrations, operations.
**Purpose:** An honest, current snapshot of what the system does and where the gaps are.

> **Build state (verified against the repo today).** 61 Flyway migrations; **272** backend main
> classes and **47** test classes; **56** classic frontend modules plus **26 typed `src/**/*.ts`**
> modules; **Vite and TypeScript are installed**; ~30 files uncommitted. Readiness gates now include
> `type:check`, `ha:redis-check`, `ha:evidence`, `provider:sandbox-check`, and `vite:evidence`.

---

## 1. Executive summary

Tereka Online is a capable multi-SACCO platform with strong domain foundations and a steadily maturing
engineering posture. Since the last review it has: begun a real Vite + TypeScript frontend migration
(typed source modules behind classic-script bridges), added **per-SACCO collection accounts** (each
SACCO collects into its own mobile-money/bank accounts — no platform float), Redis-backed HA
primitives with evidence scripts, and a mobile-money sandbox readiness gate.

It is solid for a **supervised pilot** and continuing to close the enterprise-operation gaps. The
remaining blockers are: finishing the frontend build/TS migration, proving HA under load/failover,
and getting mobile money production-live (merchant onboarding).

Readiness: **~82% for a supervised pilot; ~63% for unattended enterprise operation.**

---

## 2. Current capabilities

### Platform & SACCO management
- Multi-SACCO model with mandatory SACCO scoping; self-registration, review/approval, activation,
  suspension; branch-aware operations; subscription packages, tiered billing, payment-driven activation.

### Identity & security
- Hashed, expiring, revocable session tokens (PBKDF2); RBAC with platform/SACCO roles, tenant + branch
  isolation; MFA, password reset, failure-based lockout, audit trail, security headers.
- HMAC-verified callbacks, per-IP rate limiting, correlation IDs, scheduled cleanup of expired auth data.

### Members, savings & loans
- Registration, KYC, directory, contacts/beneficiaries/documents/statements; member self-service portal
  (balances, deposits, receipts, loans, payments, notifications, privacy requests, guarantors, chat).
- Loan application, appraisal, guarantors, disbursement, repayment schedules, arrears aging, approval.

### Financial integrity
- Double-entry ledger, accounting periods with close enforcement; maker-checker on transactions;
  immutable posted transactions with reversals; member mobile-money deposits and loan repayments
  require treasurer approval before crediting; reconciliation, callback queue, receipt evidence.

### Payments & mobile money
- Real adapters (MTN, Airtel, M-Pesa) + demo; **collection mode per SACCO** (NONE / MOBILE_MONEY_ONLY /
  BANK_ONLY / BOTH), platform-controlled and SACCO-activated, service-layer enforced.
- **Provider routing by network** (MTN + Airtel active together); member tiles filtered to configured
  providers; M-Pesa hidden by product decision.
- **Per-SACCO collection accounts (new):** SACCO admins register their own MoMo numbers/merchant codes
  and bank accounts; members pay into them directly; platform has a read-only view. Funds never pool in
  a platform account (keeps the platform a record-keeper, not a licensed payment operator).
- Bank collection: member reference/draft flow + SACCO staff single-line and batch statement import with
  row-level validation; real bank API integration still pending.

### Communication, operations & delivery
- WhatsApp-style chat (member↔SACCO, SACCO↔platform); SMS/email with delivery logging, retry, status.
- Flyway parity (H2 dev / PostgreSQL prod), CI with release gate, backup-restore rehearsal, Docker/Caddy.
- Prometheus metrics, Resilience4j circuit breakers + idempotent-only retries + bounded timeouts,
  pagination/search/sort on high-volume endpoints, curated OpenAPI (incl. collection-mode endpoints).
- **HA primitives:** Redis-backed rate-limit and idempotency reservation stores, Docker Redis smoke
  check, `ha:evidence` recording.

### Frontend
- 56 classic modules + **26 typed `src/**/*.ts`** modules; **Vite + TypeScript installed**; incremental
  migration underway (typed domain models behind classic bridges, `type:check`/`vite` scripts).
- `build:ui` produces a validated `dist/`; production UI hides dev/source panels.

---

## 3. Gaps

### High
- **Frontend build/TS migration is in progress, not finished.** Vite + TypeScript are installed and
  many domain models are typed, but runtime modules are still loaded as classic global-scope scripts;
  the fully bundled/tree-shaken/typed ES-module output is not yet the served artifact.
- **HA proven in primitives, not in practice.** Redis-backed shared state + evidence scripts exist, but
  a captured load/soak run and a two-instance failover rehearsal (with RTO/RPO) are still needed.
- **Mobile money not production-live.** Adapters, routing, per-SACCO accounts, and a sandbox readiness
  gate exist, but real collection needs MTN/Airtel merchant/KYC onboarding and live callback validation.

### Medium
- **Frontend runtime tests.** Helper/type checks are growing; a component/DOM test framework over the
  live UI is still thin.
- **Data protection & regulation.** Evidence (privacy requests, consent, masking, retention) exists;
  policy completion + external review remain (note: SACCO/BoU licensing is the SACCOs' burden, not the
  platform's, given the no-float design).
- **Bank collection real integration**, i18n depth, accessibility audits, managed secrets (Vault/KMS),
  DB pool/query tuning under load.

### Low
- Legacy Node prototype still tracked; repo hygiene (`.idea/`, stray logs); commit the ~30 pending files.

---

## 4. Suggested next steps

1. **Finish the Vite/TS migration** — convert runtime modules to ES `import`/`export`, serve the bundled
   `dist`, drop the classic `<script>` list.
2. **Capture HA evidence** — run load/soak + a two-instance failover rehearsal against Redis; record RTO/RPO.
3. ~~**Reconciliation to per-SACCO accounts** — auto-match imported statement lines / callbacks to the
   specific SACCO collection account and member reference.~~ **Done (2026-08-15):** the reconciliation
   response now annotates each statement line with the SACCO collection account whose account number
   appears in its reference/description, and each mobile-money callback with the account whose network
   matches the callback provider; both surface in the accounting reconciliation UI. Staff can also
   confirm or override the suggestion, which persists the destination account on the line/callback
   (V62, `PATCH .../collection-account`, tenant-isolated, audited).
4. **Mobile-money production** — complete MTN/Airtel merchant onboarding; go live per SACCO.
5. **Frontend runtime tests, data-protection policy sign-off, secrets management, i18n/a11y.**
