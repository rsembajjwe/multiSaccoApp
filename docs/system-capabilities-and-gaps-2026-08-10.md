# Tereka Online - System Capabilities & Gaps Review

**Date:** 10 August 2026
**Scope:** Full platform - backend (Spring Boot), frontend SPA, database, integrations, operations.
**Purpose:** An honest, current snapshot of what the system does and where the gaps are.

> **Build state (verified).** Backend compiles and the Java suite passes - **248 tests, 0 failures**.
> The frontend is decomposed into **35 script modules** (`app.js` is a 5-line entry point); JS syntax
> checks and the UI contract check pass, and `npm run build:ui` now produces a validated **`dist/`**
> release artifact with one generated classic app bundle. `npm run type:ui` now runs a TypeScript
> `checkJs` pass over the SPA, and `npm run type:src` verifies a strict TypeScript domain module
> under `src/types/domain.ts`. A no-dependency UI helper test covers shared table/search/pagination, MFA handoff,
> password-reset-required routing, member/staff token isolation, logout cleanup, auth routing, and
> per-portal rendering. **61** Flyway migrations. Backend role tests verify SACCO staff boundaries
> plus branch-manager scope for member, transaction, loan, repayment, accounting journal, regulatory
> report, audit-log, member complaint, member support chat and governance access. Note: a large working
> set is still **uncommitted** - it should be committed in focused commits.

---

## 1. Executive Summary

Tereka Online is a capable multi-SACCO operating platform with strong domain foundations and a
maturing engineering posture. Recent work modularized the frontend, added platform-controlled
collection modes, multi-provider mobile-money routing, observability, resilience, rate limiting,
OpenAPI collection-mode coverage, data-protection evidence, and end-to-end pagination/search - all
now building and passing tests.

It is solid for a **supervised pilot** and materially closer to enterprise operation. The remaining
blockers to unattended, at-scale running are frontend build/test maturity, unproven horizontal
scale/HA, production-live mobile-money onboarding, and deeper compliance/inclusion work.

Readiness: **about 80% for a supervised pilot; about 60% for unattended enterprise operation.**

---

## 2. Current Capabilities

### Platform & SACCO Management

- Multi-SACCO model with mandatory SACCO scoping on data and queries.
- SACCO self-registration, platform review/approval, activation, suspension.
- Platform-created SACCO registration with auto-generated SACCO code, location details, contact
  number, member range, package, and payment-status driven activation.
- Branch-aware operations and per-SACCO configuration for currency, locale, package, and collection
  channels.
- Subscription packages, tiered billing, invoices, and payment-driven activation.

### Identity & Security

- Hand-rolled auth with hashed, expiring, revocable session tokens using PBKDF2.
- Login uses SACCO/platform code plus username/email/phone/membership number and password.
- RBAC with platform roles, SACCO roles, permission matrix, tenant isolation, and branch isolation.
- MFA, password reset, failure-based login lockout, audit trail, security headers, demo-seed
  sanitizer, and bootstrap-admin provisioning.
- Secrets evidence scans deployment examples for real-looking secret values and records the
  production secret/provider readiness contract under `reports/secrets-evidence/`.
- HMAC-verified mobile-money callbacks, per-IP rate limiting, request correlation IDs, and scheduled
  cleanup of expired sessions/MFA/reset tokens.

### Members, Savings & Loans

- Member registration, KYC, directory, profile editing, contacts, beneficiaries, documents, statements.
- Member self-service portal for balances, monthly savings/deposits, receipts, loans, payments,
  notifications, privacy requests, guarantor requests, and support chat.
- Loan application, appraisal, guarantor workflow, disbursement, repayment schedules, arrears aging,
  and repayment approval.

### Financial Integrity

- Double-entry chart of accounts, journal and ledger lines, accounting periods, and close enforcement.
- Maker-checker approval on financial transactions; immutable posted transactions with reversals.
- Member mobile-money deposits and loan repayments require treasurer approval before crediting; the
  system maker cannot self-approve.
- Reconciliation, callback queue, payment requests, payment exception alerts, and receipt evidence.

### Payments & Mobile Money

- Real adapters: MTN MoMo, Airtel Money, M-Pesa Daraja, plus demo provider.
- Collection mode per SACCO: `NONE`, `MOBILE_MONEY_ONLY`, `BANK_ONLY`, `BOTH`.
- Platform controls what a SACCO is allowed to use; SACCO activates only allowed channels.
- Provider routing by network so MTN and Airtel can be active simultaneously.
- Member-facing provider tiles are filtered from backend provider options; M-Pesa remains hidden by
  product decision.
