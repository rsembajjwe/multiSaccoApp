# Tereka Online — System Capabilities & Gaps Review

**Date:** 8 August 2026
**Scope:** Full platform — backend (Spring Boot), frontend SPA, database, integrations, operations.
**Purpose:** An honest, current snapshot of what the system does and where the gaps are.

> **Build state (verified).** The backend compiles and the Java suite passes — **248 tests, 0
> failures**. The frontend has been decomposed from a single ~10,000-line file into **35 focused
> script modules** (`app.js` is now a 5-line entry point). JavaScript syntax checks and the UI
> contract check pass. A `build:ui` artifact step now validates the SPA asset graph and writes a
> releaseable `dist/` folder. A no-dependency frontend helper test covers shared table search,
> pagination, escaping, row actions, empty states, login fields, platform/SACCO/member role routing,
> session labels, Super Admin-only platform user-management controls, member payment route rendering,
> MFA handoff, password-reset-required routing, member/staff token isolation, logout cleanup,
> SACCO registration/onboarding fields, SACCO member-management forms/detail tabs/statements, and
> SACCO finance/payment workflows including receipting, payment requests, monthly performance,
> reconciliation action lists, SACCO loan application/guarantor/repayment-schedule workflows, and
> arrears aging buckets, shares product/account/register workflows, welfare claim submission/decision/payment readiness,
> accounting expense/asset/journal/setup/register workflows, SACCO settings/collection controls,
> governance meetings/resolutions, WhatsApp-style SACCO/member/platform chat, notification templates,
> audit evidence, staff payment exception alert rendering, and import workbook template/header/sample
> row/guidance-sheet integrity. Backend role tests now explicitly verify SACCO staff boundaries
> for Chairperson, Secretary, Treasurer, SACCO Administrator, platform-user management
> permissions, explicit audit-event creation permissions, protected SACCO Administrator-only
> staff access management, and branch-manager scope for member, transaction, loan, repayment and
> accounting journal, regulatory report, audit-log, member complaint, member support chat and governance access.
> Note: a large working set is **uncommitted** — it should be committed in focused commits.

---

## 1. Executive summary

Tereka Online is a capable multi-SACCO operating platform with strong domain foundations and a
maturing engineering posture. Since the last review it has: modularized the frontend, added
platform-controlled collection modes, multi-provider mobile-money routing, observability, resilience,
rate limiting, and end-to-end pagination/search — all now building and passing tests.

It is solid for a **supervised pilot** and materially closer to enterprise operation. The remaining
blockers to unattended, at-scale running are: frontend build maturity/tests, unproven horizontal
scale/HA, mobile-money not yet production-live, and open compliance/inclusion items.

Readiness: **~78% for a supervised pilot; ~58% for unattended enterprise operation.**

---

## 2. Current capabilities

### Platform & tenancy
- Multi-tenant ("multi-SACCO") model with mandatory tenant scoping on data and queries.
- SACCO self-registration, platform review/approval, activation, suspension.
- Branch-aware operations and per-SACCO configuration (currency, locale, package).
- Subscription packages, tiered billing, invoices, and payment-driven activation.

### Identity & security
- Hand-rolled auth with hashed, expiring, revocable session tokens (PBKDF2, 210k iterations).
- RBAC with a documented role/permission matrix; branch and tenant isolation.
- MFA, password reset, failure-based login lockout, full audit trail.
- Platform security policy, demo-seed sanitizer, bootstrap-admin provisioning, security headers.
- HMAC-verified mobile-money callbacks (fail-closed in production).
- Per-IP rate limiting (MFA/password-reset, member payments, callbacks), per-request correlation IDs,
  and a scheduled purge of expired sessions/MFA/reset tokens.

### Members, savings & loans
- Member registration, KYC, directory, profile editing; savings/shares/welfare with `BigDecimal`.
- Member self-service portal (balances, statements, receipts, loans, payments, support chat).
- Loan application, appraisal, guarantor workflow, disbursement, repayment schedules.

### Financial integrity
- Double-entry chart of accounts, journal and ledger lines; accounting periods with close enforcement.
- Maker-checker approval on financial transactions; immutable posted transactions with reversals.
- Member mobile-money **deposits and loan repayments now require treasurer approval** before crediting;
  the system maker cannot self-approve. Reconciliation and a callback operations queue.

### Payments & mobile money
- Real adapters: MTN MoMo, Airtel Money, M-Pesa Daraja (plus a demo provider).
- **Collection mode per SACCO** (NONE / MOBILE_MONEY_ONLY / BANK_ONLY / BOTH), platform-controlled,
  SACCO-activated, enforced in the service layer at member initiation and treasurer confirmation.
- **Provider routing by network**, so MTN and Airtel can be active simultaneously (chosen per payment).
- Member payment requests, provider callbacks, status polling, idempotency by reference.

### Communication & support
- WhatsApp-style chat: member↔SACCO admin and SACCO admin↔platform support, with notifications.
- SMS (AfroSMS) and email (Gmail SMTP) with delivery logging, retry, provider status.

### Operations & delivery
- Flyway migrations (60), H2-for-dev / PostgreSQL-for-prod parity, no `ddl-auto` in prod.
- GitHub Actions CI (checks + PostgreSQL/browser release gate), backup-restore rehearsal, production
  readiness gate that blocks weak secrets; Docker + dev/prod compose; Caddy edge with TLS.
