# Tereka Online â€” System Capabilities & Gaps Review

**Date:** 28 July 2026
**Scope:** Full platform â€” backend (Spring Boot), frontend SPA, database, integrations, operations.
**Purpose:** An honest snapshot of what the system does today and where the gaps are.

> **Read this first â€” build state update, 7 August 2026.** The previously unbuilt backend and frontend
> backlog has now been compiled and tested with `npm.cmd run check`. The check includes JavaScript
> syntax checks, UI contract checks, import workbook checks, and the Java test suite. Current verified
> Java result: 219 tests passed, 0 failures, 0 errors. The highest-volume tables now use backend
> paging, search, and allowlisted sorting for members, transactions, loans, notifications, and audit
> events.

---

## 1. Executive summary

Tereka Online is a capable multi-SACCO operating platform with strong domain foundations: multi-tenant
isolation, role-based access, a double-entry ledger, maker-checker financial controls, real
mobile-money adapters, and a growing operational toolset (metrics, resilience, rate limiting). It is
suitable for a **supervised pilot** today. It is **not yet** ready for unattended, at-scale enterprise
operation, chiefly because of a monolithic frontend, a thin automated-test base relative to surface
area, and several operational/compliance items that remain open.

Readiness: **~70% for a supervised pilot; ~50% for unattended enterprise operation.**

---

## 2. Current capabilities

### Platform & tenancy
- Multi-tenant ("multi-SACCO") model with mandatory tenant scoping on data and queries.
- SACCO self-registration, platform review/approval, activation, suspension.
- Branch-aware operations and per-SACCO configuration (currency, locale, package).
- Subscription packages, tiered billing, invoices, and payment-driven activation.

### Identity & security
- Hand-rolled authentication with hashed, expiring, revocable session tokens (PBKDF2, 210k iterations).
- Role-based access control with a documented role/permission matrix; branch and tenant isolation.
- MFA challenges, password reset, failure-based login lockout, full audit trail.
- Platform security policy, demo-seed sanitizer, bootstrap-admin provisioning.
- Security headers, HMAC-verified mobile-money callbacks (fail-closed in production).
- **Recently added:** per-IP rate limiting (MFA/password-reset, member payments, callbacks),
  per-request correlation IDs, and a scheduled purge of expired sessions/MFA/reset tokens.

### Members & savings
- Member registration, KYC statuses, member directory, profile editing.
- Savings, shares, and welfare products; balances maintained with `BigDecimal`.
- Member self-service portal (balances, statements, receipts, loans, payments, support chat).

### Financial integrity
- Double-entry chart of accounts, journal and ledger lines.
- Maker-checker approval on financial transactions; immutable posted transactions with reversals.
- **Recently added:** member mobile-money deposits **and** loan repayments now enter the approval
  queue (pending) and only credit balances once a treasurer approves â€” the maker (system) cannot
  self-approve.
- Accounting periods with close enforcement; reconciliation and a callback operations queue.

### Loans
- Loan application, appraisal/credit queue, guarantor workflow, disbursement, repayment schedules.
- Repayment recording and, now, maker-checker approval of mobile-money repayments.

### Payments & mobile money
- Real provider adapters: MTN MoMo, Airtel Money, M-Pesa Daraja (plus a demo provider).
- Member-initiated payment requests, provider callbacks, status polling, idempotency by reference.
- **Recently added:** platform-controlled **collection mode per SACCO** (NONE / MOBILE_MONEY_ONLY /
  BANK_ONLY / BOTH), SACCO-admin activation of allowed methods, and service-layer enforcement at
  member initiation and treasurer confirmation.
- **Recently added:** provider **routing by network**, so MTN and Airtel can be active at the same
  time (selected per payment).

### Communication & support
- WhatsApp-style chat: memberâ†”SACCO admin and SACCO adminâ†”platform support, with notifications.
- SMS (AfroSMS) and email (Gmail SMTP) providers with delivery logging, retry, provider status.

### Operations & delivery
- Flyway migrations (54), H2-for-dev / PostgreSQL-for-prod parity, no `ddl-auto` in prod.
- GitHub Actions CI (checks + PostgreSQL/browser release gate), backup-restore rehearsal, production
  readiness gate that blocks weak secrets.
- Docker + dev/prod compose, Caddy edge with TLS and security headers.
- **Recently added:** Prometheus metrics + JVM/HTTP/DB instrumentation (kept internal to the network);
  Resilience4j circuit breakers and idempotent-only retries plus bounded HTTP timeouts on provider
  calls; opt-in pagination on the highest-volume list endpoints; a curated OpenAPI spec.

---

## 3. Gaps

