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
- Secrets evidence scans deployment examples for real-looking secret values, verifies the 25-name
  production secrets inventory and staging guide coverage, and records the production
  secret/provider readiness contract under `reports/secrets-evidence/`.
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
  checks, Docker/dev/prod compose, and Caddy edge with TLS. `npm.cmd run backup:evidence` now verifies
  the DR runbook contract and writes timestamped restore evidence; the 14 August 2026 run restored
  `backups\rehearsals\sacco_app_backup_rehearsal-20260814-164712.dump` successfully.
- Prometheus metrics, production structured JSON logs with request correlation context, deployable
  Prometheus alert rules, Resilience4j circuit breakers, idempotent-only retries, bounded provider HTTP
  timeouts, pagination/search/sort on high-volume endpoints, and curated OpenAPI documentation.
- A load evidence wrapper now captures `npm.cmd run load:test` output as timestamped release
  evidence under `reports/load-evidence/`, using the current SACCO-code login contract. The harness
  now uses a mixed scenario set covering health, operations status, SACCO account listing,
  subscriptions, platform users, audit events, regulatory reports, and provider operational evidence.
  It enforces p95, p99, timeout, and minimum-throughput thresholds and emits structured scenario
  metrics for release evidence. A refreshed local Java/H2 baseline on 14 August 2026 completed 100
  requests at concurrency 10 with 0 failures, 176.70 req/s, p95 137.8 ms, and p99 306.0 ms against
  `http://127.0.0.1:18084`; the timestamped report is
  `reports/load-evidence/load-evidence-20260814T125818Z.md`. This should still be repeated against a
  PostgreSQL-backed staging clone at higher volumes before production launch.
- A database evidence wrapper now records the production HikariCP pool contract, small-server tuning
  guidance, and HA recovery-target markers under `reports/db-evidence/`.
- Production multi-instance startup is guarded by Redis scale settings for rate limits,
  idempotency/shared hot keys, and Redis connectivity. The request rate limiter now has an explicit
  store boundary plus a Redis-backed shared counter implementation for multi-instance deployments.
  Idempotency keys now have matching memory and Redis reservation stores with a configurable TTL,
  wired into mobile-money callbacks and subscription payment references. A Docker-backed Redis smoke
  check verifies both shared-state primitives against a real Redis container, and `npm.cmd run
  ha:evidence` records the HA contract, Docker engine preflight, and Redis smoke output as timestamped
  evidence. The latest 14 August 2026 report, `reports/ha-evidence/ha-evidence-20260814T135205Z.md`,
  passed against an isolated `redis:7-alpine` container and confirmed Redis-backed shared state for
  rate limits and idempotency.
- Deployment evidence now has a local contract gate. `npm.cmd run deploy:evidence` verifies the
  deployment guide, Hetzner/Caddy runbook, staging environment guide, handoff checklist, release
  evidence template, staging readiness notes, CI gates, and package scripts, then writes timestamped
  release evidence. Hosted preflight is skipped until real staging `.env` or environment variables
  are supplied.
- A release evidence pack command now summarizes the local release contracts across deployment, DR,
  secrets, database tuning, HA, data protection, Vite, i18n, accessibility, and repository hygiene.
  It is intended as a release-owner handoff artifact before heavier hosted evidence and external
  sign-offs.
- The staging handoff checklist is now protected by `npm.cmd run staging:handoff-check`, covering
  required environment, secrets, release-gate, operations, UAT-readiness, and no-unaccepted-P0/P1
  blocker controls.
- The Hetzner CX22 deployment runbook now covers first platform owner bootstrap, bootstrap credential
  rotation, pre-update backup, post-deploy health verification, rollback by previous commit,
  restore-owner evidence, and secret-safe log handling.
- Incident readiness is now guarded by `npm.cmd run incident:check`, which verifies monitoring
  thresholds, Prometheus runbook links, callback/delivery/reconciliation alert coverage, rollback,
  log-capture, restore-owner, and secret-safe escalation controls.
- Repository hygiene is now guarded by `npm.cmd run repo:hygiene`, which verifies ignore rules for
  local logs, environment files, generated builds, backups, reports, IDE files, and temporary files,
  then scans tracked files so those artifacts cannot quietly enter a release commit.

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
  builders, member payment provider filtering, payment request action rows, offline draft rows, and removed classic statement/monthly performance, payment-route/month, payment lifecycle, member row-alias, and unused mobile-money wrappers.
- SACCO admin member-document rows, member status/type/KYC options, KYC retention summaries, statement totals, receipt-ready rows,
  and mobile-money/Treasurer statement split summaries now live behind `src/member/admin.ts` plus
  `app.member-admin-model.js`.
