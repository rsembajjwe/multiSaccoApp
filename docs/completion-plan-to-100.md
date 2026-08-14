# Tereka Online — What "100% Complete" Requires

**Date:** 10 August 2026
**Starting point:** ~80% supervised-pilot / ~60% unattended-enterprise readiness (see the current
capabilities & gaps review).
**Definition:** "100%" = every open gap closed with objective acceptance criteria, across five
workstreams. Items marked **[code]** I can implement here; **[external]** depends on third parties
(telecoms, regulators, auditors) and has lead times outside the codebase.

---

## A. Engineering completion (build the remaining pieces)

1. **Frontend build (real, not bridged)** — [code]
   *Done when:* Vite is installed; modules use real ES `import`/`export`; `npm run build` emits a
   minified, hashed, tree-shaken bundle; `index.html`, the service worker, and `server.mjs`/Caddy serve
   the built output; the classic `<script>` list is gone.

2. **Type safety** — [code]
   *Done when:* the SPA is TypeScript (or JSDoc-typed with `tsc --checkJs`) and a type check runs in CI
   with zero errors.
   *Current progress:* classic SPA `checkJs`, contract-marker checks, and a strict
   `src/types/domain.ts` source boundary now pass and run through `npm run check` / `npm run
   type:evidence`. Remaining work is migrating runtime modules from global classic scripts into typed
   ES modules and reducing broad compatibility index signatures. The first runtime migration slice is
   started with `src/tables/tableModel.ts` plus the classic `app.table-model.js` bridge for shared
   table/search/pagination state, row filtering, and table-state keys, followed by `src/formatting/formatters.ts` plus
   `app.formatters.js` for shared money/date formatting, labels, sums, status badges, escaping, and
   table value formatting. Member statement normalization and monthly performance aggregation now
   follow the same pattern through `src/member/performance.ts` plus `app.member-performance.js`,
   including payment lifecycle rows, route labels, payment status, receipt status, guarantor rows,
   SACCO-admin message rows, mobile-money rows, provider filtering, payment request rows, and offline
   draft rows; redundant classic statement/monthly performance, payment-route/month, payment lifecycle, member row-alias, and unused mobile-money wrapper helpers have also been removed. SACCO admin member-document rows, retention summaries, statement totals, and
   receipt-ready statement summaries now follow the same pattern through `src/member/admin.ts` plus
   `app.member-admin-model.js`. Transaction row shaping, dashboard overview counts, approval readiness,
   payment route/status, receipting queue rows, receipt register rows, and receipt summaries now follow the same pattern
   through `src/transactions/transactions.ts` plus `app.transactions-model.js`, with redundant receipting queue/register wrapper helpers removed. Loan row shaping,
   borrower/guarantor option eligibility, product options, guarantor readiness, approval readiness,
   servicing status, portfolio risk counts, outstanding principal, and arrears-aging totals now follow the same pattern through `src/loans/loans.ts` plus
   `app.loans-model.js`, with the redundant local loan row wrapper removed. Accounting dashboard totals, unbalanced-journal counts, period-close counts,
   expense/asset account option filters, asset category options, reconciliation exception totals,
   payment request review rows, match rows, and reconciliation coverage now follow the same pattern through `src/accounting/accounting.ts` plus
   `app.accounting-model.js`, with redundant payment/reconciliation wrapper helpers removed. SACCO finance summaries for savings, shares, welfare, active products,
   active member option rows, member balances, contribution totals, welfare claim counts, paid welfare amounts, and claim action
   rows now follow the same pattern through `src/sacco-finance/finance.ts` plus
   `app.sacco-finance-model.js`. Notification delivery rows, template rows, template event/channel options, provider job rows,
   dashboard counts, delivery filters, unread acknowledgement IDs, payment exception slices, and
   login-risk slices now follow the same pattern through `src/notifications/notifications.ts` plus
   `app.notifications-model.js`, with redundant delivery filter/action wrapper helpers removed. Complaint/chat thread rows, open/urgent/in-progress/resolved counts,
   member/platform split counts, complaint category/status options, unread and assignment counts,
   chat search filtering, participant labels, and avatar initials now follow the same pattern through `src/complaints/complaints.ts`
   plus `app.complaints-model.js`, with redundant chat row/avatar wrapper helpers removed. Governance meeting rows, resolution rows, meeting-detail
   resolution rows, SACCO staff dropdown options, meeting type options, scheduled/completed
   slices, open and overdue resolution tracking, and minutes-evidence summaries now follow the same
   pattern through `src/governance/governance.ts` plus `app.governance-model.js`. Regulatory report
   rows, display data-protection fields, consolidated totals, exception counts, platform reporting
   dashboard counts, and report catalogue entries now follow the same pattern through
   `src/reports/reports.ts` plus `app.reports-model.js`. Audit row normalization, risk-level
   classification, category classification, sensitive/high-risk queues, category groups, unique
   actor/SACCO counts, and audit evidence summaries now follow the same pattern through
   `src/audit/audit.ts` plus `app.audit-model.js`, with the redundant audit normalization wrapper removed. SACCO application rows, registration readiness
   counts, subscription table rows, billing/payment access summaries, package-card display rows,
   SACCO-code generation, registration location parsing, approval status options, member-range options,
   country/currency options, collection-account review rows, and shared onboarding/payment stage labels now follow the same pattern through
   `src/onboarding/onboarding.ts` plus `app.onboarding-model.js`, with redundant classic onboarding/payment wrapper helpers removed. Platform/SACCO user access rows,
   access dashboard summaries, role coverage rows, SACCO staff role guide rows, permission-matrix
   rows, role purpose/scope text, and multi-role summary text now follow the same pattern through
   `src/access/access.ts` plus `app.access-model.js`, with redundant role-purpose, role-coverage, and role-summary wrapper helpers removed. Member administration status/type/KYC options,
   KYC readiness, KYC checklist rows, document rows, member detail summary counts, receipt evidence summaries, and staff statement
   export summaries now live in the existing `src/member/admin.ts` plus
   `app.member-admin-model.js`, with redundant KYC/document wrapper helpers removed.