### Critical
- **Monolithic frontend.** **Substantially reduced on 7 August 2026.** The former single-file SPA has
  been decomposed into focused classic-script modules (`app.i18n.js` for translations, `app.core.js` for shared constants,
  data lookup, regional formatting and utility helpers, `app.api.js` for API/network and pagination
  helpers, `app.tables.js` for reusable table rendering, `app.auth.js` for login/public-auth panels,
  `app.ui.js` for shared UI rendering primitives, `app.member.js` for member self-service rendering,
  `app.member-admin.js` for member administration/KYC/statement rendering, `app.platform.js` for platform dashboard
  rendering, `app.sacco.js` for SACCO staff dashboard rendering, `app.registration.js` for
  SACCO registration/onboarding/detail rendering, `app.billing.js` for subscription/billing rendering,
  `app.users.js` for platform/SACCO user-management rendering, `app.reporting.js` for
  reports/audit rendering, `app.complaints.js` for complaint/chat rendering and chat actions,
  `app.notifications.js` for notification delivery/template rendering, and `app.transactions.js`
  for transaction/receipting rendering, `app.loans.js` for loan/guarantor workflow rendering,
  `app.approvals.js` for maker-checker approval rendering and decision handlers, and
  `app.sacco-finance.js` for savings/shares/welfare product and account rendering, and
  `app.accounting.js` for accounting, asset capture and reconciliation rendering, and
  `app.governance.js` for governance meeting and resolution rendering, and `app.settings.js`
  for SACCO/platform settings and collection-mode rendering/actions, and `app.operations.js` for
  operations/provider-risk/login-risk rendering, and `app.shell.js` for the application chrome,
  role-based navigation, quick search, topbar menus and session notices, and `app.session.js` for
  startup, login, MFA, password reset, session restore, data refresh, logout and current-user
  security actions, and `app.platform-actions.js` for platform users, SACCO onboarding,
  package setup, subscriptions and platform security policy actions, and
  `app.member-admin-actions.js` for SACCO member creation, profile loading, statement export,
  KYC/status decisions and profile updates, and `app.finance-actions.js` for transaction
  capture, receipts, reversals, loan applications, guarantors, decisions, disbursement and
  repayments, and `app.member-actions.js` for member self-service loans, mobile-money payments,
  offline drafts, guarantor decisions and member notification acknowledgements, and
  `app.sacco-actions.js` for branch setup, products, financial accounts, welfare claims,
  expenses, assets and governance actions, and `app.interactions.js` for complaints,
  notifications, quick-search activation, server table paging/search and DOM event binding,
  `app.state.js` for runtime state, and `app.navigation.js` for role module definitions plus
  navigation bridge helpers). `app.js` is now only the browser bootstrap. Remaining work is to move
  from classic scripts to a modern bundled component/test structure and add component-level tests.
- **Thin automated tests relative to surface.** **Started on 7 August 2026.** Coverage is still dominated
  by large integration checks, but the frontend now has a focused enterprise role-smoke script
  (`npm.cmd run ui:role-smoke`) for the login gateway, Platform Super Admin, SACCO Admin, and member
  portal paths. Remaining work is to grow this into a proper test pyramid with component-level tests,
  targeted service/domain tests for the older backend areas, and a coverage floor in CI.
- **Unbuilt change backlog.** **Closed on 7 August 2026.** `npm.cmd run check` passes, including the
  Java suite with 219 tests passing.

### High
- **Frontend still fetches whole collections.** **Closed for the highest-volume screens on 7 August
  2026.** Members, transactions, loans, notifications, and audit events now use backend page
  parameters plus table-driven search and allowlisted sorting. Lower-volume screens can stay
  client-rendered until real usage shows they need the same treatment.
- **No horizontal-scale / HA proof.** **Started on 7 August 2026.** `docs/high-availability.md` now defines single-node vs multi-instance deployment, RPO/RTO targets, Redis shared-state requirements, load/soak evidence, and failover rehearsal steps. Production properties now expose `SACCO_EXPECTED_BACKEND_INSTANCES`, `SACCO_RATE_LIMIT_STORE`, and `SACCO_REDIS_URL`, and `ScaleReadinessValidator` blocks declaring more than one backend instance without Redis scale configuration. Remaining work is live Redis wiring plus hosted multi-instance load/failover proof.
- **Mobile money is not production-live.** Adapters and routing exist, but real collection to live
  numbers needs MTN/Airtel **merchant onboarding (KYC)**; sandbox only simulates. Provider credentials
  are also platform-wide (one MTN account), not per-SACCO.