- Transaction row shaping, overview counts, approval readiness, payment route/status, receipting queue rows,
  receipt register rows, and receipt split summaries now live behind `src/transactions/transactions.ts` plus
  `app.transactions-model.js`, with redundant receipting queue/register wrapper helpers removed and keeping Treasurer/Admin receipting and reversal evidence consistent
  while the classic Transactions screen remains in place.
- Loan row shaping, borrower/guarantor option eligibility, product options, guarantor readiness,
  approval readiness, servicing status, portfolio risk counts, outstanding principal, and arrears-aging totals now live behind `src/loans/loans.ts` plus
  `app.loans-model.js`, with the redundant local loan row wrapper removed and keeping the SACCO credit dashboard and loan list aligned during the
  TypeScript migration.
- Accounting dashboard totals, unbalanced-journal counts, period-close counts, expense/asset account
  option filters, asset category options, reconciliation exception totals, payment request review
  rows, match rows, and reconciliation coverage now live behind `src/accounting/accounting.ts` plus
  `app.accounting-model.js`, with redundant payment/reconciliation wrapper helpers removed.
- SACCO finance summaries for savings, shares, welfare, active products, active member option rows,
  member balances, contribution totals, welfare claim counts, paid welfare amounts, and claim action rows now live
  behind `src/sacco-finance/finance.ts` plus `app.sacco-finance-model.js`.
- Notification delivery rows, template rows, template event/channel options, provider job rows, dashboard counts, delivery filters,
  unread acknowledgement IDs, payment exception slices, and login-risk slices now live behind
  `src/notifications/notifications.ts` plus `app.notifications-model.js`, with redundant delivery filter/action wrapper helpers removed.
- Complaint/chat thread rows, open/urgent/in-progress/resolved counts, member/platform split counts,
  complaint category/status options, unread and assignment counts, chat search filtering, participant labels, and avatar initials now
  live behind `src/complaints/complaints.ts` plus `app.complaints-model.js`, with redundant chat row/avatar wrapper helpers removed.
- Governance meeting rows, resolution rows, meeting-detail resolution rows, SACCO staff dropdown
  options, meeting type options, scheduled/completed/open-resolution slices, overdue resolution
  detection, and meeting evidence summaries now live behind
  `src/governance/governance.ts` plus `app.governance-model.js`.
- Regulatory report rows, display data-protection fields, consolidated report totals, exception
  counts, platform reporting dashboard counts, and report catalogue entries now live behind
  `src/reports/reports.ts` plus `app.reports-model.js`.
- Audit row normalization, risk-level classification, category classification, sensitive/high-risk
  queues, category groups, unique actor/SACCO counts, and audit evidence summaries now live behind
  `src/audit/audit.ts` plus `app.audit-model.js`, with the redundant audit normalization wrapper removed.
- SACCO application rows, registration readiness counts, subscription table rows, billing/payment
  access summaries, package-card display rows, SACCO-code generation, registration location parsing,
  approval status options, member-range options, country/currency options, collection-account review rows,
  and shared onboarding/payment stage labels now live behind
  `src/onboarding/onboarding.ts` plus `app.onboarding-model.js`.
  Redundant classic onboarding/payment wrapper helpers have also been removed.
- Platform/SACCO user access rows, access dashboard summaries, role coverage rows, SACCO staff role
  guide rows, permission-matrix rows, role purpose/scope text, and multi-role summary text now live
  behind `src/access/access.ts` plus `app.access-model.js`.
  Redundant role-purpose, role-coverage, and role-summary wrapper helpers have also been removed.