- Bank collection has SACCO-owned mobile-money/bank collection account setup, member-visible
  "pay directly to your SACCO" instructions, member reference/draft flow, and SACCO staff
  single-line/batch statement import with row-level validation for reconciliation; real bank API
  integration is still pending.

### Communication & Support

- WhatsApp-style chat for member-to-SACCO admin and SACCO admin-to-platform support.
- Platform receives complaints from SACCO admins; SACCO admins receive complaints from SACCO members.
- SMS via AfroSMS and email via Gmail SMTP with delivery logging, retry, provider status, and
  operational evidence.

### Operations & Delivery

- Flyway migrations, H2-for-dev / PostgreSQL-for-prod parity, no `ddl-auto` in prod.
- GitHub Actions CI, PostgreSQL/browser release gate, backup-restore rehearsal, production readiness
  checks, Docker/dev/prod compose, and Caddy edge with TLS. `npm.cmd run backup:evidence` now writes
  timestamped restore evidence; the 10 August 2026 run restored
  `backups\rehearsals\sacco_app_backup_rehearsal-20260810-161957.dump` successfully.
- Prometheus metrics, Resilience4j circuit breakers, idempotent-only retries, bounded provider HTTP
  timeouts, pagination/search/sort on high-volume endpoints, and curated OpenAPI documentation.
- A load evidence wrapper now captures `npm.cmd run load:test` output as timestamped release
  evidence under `reports/load-evidence/`, using the current SACCO-code login contract. A local
  baseline on 10 August 2026 completed 100 requests at concurrency 10 with 0 failures, 258.37 req/s,
  p95 93.1 ms, and p99 135.0 ms against the Java backend.
- A database evidence wrapper now records the production HikariCP pool contract, small-server tuning
  guidance, and HA recovery-target markers under `reports/db-evidence/`.
- Production multi-instance startup is guarded by Redis scale settings for rate limits,
  idempotency/shared hot keys, and Redis connectivity. The request rate limiter now has an explicit
  store boundary plus a Redis-backed shared counter implementation for multi-instance deployments.
  Idempotency keys now have matching memory and Redis reservation stores with a configurable TTL,
  wired into mobile-money callbacks and subscription payment references. A Docker-backed Redis smoke
  check now verifies both shared-state primitives against a real Redis container, and `npm.cmd run
  ha:evidence` records the HA contract plus Redis smoke output as timestamped evidence. The latest
  run on 10 August 2026 passed against an isolated `redis:7-alpine` container.

### Frontend

- Decomposed into 35 script modules by concern: i18n, core utilities, API, tables, auth, shell,
  session, per-portal rendering, per-domain actions, and interactions.
- `npm run build:ui` produces a validated `dist/` artifact containing generated entrypoint, styles,
  manifest, service worker, favicon, and one generated `tereka-classic-app.js` bundle made from the
  35 classic source scripts.
- Vite is installed as a dev dependency and `npm run build:vite` emits `dist-vite/` through a bundled
  classic-script bridge: the current 35 source scripts are combined into one generated
  `tereka-classic-app.js` for the Vite output. `npm.cmd run vite:evidence` records the
  readiness/build output as timestamped evidence. The remaining frontend build work is converting the
  classic scripts to real ES `import`/`export` boundaries so Vite can natively bundle, minify, and
  tree-shake the application logic.
- The shared table/search/pagination calculation is now split behind a typed table model in
  `src/tables/tableModel.ts`, with a classic browser bridge in `app.table-model.js` so the current
  SPA keeps running while runtime modules migrate into `src/`. Shared row filtering and table-state
  key generation now live behind the same typed table boundary.
- Shared money/date formatting now follows the same migration pattern through
  `src/formatting/formatters.ts` plus the classic `app.formatters.js` bridge, keeping platform,
  SACCO admin, and member portal amounts and full dates consistent during the TypeScript conversion.
  The same typed formatter boundary now also owns label normalization, sums, status badge classes,
  HTML escaping, and table value formatting.
- Member statement normalization and SACCO/member monthly performance aggregation now live behind
  `src/member/performance.ts` plus `app.member-performance.js`, preserving the classic portal while
  typing the savings, shares, welfare, loan-repayment, Treasurer cash, and mobile-money split logic.
  Member payment lifecycle rows, route labels, payment status, and receipt status are now typed in
  the same source boundary, along with member guarantor, SACCO-admin message, and mobile-money row
  builders, member payment provider filtering, payment request action rows, and offline draft rows.