3. **Bank collection — real integration** — [code + external]
   *Done when:* a real bank/aggregator API (or a defined file/host-to-host settlement) replaces the
   current reference/draft + statement-import flow, with automated reconciliation. (Bank onboarding is
   external.)

4. **Mobile money — production-live** — [code + external]
   *Done when:* MTN/Airtel **merchant/KYC onboarding** is complete; production credentials + signed
   callbacks are configured; a real payment to a live number completes and reconciles; optionally
   per-SACCO settlement credentials.

5. **Retire the legacy Node prototype** — [code]
   *Done when:* `backend/*.mjs` is removed or clearly quarantined; only the Java backend + SPA host
   remain; docs updated.
   *Current progress:* Production already refuses the legacy Node API unless `JAVA_API_BASE` points to
   the Java backend or `SACCO_NODE_API_ENABLED=true` is deliberately set. `server.mjs` is therefore
   treated as a local SPA host/Java proxy, while `backend/*.mjs` remains quarantined for local demo
   fallback only. The quarantine is now enforced by `npm run node:quarantine`, which checks the runtime
   production guard, source-code demo-only markers, docs, and that legacy API smoke tests opt into
   demo fallback explicitly. The OpenAPI contract has also been
   strengthened with a new `npm run openapi:check` gate covering 36 enterprise-critical Java operations and 10 schemas across health, auth, operations,
   SACCO administration, platform access, member self-service, payments, loans, transactions, and
   callbacks. Remaining work is physically removing or archiving the Node business implementation once
   all local/demo flows have a Java-backed replacement.

---

## B. Quality & verification (prove it works)

6. **Frontend test framework + suite** — [code]
   *Done when:* a real runner (Vitest) with component/DOM tests covers the high-risk renderers and
   flows; runs in CI; a coverage floor is enforced.
   *Current progress:* Block 2 is complete. Vitest is installed, `npm run test:frontend` is wired into
   `npm run check`, and a V8 coverage floor is enforced. The suite covers table filtering/pagination,
   member monthly savings/deposit aggregation, payment lifecycle rows, mobile-money provider filtering,
   draft and guarantor row actions, quick-search grouping, member-directory summaries, filter values,
   unread notification counts, and DOM renderer coverage for the enterprise member portal.