- Member administration status/type/KYC options, KYC readiness, KYC checklist rows, document rows, member detail summary counts, receipt
  evidence summaries, and staff statement export summaries now live behind the existing
  `src/member/admin.ts` plus `app.member-admin-model.js`, with redundant KYC/document wrapper helpers removed.
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
  current-page state, topbar menu labels, assertive auth error announcements, described field
  hints, reduced-motion support, coarse-pointer touch targets, and visible keyboard focus under
  `reports/accessibility-evidence/`. It also runs a Playwright browser journey across login, public
  SACCO registration, platform admin, SACCO admin, and member portal pages where the active profile
  exposes those views.

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
  represented in named contracts, with redundant classic wrappers removed. Member guarantor, SACCO-admin message, and mobile-money row builders
  are also typed, along with payment provider filtering, payment request rows, and offline draft rows.
  SACCO admin member-document and statement summary builders are now typed too. Transaction row
  shaping, dashboard overview counts, receipting queue, receipt register, and receipt summaries now have the same typed boundary,
  as do SACCO loan rows, borrower/guarantor options, loan product options, portfolio risk summaries, accounting ledger totals, accounting account
  options, reconciliation review rows, SACCO finance summaries and member options, notification delivery summaries and options, complaint/chat summaries and options, and
  governance meeting/resolution summaries, regulatory/platform report summaries, and audit
  classification summaries, onboarding and subscription billing summaries, onboarding option models, onboarding/payment stage labels, and user/role access
  summaries. Member administration option lists, KYC and statement evidence summaries are also covered by the
  typed member-admin bridge. SACCO/platform settings setup summaries, notification and mobile-money
  provider readiness rows, administrator security-session rows, and collection-account display rows
  are now typed behind the settings bridge. Operations provider-risk and login-risk summaries now
  sit behind a typed operations bridge as well. Platform Super Admin, Operations, Billing,
  Compliance, and Support dashboard summary counts are now typed behind a platform bridge. SACCO
  Admin, Accountant, Teller, Loans Officer, Auditor, Chairperson, Treasurer, and Secretary dashboard
  summary models are now typed behind a SACCO bridge. SACCO account-health rows and member directory
  summary rows are now typed behind a navigation bridge. Approval queue row preparation and summary
  counts are now typed behind an approvals bridge. Platform/SACCO user scope filtering, role options,
  multi-role detail summaries, active-session rows, device labels, and password-reset rows now sit behind the typed
  access bridge. Global quick-search result construction/filtering/grouping and topbar unread
  notification counts now also live behind the typed navigation bridge, with the redundant quick-search result wrapper removed.
  The type-contract gate now records the remaining intentional classic bridge helpers and blocks
  retired wrapper helpers from being reintroduced across `app*.js`.
  The type-evidence report now prints the same bridge inventory so release evidence shows the
  remaining ES-module migration surface explicitly.
  The table model now owns supplied-query filtering internally, reducing the remaining classic
  bridge inventory from seven helpers to six.
  The remaining type-safety work is reducing broad
  compatibility index signatures in the classic declarations and migrating runtime scripts into typed
  ES module source files.
- **Frontend tests now have a real runner and coverage floor.** Backend tests are strong, the helper
  suites cover many high-risk renderers, auth/session transitions, and member portal enterprise flows,
  and Block 2 added a Vitest gate for typed frontend models plus DOM renderer coverage. The Vitest
  suites cover table/search/pagination behavior, member monthly savings and payment lifecycle helpers,
  provider filtering, row actions, quick search, member directory summaries, notification unread
  counts, and enterprise member-portal rendering. Remaining frontend work is broadening this coverage
  across more platform and SACCO admin screens.
- **Horizontal scale / HA is partly proven.** Single-node assumptions remain. Startup guards now
  require Redis configuration before multi-instance production, request rate limiting has a
  Redis-backed shared counter, and payment idempotency has a Redis reservation store. A Docker-backed
  Redis smoke test passed on 14 August 2026, proving local Redis shared-state behavior. A local
  Java-backed baseline load evidence run passed on 14 August 2026. Backup/restore evidence also passed
  on 14 August 2026 with a DR runbook contract and disposable PostgreSQL restore. Deployment contract
  evidence also now passes locally. Hosted Redis deployment, staging load/soak execution, hosted
  DNS/HTTPS deployment proof, production RPO/RTO measurement, and load-balancer failover rehearsal are
  still needed.
- **Mobile money is not production-live.** Adapters and routing exist, but MTN/Airtel production use
  requires merchant onboarding/KYC, real credentials, live callback validation, and production
  settlement reconciliation.

### Medium

- **Large uncommitted working set.** Commit in focused commits to protect the work and restore clean
  history.