- Prometheus metrics (JVM/HTTP/DB, internal-only), Resilience4j circuit breakers + idempotent-only
  retries + bounded HTTP timeouts on provider calls, opt-in pagination/search/sort on the
  highest-volume endpoints, and a curated OpenAPI spec.

### Frontend
- Decomposed into 35 cohesive script modules by concern (i18n, core utils, api, tables, auth, shell,
  session, per-portal rendering, per-domain actions, interactions). `app.js` is a thin entry point.
- `npm run build:ui` produces a validated `dist/` artifact containing the SPA entrypoint, styles,
  manifest/service worker, favicon, and all referenced script modules.

---

## 3. Gaps

### High
- **Frontend build maturity is partial.** The SPA now has a validated `dist/` artifact step, but the
  modules are still classic scripts sharing global scope, loaded via many `<script>` tags — no Vite
  bundler, ES modules, minification, tree-shaking, or type safety. *Next: introduce Vite when npm
  registry access is stable, then convert modules to `import`/`export` incrementally.*
- **Frontend tests are early.** Backend tests are strong (248 passing), and the no-dependency UI
  helper test now covers shared table rendering, login-field requirements, MFA handoff,
  password-reset-required routing, member/staff token isolation, logout cleanup, member payment route
  visibility, platform/SACCO/member route separation, session labels, Super Admin-only platform
  user-management controls, SACCO registration/onboarding fields, SACCO member-management
  forms/detail tabs/statements, SACCO finance/payment workflows, reconciliation action lists, and
  SACCO loan application/guarantor/repayment-schedule/arrears-aging workflows, shares, welfare, accounting,
  SACCO settings, governance, chat, notifications, audit evidence, and payment exception alerts.
  Import workbook checks now verify generated template sheets, headers, sample rows, and guidance
  sheets. Browser/UAT scripts cover the main Java-backed screens, SACCO admin member-management tabs,
  editable member profile controls, WhatsApp-style SACCO/member/platform chat panels, member monthly
  savings/payment/message tabs, and the visible statement export path.
  Coverage is still thin for the ~11k lines of UI logic. *Next: add more unit coverage around
  auth/session state transitions and additional high-risk staff workflows; move to Vitest once
  package installation is stable.*
- **Horizontal scale / HA unproven.** Single-node assumptions, no distributed cache/session store
  (Redis), no load/soak testing, no documented RTO/RPO or failover rehearsal.
- **Mobile money not production-live.** Adapters and routing exist, but real collection needs MTN/Airtel
  **merchant onboarding (KYC)**; sandbox only simulates. Provider credentials are platform-wide, not
  per-SACCO.

### Medium
- **Large uncommitted working set (~160 files).** Should be committed in focused commits to protect the
  work and restore a clean history.
- **Test pyramid still integration-weighted.** Good end-to-end coverage; thinner focused service/domain
  units outside recently changed areas.
- **Data protection & regulation** (Uganda DPA 2019; BoU/UMRA): encryption at rest, PII
  retention/consent, and regulator-facing reporting not yet evidenced.
- **Internationalization depth.** A message catalog now exists (English + French scaffold), but most UI
  strings and coverage for regional languages (Luganda/Swahili) are incomplete.
- **Accessibility** is thin (minimal ARIA/roles, unclear keyboard/screen-reader support).
- **Secrets management** is environment-backed (good) but without a managed store/rotation (Vault/KMS).
- **Per-network UI filtering / bank member flow.** The member portal shows MTN and Airtel tiles
  regardless of which are configured (unconfigured network falls back to default); bank collection is
  allow/activate-only with no member-facing self-service flow yet.
- **DB/connection-pool tuning** at defaults; N+1/query review under load not done.

### Low
- **Legacy Node prototype** (`backend/*.mjs`) still tracked alongside the Java backend (note `server.mjs`
  is still the SPA host).
- **Repo hygiene** — `.idea/` not ignored, stray `tmp-*.log` files.
- **OpenAPI is hand-maintained** and covers the integrator-facing surface plus the SACCO collection
  mode/settings controls.

---

## 4. Suggested next steps (sequenced)

1. **Commit** the current verified working set in focused commits.
2. **Frontend build + tests**: keep `build:ui` and `test:ui:unit` in the release gate, add Vite when
   dependency install is available, convert to ES modules incrementally, then grow Vitest coverage.
3. **Scale/resilience proof**: Redis-backed cache/rate-limit state, load testing, DR targets.
4. **Mobile-money production**: complete MTN/Airtel merchant onboarding; consider per-SACCO credentials;
   filter member network tiles to configured providers.
5. **Compliance & inclusion**: data-protection alignment, secrets management, then i18n depth and a11y.

---

## 5. Definition of "enterprise-ready" for Tereka

A SACCO can be onboarded and run unattended when: financial postings are provably correct and audited
(**met**); the platform emits metrics and survives provider outages (**met**); it is documented,
rate-limited, and paginated for many tenants (**largely met**); the frontend is buildable, typed, and
tested and can be evolved safely by a team (**partly met — now modular, with early build/test
coverage**); scale
and HA are proven (**not met**); mobile money is production-live (**not met**); and data handling
satisfies Ugandan regulation (**partly met**). The domain and much of the engineering posture are
strong; the remaining work is build/test maturity, scale proof, and compliance.