- SACCO admin member-document rows, KYC retention summaries, statement totals, receipt-ready rows,
  and mobile-money/Treasurer statement split summaries now live behind `src/member/admin.ts` plus
  `app.member-admin-model.js`.
- Transaction row shaping, approval readiness, payment route/status, receipting queue rows, receipt
  register rows, and receipt split summaries now live behind `src/transactions/transactions.ts` plus
  `app.transactions-model.js`, keeping Treasurer/Admin receipting and reversal evidence consistent
  while the classic Transactions screen remains in place.
- Loan row shaping, guarantor readiness, approval readiness, servicing status, portfolio risk counts,
  outstanding principal, and arrears-aging totals now live behind `src/loans/loans.ts` plus
  `app.loans-model.js`, keeping the SACCO credit dashboard and loan list aligned during the
  TypeScript migration.
- Accounting dashboard totals, unbalanced-journal counts, period-close counts, reconciliation
  exception totals, payment request review rows, match rows, and reconciliation coverage now live
  behind `src/accounting/accounting.ts` plus `app.accounting-model.js`.
- SACCO finance summaries for savings, shares, welfare, active products, member balances,
  contribution totals, welfare claim counts, paid welfare amounts, and claim action rows now live
  behind `src/sacco-finance/finance.ts` plus `app.sacco-finance-model.js`.
- TypeScript is installed for the SPA and `npm run type:ui` performs a passing JSDoc/checkJs
  no-emit type check over the classic frontend scripts, using shared declarations for runtime state,
  API errors, legacy DOM event handling, member portal data, payment requests, collection accounts,
  offline drafts, privacy requests, platform/SACCO administration data, subscriptions, roles,
  permissions, audit events, transactions, accounting/setup objects, integration configs, security
  policy summaries, reconciliation data, regulatory reports, complaint/chat messages, and
  quick-search result navigation.
  `npm run type:check` verifies that the important type contracts and global-state wiring remain in
  place. `src/types/domain.ts` now provides a strict TypeScript module boundary for platform, SACCO,
  member, payment, chat, reconciliation, regulatory-report, security, and app-state contracts, with
  `tsconfig.src.json` running in strict mode. `npm run check` runs the classic SPA type gate, contract
  marker gate, and strict source gate in CI, and `npm run type:evidence` records all three checks as
  timestamped release evidence under `reports/type-evidence/`.
  The type gate now also enforces `noImplicitReturns` and `noFallthroughCasesInSwitch`, with JSDoc
  contracts on member payment lifecycle and transaction receipting helpers.
- Production UI hides development/source panels and uses role-specific platform, SACCO, and member
  views.
- i18n evidence now records supported locale metadata for English, French, Swahili, Portuguese,
  Arabic/RTL, and Amharic, plus document `lang`/`dir`, fallback, and RTL CSS markers under
  `reports/i18n-evidence/`.
- Member portal renderer coverage now has a focused `npm run test:member-portal` gate for full-date
  statements, monthly savings/deposit performance, mobile-money/bank payment options, offline
  drafts, WhatsApp-style support chat, and SACCO admin notifications.
- Accessibility evidence now records static checks for skip links, named navigation landmarks,
  current-page state, topbar menu labels, and visible keyboard focus under
  `reports/accessibility-evidence/`.

---

## 3. Gaps

### High

- **Frontend build maturity is partial.** The regular `dist/` build and Vite `dist-vite/` bridge
  build both emit one generated app bundle, but the source modules are still classic scripts sharing
  global scope. The first shared runtime helper now has a typed source model, but there is not yet a
  completed ES module import/export structure, native application-code tree-shaking, or broad
  runtime-module TypeScript conversion.
- **Type safety is materially improved but runtime conversion remains.** A passing TypeScript
  `checkJs` gate covers the classic SPA, and a strict `src/types/domain.ts` module now gives future
  ES-module work a typed domain boundary. Member/payment portal contracts, platform/SACCO
  administration data, operational/configuration report objects, complaint/chat workflows, table
  model state, row filtering, table-state keys, shared money/date formatters, status badges, HTML
  escaping, table value formatting, member statement normalization, and monthly performance
  aggregation, payment lifecycle rows, route labels, payment status, and receipt status are now
  represented in named contracts. Member guarantor, SACCO-admin message, and mobile-money row builders
  are also typed, along with payment provider filtering, payment request rows, and offline draft rows.
  SACCO admin member-document and statement summary builders are now typed too. Transaction row
  shaping, receipting queue, receipt register, and receipt summaries now have the same typed boundary,
  as do SACCO loan rows, portfolio risk summaries, accounting ledger totals, reconciliation review
  rows, and SACCO finance summaries.
  The remaining type-safety work is reducing broad
  compatibility index signatures in the classic declarations and migrating runtime scripts into typed
  ES module source files.