- **Backend test-pyramid depth is now complete for this pass.** End-to-end and integration coverage is good, and
  focused service/domain unit coverage now protects the main money and permission rules. Block 3 has completed
  closing this with focused subscription billing tests for the SACCO pricing rules and AuthService
  unit tests for bearer sessions, suspended users, platform/SACCO identity separation, multi-role
  permission matching, and fail-closed permission checks. It now also covers loan interest and
  installment terms, disbursement balances, guarantor stage progression, and overpayment clamping so
  repayments cannot drive loan balances below zero. Accounting-period and mobile-money payment
  request lifecycle tests now cover closed/open period behavior, period key derivation, callback
  posting, failed/expired completion, pending provider status, and provider-status retry evidence.
  Member balance and finance tests now cover withdrawal overdraw protection, reversal guardrails,
  non-positive amount rejection, welfare-claim balance protection, and financial transaction reversal
  audit metadata. Auth permission checks and login access payloads now use tenant-scoped role
  assignments, with focused coverage proving cross-SACCO stale role rows cannot grant permissions.
  SACCO payment-collection domain tests now cover collection-mode channel rules, safe parsing/defaulting,
  new-SACCO no-online-collection defaults, platform mode changes deactivating disallowed channels, and
  SACCO-owned mobile-money/bank account response details. Branch-scope tests now cover branch
  tenant/manager metadata, response scope fields, tenant mismatch rejection, default branch lookup,
  and manager-scoped branch ID lookup used by member, loan, transaction, chat, and complaint access
  controls. Privacy/data-protection tests now cover member privacy request transitions,
  completion/rejection metadata, document retention and storage-action audit fields, truncation of
  long storage details, and evidence readiness calculations for open requests, erasure completion,
  retained/disposed KYC documents, and storage action coverage. Regulatory-report aggregation now has
  focused backend coverage for consolidated SACCO totals, PAR rounding, compliance status,
  data-protection evidence rollups, and CSV export escaping. Approval workflow tests now cover
  supported approval modules, decision normalization, reason-required rules for rejections/corrections,
  response audit fields, and a null-safe approval reason check so invalid decisions fail closed.
  Fixed-asset valuation is now shared by accounting and regulatory reports, with focused tests for
  future depreciation starts, current-month depreciation, useful-life caps, inactive assets,
  net-book salvage floors, and response valuation evidence. Bank statement import validation is now
  extracted from the controller, with focused tests for supported channels, required fields, zero
  amounts, duplicate references in a file, existing references, closed accounting periods, and
  defaulting missing statement dates to today. Mobile-money payment rules now cover allowed
  contribution purposes, staff-only manual closure statuses, terminal payment states, trimmed
  cancellation reasons, and provider-confirmed posted status completing requests at the provider check
  time. Welfare claim tests now cover submitted audit fields, approval/rejection audit metadata,
  rejection reason rules, payable statuses, and supported payment channels for cash, bank, and mobile
  money.
  JaCoCo now enforces a Java backend coverage floor in `npm run java:test`: 80% line coverage and 55%
  branch coverage, with the current measured baseline at 83.37% lines and 59.28% branches. The Java
  backend suite passes with 345 tests, 0 failures, and 1 skipped test.
- **Data protection and regulation need deeper evidence.** Current evidence covers privacy requests,
  consent, masking/encryption helpers, and retention/disposal flows; Uganda DPA, BoU, and UMRA
  operating procedures still need policy-level completion and external review.
- **Internationalization depth is incomplete.** Locale and RTL wiring are evidenced for English,
  French, Swahili, Portuguese, Arabic, and Amharic, but Luganda and professional in-country
  translation/QA for broader regional coverage are still needed.
- **Accessibility needs real audits.** Static and browser evidence now covers baseline skip links,
  landmarks, labels, assertive auth errors, described form hints, reduced motion, touch targets,
  focus markers, and role journey structure; screen-reader flows, contrast, focus management, and
  WCAG AA testing still need assistive-technology validation.
- **Secrets management needs hosted managed-store evidence.** Environment-backed config, placeholder
  scanning, production startup guards, rotation procedures, required-secret inventory, and rotation
  evidence templates exist; the remaining work is wiring and proving a hosted Vault/KMS/secret-manager
  integration with operational rotation evidence.
- **Bank collection depth is partial.** SACCO-owned collection account setup, member-facing direct
  payment instructions, reference/draft flow, and reconciliable single-line/batch statement imports
  exist, but real bank API integration and bank notification workflows remain.
- **DB and connection-pool tuning needs load evidence.** Defaults exist, but N+1/query review and
  realistic load testing are not complete.

### Low

- **Legacy Node prototype remains tracked but quarantined.** `backend/*.mjs` is still present alongside
  the Java backend. Production refuses the Node API unless `JAVA_API_BASE` is configured or the Node
  API is deliberately enabled, and `server.mjs` remains useful as the SPA host/Java proxy. `npm run
  node:quarantine` now enforces the production guard, source-code demo-only markers, and documentation
  boundary.
- **Repo hygiene is now guarded.** Local logs and IDE files may still exist on a developer machine,
  but ignore rules and the tracked-file hygiene gate prevent them from entering release commits.
- **OpenAPI is hand-maintained with a new coverage gate.** It now covers the integrator-facing surface,
  SACCO collection mode/settings controls, platform access/admin routes, operations status, and member
  money paths. `npm run openapi:check` protects 36 enterprise-critical Java operations and 10 schemas;
  schema-drift checks should continue to grow.

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