- **Data protection & regulatory alignment** (Uganda DPA 2019; BoU/UMRA supervision): **Started on 7 August 2026.** Member list/search responses now mask phone, email, and national ID values (`privacyScope=summary_masked`), while authorized member detail responses keep full editable data (`privacyScope=detail_full`). Members can update privacy notice, SMS, email, mobile-money, and provider data-sharing consent from the member portal, and each change is audited as `member_privacy_consent`. `docs/data-protection.md` now defines sensitive data classes, consent, retention, subject-access, role access, and remaining encryption obligations. Remaining work is at-rest encryption for high-risk identifiers, retention/erasure workflows, and regulator-ready reports.

### Medium
- **Internationalization breadth** — **Foundation expanded on 7 August 2026.** The SPA now has a
  translation catalog, persisted locale selector, document `lang`/`dir` application, and supported
  locale choices for English, French, Swahili, Portuguese, Arabic/RTL, and Amharic. Remaining work is
  professional full-string translation beyond the English/French catalogs, plus local review for
  SACCO/legal terminology in each market.
- **Accessibility foundation** — **Started on 7 August 2026.** Login and authenticated shells now include
  skip links, named navigation, current-page state, accessible topbar menu labels, and visible keyboard
  focus styling. Remaining work is a full WCAG AA pass with keyboard journeys, form-error announcements,
  color-contrast evidence, and screen-reader review on the highest-volume workflows.
- **Secrets management** — **Runbook and repo guard added on 7 August 2026.** Secrets are environment-backed,
  production startup fails on weak core secrets/provider config, `docs/secrets-management.md` defines storage
  and rotation procedures, and `scripts/check-secrets-management.mjs` scans deployment examples for
  real-looking secret values. Remaining hosted-deployment work is wiring a managed secret store such as
  Vault, cloud KMS/Secrets Manager, or the platform encrypted environment store.
- **Bank collection member flow** — **Closed on 7 August 2026.** When bank collection is active,
  members now see a bank collection workspace that prepares a bank reference, supports saving bank
  drafts, and explains office receipting. `BOTH` mode also shows bank collection guidance beside
  mobile-money self-service.
- **Per-network UI filtering** — **Closed on 7 August 2026.** The member dashboard now receives a
  safe `paymentProviders` list from the Java backend, the member payment form renders only available
  provider options, and demo/default mode shows a generic Mobile money option instead of hard-coded
  MTN/Airtel tiles. M-Pesa remains hidden by product decision.
- **DB/connection-pool tuning** — **Pool defaults closed on 7 August 2026.** Production now has explicit
  HikariCP settings for max pool size, minimum idle, timeouts, max lifetime and leak detection, plus
  `docs/database-performance.md` and `scripts/check-db-tuning.mjs`. Remaining work is empirical N+1,
  index, slow-query and load review against real SACCO-sized datasets.

### Low
- **Legacy Node prototype** â€” **Production fate decided on 7 August 2026.** `server.mjs` remains the
  SPA host and Java API proxy. The legacy `backend/*.mjs` API is retained only for local development/demo
  use; in `NODE_ENV=production`, `/api/v1` now requires `JAVA_API_BASE` unless
  `SACCO_NODE_API_ENABLED=true` is deliberately set.
- **Repo hygiene** â€” **Closed on 7 August 2026.** Local IDE metadata, generated logs, and temporary
  run logs are now ignored (`.idea/`, `logs/`, `*.log`, `tmp-*.log`).
- **OpenAPI is curated by hand** â€” **Admin collection-mode gap closed on 7 August 2026.** The curated
  contract now documents SACCO administration endpoints for listing/creating SACCOs, status updates,
  platform-approved collection mode (`NONE`, `MOBILE_MONEY_ONLY`, `BANK_ONLY`, `BOTH`), and SACCO
  collection activation settings. Remaining OpenAPI work is to keep future admin surfaces in sync.

---

## 4. Suggested next steps (sequenced)

1. **Frontend modularization**: continue extracting API, table, auth, member portal, platform portal,
   and SACCO portal modules behind a build toolchain.
2. **Scale/resilience proof**: live Redis-backed cache/rate-limit state, hosted multi-instance load
   testing, and DR/failover rehearsal evidence.
3. **Mobile-money production**: complete MTN/Airtel merchant onboarding; consider per-SACCO provider
   credentials if SACCOs need separate settlement accounts.
4. **Compliance & inclusion**: data-protection alignment, secrets management, then i18n and accessibility.

---

## 5. Definition of "enterprise-ready" for Tereka

A SACCO can be onboarded and run unattended when: financial postings are provably correct and audited
(**largely met**); the platform emits metrics/traces and survives provider outages (**now largely
met, pending build**); it is documented, rate-limited, paginated end-to-end, and load-tested for many
tenants (**partly met**); the frontend and tests can be evolved safely by a team (**not met**); and
data handling satisfies Ugandan regulation (**partly met**). The domain is strong; the remaining work
is engineering-scale and operational maturity.