- **Frontend tests are still early but improving.** Backend tests are strong, and the helper suites
  now cover many high-risk renderers, auth/session transitions, and member portal enterprise flows.
  The project still lacks a real component/unit test framework over the large UI surface.
- **Horizontal scale / HA is partly proven.** Single-node assumptions remain. Startup guards now
  require Redis configuration before multi-instance production, request rate limiting has a
  Redis-backed shared counter, and payment idempotency has a Redis reservation store. A Docker-backed
  Redis smoke test passed on 10 August 2026, and a local Java-backed baseline load evidence run also
  passed on 10 August 2026. Backup/restore evidence also passed on 10 August 2026. Live Redis
  deployment, staging load/soak execution, production RTO/RPO evidence, and failover rehearsal are
  still needed.
- **Mobile money is not production-live.** Adapters and routing exist, but MTN/Airtel production use
  requires merchant onboarding/KYC, real credentials, live callback validation, and production
  settlement reconciliation.

### Medium

- **Large uncommitted working set.** Commit in focused commits to protect the work and restore clean
  history.
- **Test pyramid is still integration-weighted.** End-to-end and integration coverage is good, but
  focused service/domain unit coverage should grow outside recently changed areas.
- **Data protection and regulation need deeper evidence.** Current evidence covers privacy requests,
  consent, masking/encryption helpers, and retention/disposal flows; Uganda DPA, BoU, and UMRA
  operating procedures still need policy-level completion and external review.
- **Internationalization depth is incomplete.** Locale and RTL wiring are evidenced for English,
  French, Swahili, Portuguese, Arabic, and Amharic, but Luganda and professional in-country
  translation/QA for broader regional coverage are still needed.
- **Accessibility needs real audits.** Static evidence now covers baseline skip links, landmarks,
  labels, and focus markers; keyboard journeys, screen-reader flows, contrast, focus management, and
  WCAG AA testing still need deeper browser-level validation.
- **Secrets management needs hosted managed-store evidence.** Environment-backed config, placeholder
  scanning, production startup guards, and rotation procedures exist; the remaining work is wiring
  and proving a hosted Vault/KMS/secret-manager integration with operational rotation evidence.
- **Bank collection depth is partial.** SACCO-owned collection account setup, member-facing direct
  payment instructions, reference/draft flow, and reconciliable single-line/batch statement imports
  exist, but real bank API integration and bank notification workflows remain.
- **DB and connection-pool tuning needs load evidence.** Defaults exist, but N+1/query review and
  realistic load testing are not complete.

### Low

- **Legacy Node prototype remains tracked.** `backend/*.mjs` is still present alongside the Java
  backend. `server.mjs` remains useful as the SPA host/proxy.
- **Repo hygiene needs cleanup.** Ignore IDE files and remove stray temporary logs.
- **OpenAPI is hand-maintained.** It now covers the integrator-facing surface plus SACCO collection
  mode/settings controls, but schema-drift checks should continue to grow.

---

## 4. Suggested Next Steps

1. **Commit** the verified working set in focused commits.
2. **Frontend build and tests:** migrate the classic source scripts to ES modules, then add a proper
   component/unit-test framework.
3. **Scale/resilience proof:** use the Redis HA evidence as the baseline, then add load testing,
   live Redis deployment evidence, failover rehearsal, and DR targets.
4. **Mobile-money production:** complete MTN/Airtel merchant onboarding, production credentials,
   callback validation, and settlement reconciliation.
5. **Compliance and inclusion:** complete data-protection operating procedures, secrets rotation,
   i18n depth, and WCAG AA validation.

---

## 5. Enterprise-Ready Definition

A SACCO can be onboarded and run unattended when financial postings are correct and audited
(**met**); metrics, resilience, pagination, and rate limiting are in place (**largely met**); the UI is
buildable, tested, bundled, and evolvable by a team (**partly met**); scale and HA are proven
(**not met**); mobile money is production-live (**not met**); and data handling satisfies Ugandan
regulation with operational evidence (**partly met**).