7. **Backend test-pyramid depth** — [code]
   *Done when:* focused service/domain unit tests exist for every money path and permission rule (not
   just the big integration suite); coverage floor enforced in CI.
   *Current progress:* Block 3 is complete for the agreed backend test-pyramid pass. Focused unit tests now cover subscription billing tier
   boundaries, the 100-member minimum, 5,000-per-member pricing up to 250 members, fixed tiers above
   250 members, paid/unpaid initial subscription activation, live-member-count billing refresh,
   bearer-session acceptance/rejection, suspended-user rejection, platform/SACCO identity separation,
   multi-role permission matching, fail-closed permission checks, loan interest/installment terms,
   disbursement balance creation, guarantor stage progression, loan overpayment clamping so a
   repayment cannot push a loan balance below zero, accounting-period closure/reopen behavior, period
   key derivation, and mobile-money payment request lifecycle states for pending, posted, failed,
   expired, and provider-check retry paths. Member balance tests now also cover withdrawal overdraw
   protection, reversal guardrails for savings/shares/welfare balances, non-positive amount rejection,
   welfare-claim balance protection, and financial transaction reversal audit metadata. Permission
   checks and login access payloads now use tenant-scoped role assignments, with focused coverage that
   proves cross-SACCO stale role rows cannot grant permissions. SACCO payment-collection domain tests
   now cover collection-mode channel rules, safe parsing/defaulting, new-SACCO no-online-collection
   defaults, platform mode changes deactivating disallowed channels, and SACCO-owned mobile-money/bank
   account response details. Branch-scope tests now cover branch tenant/manager metadata, branch
   response scope fields, tenant mismatch rejection, default branch lookup, and manager-scoped branch
   ID lookup that member/loan/transaction/chat/complaint access controls rely on. Privacy/data-protection
   tests now cover member privacy request transitions, completion/rejection metadata, document retention
   and storage-action audit fields, truncation of long storage details, and data-protection evidence
   readiness calculations for open requests, erasure completion, retained/disposed KYC documents, and
   storage action coverage. Regulatory-report aggregation now has a tested backend assembler covering
   consolidated SACCO totals, PAR rounding, compliance status, data-protection evidence rollups, and
   CSV export escaping so regulator-facing evidence is protected outside the controller integration
   suite. Approval workflow tests now cover supported approval modules, decision normalization,
   reason-required rules for rejections/corrections, response audit fields, and a null-safe approval
   reason check so invalid decisions fail closed. Fixed-asset valuation is now shared by accounting
   and regulatory reports, with focused tests for future depreciation starts, current-month
   depreciation, useful-life caps, inactive assets, net-book salvage floors, and response valuation
   evidence. Bank statement import validation is now extracted from the controller, with focused tests
   for supported channels, required fields, zero amounts, duplicate references in a file, existing
   references, closed accounting periods, and defaulting missing statement dates to today. Mobile-money
   payment rules now cover allowed contribution purposes, staff-only manual closure statuses,
   terminal payment states, trimmed cancellation reasons, and provider-confirmed posted status
   completing requests at the provider check time. Welfare claim tests now cover submitted audit fields,
   approval/rejection audit metadata, rejection reason rules, payable statuses, and supported payment
   channels for cash, bank, and mobile money. JaCoCo is now wired into `npm run java:test` with an
   enforced backend coverage floor of 80% line coverage and 55% branch coverage. The measured baseline
   is 83.37% line coverage and 59.28% branch coverage. Backend suite passed with 345 tests, 0 failures,
   1 skipped. Future backend tests can continue opportunistically as new production features are added.

8. **Performance & load/soak testing** — [code]
   *Done when:* load and soak runs hit defined throughput/latency targets; DB indexes/N+1 hotspots
   fixed; connection pool tuned; results captured as evidence.
   *Current progress:* The load harness now runs a mixed enterprise scenario set instead of only
   health/status requests. It covers health, operations status, SACCO account listing, subscriptions,
   platform users, audit events, regulatory reports, and provider operational evidence with
   authenticated platform traffic. It enforces p95, p99, timeout, and minimum-throughput thresholds,
   emits scenario-level latency/failure metrics, and writes a structured `LOAD_SUMMARY_JSON` record
   that `npm.cmd run load:evidence` renders into release evidence. Remaining work is to run this
   against a PostgreSQL-backed staging clone at realistic request volumes, capture repeated baseline
   and soak evidence, and tune indexes/queries where the evidence shows hotspots.

9. **HA / failover rehearsal** — [code]
   *Done when:* a two-instance deployment behind a load balancer, sharing Redis, survives an instance
   kill with no lost rate-limit/idempotency state; documented RTO/RPO; failover evidence recorded.
   *Current progress:* The static HA readiness contract passes with 40 markers covering the HA runbook,
   production scale guards, Redis-backed rate-limit/idempotency boundaries, Redis smoke-test wiring,
   and idempotent mobile-money/subscription hot-key protection. `npm.cmd run ha:evidence` now includes
   an explicit Docker engine preflight and Redis shared-state smoke test. The latest evidence report
   is `reports/ha-evidence/ha-evidence-20260814T135205Z.md`: HA contract PASS, Docker availability
   PASS, and Redis shared-state smoke PASS. Remaining work is a true hosted two-instance/load-balancer
   failover rehearsal against PostgreSQL + Redis.

10. **DR / backup-restore** — [code]
    *Done when:* backup + point-in-time restore is rehearsed on production-like data against target
    RPO/RTO, with signed-off evidence.
    *Current progress:* `docs/disaster-recovery.md` now defines local, staging, small-start production,
    and enterprise production RPO/RTO targets, restore-owner evidence fields, hosted restore steps,
    emergency recovery, and release gates. `npm.cmd run backup:evidence` now checks the DR runbook
    before running the disposable PostgreSQL backup/restore rehearsal. The 14 August 2026 local
    evidence passed and restored `backups\rehearsals\sacco_app_backup_rehearsal-20260814-164712.dump`.
    Hosted PITR/off-server backup evidence remains external deployment work.

11. **Security penetration test** — [external]
    *Done when:* an independent pen test / code audit is passed and findings remediated.

12. **Accessibility (WCAG)** — [code + external]
    *Done when:* keyboard navigation, ARIA, contrast, and screen-reader support meet WCAG 2.1 AA, with
    an audit report.
    *Current code-side evidence:* skip links, landmarks, current-page markers, topbar labels,
    assertive auth errors, described field hints, reduced motion, coarse-pointer touch targets, and
    visible focus are covered by `npm run accessibility:evidence`. The same command now runs a
    browser journey across login, public SACCO registration, platform admin, SACCO admin, and member
    portal where the active profile allows it. Manual assistive-technology, contrast, and WCAG AA
    audit signoff remains required.

13. **User Acceptance Testing (UAT)** — [external]
    *Done when:* real SACCO staff and members complete scripted UAT and sign off.

---

## C. Operations readiness (run it unattended)

14. **Managed secrets** — [code + external]
    *Done when:* production secrets live in a managed store (Vault/cloud KMS) with rotation and audit —
    no secrets in env files.
    *Current progress:* `docs/secrets-inventory.md` now lists 25 production secret names across
    database, PII, bootstrap admin, AfroSMS, Gmail SMTP, mobile-money providers, signed callbacks, and
    Redis HA. `npm.cmd run secrets:evidence` now verifies deployment examples contain placeholders,
    the runbook contains rotation/emergency procedures, the staging guide covers required secret
    names, and the inventory includes rotation evidence fields. Hosted secret-store wiring and a real
    rotation audit remain external deployment evidence.

15. **Monitoring, alerting & on-call** — [code + external]
    *Done when:* Prometheus metrics feed dashboards (Grafana) and alerts (error rate, latency, callback
    failures, queue depth) route to an on-call channel; SLO/SLA defined.
    *Current progress:* Code-side alert rules now exist in `deploy/prometheus-alerts.yml` for API down,
    5xx error rate, p95 latency, database pool pressure, and JVM heap pressure. The monitoring guide
    links these Prometheus rules and keeps the authenticated Operations Status endpoint as the source
    for business alerts such as callback exceptions, pending postings, open complaints, and notification
    delivery exceptions. External work remains: deploy Prometheus/Grafana or the hosting equivalent and
    route alerts to email/SMS/incident channels.

16. **Centralized logging & tracing** — [code]
    *Done when:* structured logs (with the existing correlation IDs) are shipped to a central store;
    optional distributed tracing for cross-service flows.
    *Current progress:* Production logging is configured for structured JSON console output. The request
    correlation filter now enriches MDC with bounded `correlationId`, `requestMethod`, `requestPath`,
    and `clientIp` fields while avoiding query strings, request bodies, and credentials. Regression
    tests cover generated IDs, inbound IDs, legacy request IDs, and bounded correlation headers.

17. **Production deployment + runbooks** — [code + external]
    *Done when:* a repeatable prod deploy (CI/CD to real infra) exists with rollback, plus runbooks for
    common incidents.
    *Current progress:* `npm.cmd run deploy:evidence` now runs a deployment contract checker covering
    the deployment guide, Hetzner/Caddy runbook, staging environment guide, staging handoff checklist,
    release evidence template, staging readiness notes, CI gates, and package scripts. Local evidence
    now records the contract result and deliberately skips hosted staging preflight when no hosted
    `.env` or staging variables are supplied. Remaining work is the external hosted proof: real
    `tereka.online` DNS/HTTPS, production/staging secrets, hosted API/UI endpoints, rollback
    rehearsal, and deployment sign-off. `npm.cmd run staging:handoff-check` now also guards the
    human handoff checklist so required environment, secrets, release-gate, operations, UAT, and
    blocker controls are not accidentally removed. The Hetzner CX22 runbook now includes first
    platform owner bootstrap, bootstrap credential rotation, pre-update backup, post-deploy health
    verification, rollback, restore-owner evidence, and secret-safe log handling.

---

## D. Compliance & inclusion (allowed to operate)

18. **Data protection (Uganda DPA 2019)** — [code + external]
    *Done when:* the existing evidence (privacy requests, consent, masking, retention) is completed into
    policy, encryption at rest is enabled for PII, and registration/DPO obligations are met.

19. **Sector regulation (Bank of Uganda / UMRA)** — [external]
    *Done when:* licensing/supervision requirements and regulator-facing reporting are satisfied.

20. **Internationalization depth** — [code + external]
    *Done when:* the catalog is fully populated and translated (English + French now; Luganda/Swahili as
    targeted) and QA'd in-app.

21. **Legal** — [external]
    *Done when:* Terms of Service, Privacy Policy, and data-processing agreements are finalized.

---

## E. Go-live

22. **Documentation** — [code]
    *Done when:* admin/operator and member user guides, API docs (OpenAPI complete for admin endpoints
    too), and architecture/runbook docs are published.

23. **Commit & release hygiene** — [code]
    *Done when:* the working set is committed in focused commits; a tagged release + changelog exists.
    *Current progress:* `npm.cmd run release:evidence` now creates a timestamped local release pack
    covering deployment, DR, secrets, database tuning, HA, data protection, Vite, i18n,
    accessibility, and repository hygiene contracts. It gives release owners one summary artifact before hosted staging
    handoff, while still requiring the heavier Docker/browser/load gates and external hosted proof.
    `npm.cmd run repo:hygiene` now also verifies ignore rules and scans tracked files so local logs,
    reports, builds, backups, IDE files, temporary files, and environment files cannot become part of
    a release commit.

24. **Pilot → production sign-off** — [external]
    *Done when:* a supervised pilot runs clean for an agreed period, then a formal go-live decision is
    recorded.

---

## What I can drive now (no external dependencies)

Progress note: the frontend type-safety bridge now covers member administration, Settings setup,
provider readiness, security sessions, collection-account display rows, and Operations provider/login
risk models. Platform role dashboard summaries are typed too; the remaining frontend work is
increasingly about module packaging and real component tests. SACCO role dashboard summaries now use
the same typed-source pattern, as do SACCO account-health, member directory navigation, and approval
queue models. User-management scope filtering, role-option filtering, multi-role detail summaries,
active-session rows, device labels, and password-reset rows now also live behind the typed access bridge. Global
quick-search result creation, filtering, grouping, active-result cleanup, and topbar unread counts
now sit behind the typed navigation bridge, with the redundant quick-search result wrapper removed.
The type-contract gate now also records the remaining intentional classic bridge helpers and blocks
retired wrapper helpers from being reintroduced across `app*.js`.
The type-evidence report now prints the same bridge inventory so release evidence shows the
remaining ES-module migration surface explicitly.
The table model now owns supplied-query filtering internally, reducing the remaining classic bridge
inventory from seven helpers to six.

Ordered by leverage: **(1)** finish the Vite build + convert to ES modules, **(2)** expand the Vitest
frontend suite into renderer/component coverage with a coverage floor, **(3)** run load/soak + a two-instance failover rehearsal and capture HA evidence,
**(4)** ship alert routing/centralized log collection in the deployment environment, **(5)** retire the
Node prototype and complete OpenAPI, **(6)** commit the working set.

The items that **cannot** be finished purely in code — and therefore cap "100%" on external timelines —
are: MTN/Airtel and bank **merchant onboarding**, **regulatory licensing** (BoU/UMRA), an independent
**penetration test/audit**, real-user **UAT sign-off**, and **legal** documents.
