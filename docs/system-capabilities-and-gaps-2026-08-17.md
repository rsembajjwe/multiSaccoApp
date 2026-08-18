# Tereka Online — System Capabilities & Gaps Review

**Date:** 2026-08-17
**Supersedes:** system-capabilities-and-gaps-2026-08-15.md; complements roles-and-reporting-review-2026-08-17.md
**Snapshot:** Multi-tenant SACCO SaaS. Spring Boot 4 / Java 17 backend, H2 (dev) / PostgreSQL (prod) via
Flyway migrations **through V64**, vanilla-JS SPA frontend (56 classic scripts + a `src/**/*.ts` typed
model layer, Vite installed). **139 backend test methods; 9 vitest suites.**

## 1. Executive summary

The platform is feature-complete for a supervised pilot and has closed several enterprise-operation and
functional gaps since the 08-15 review. It now covers SACCO/platform role separation with maker-checker,
member savings/shares/welfare **plus configurable custom funds**, loans with approval gating, mobile-money
and bank collection into each SACCO's own accounts, reconciliation with **per-SACCO account attribution**,
a full accounting stack **including trial balance, income statement and balance sheet**, and an
**enterprise-grade UI** (refreshed login, shared components, navigation iconography, first reporting
charts).

The two things standing between "solid pilot" and "confidently production" are unchanged in kind:
finishing the frontend build/runtime story and proving high availability under load/failover; plus one
new operational item — **a large body of work is currently uncommitted** and must be committed and run
through the full Java + vitest suite on a JDK 17 machine to confirm green end to end.

## 2. What changed since 2026-08-15

- **Reconciliation → per-SACCO account attribution (V62).** Imported statement lines and mobile-money
  callbacks are matched to the SACCO-owned collection account they settled into (by account number /
  network); staff can confirm or override, and the choice is persisted, tenant-isolated and audited.
- **Sources-of-funds register (V63).** Chairperson/admin/treasurer record and maintain the SACCO's
  capital origins (share capital, savings, grants, borrowings, retained earnings…) with new
  `finance-source` permissions.
- **Configurable fund types (V64).** The three built-in funds (Savings/Shares/Welfare) are now a per-SACCO
  registry the Administrator can extend with custom funds (Burial, Education, Development…); product
  creation validates against the registry with a safe baseline; new tenants are seeded with the defaults
  on creation. This closes roles-review gap #1 on the configuration side.
- **Financial statements.** Trial Balance, Income Statement and Balance Sheet, computed from posted
  journals and the chart of accounts, added to the accounting module. This closes roles-review gap #2.
- **Advanced reporting UI (foundation).** A dependency-free, CSP-safe inline-SVG chart toolkit (bar,
  donut, legend) with income-vs-expenditure and asset-financing charts on the statements. Partially
  addresses roles-review gap #3.
- **Enterprise UI refresh.** Reworked login (layered hero, security cues, motion), an app-wide
  shared-component refresh (metric cards, panels, data tables, status pills, buttons, segmented tabs,
  notices), navigation iconography, and tighter action-first copy.
- **Test coverage.** New typed frontend suites (loans, transactions, accounting statements, sacco-finance,
  settings) and new backend tests (attribution, funding sources, fund types, tenant seeding).

## 3. Current capabilities

Platform vs SACCO tenant separation with role-based access and maker-checker; SACCO onboarding, billing
and subscription; members with KYC, documents and privacy controls; savings/shares/welfare and
**configurable custom funds**; loans with officer capture and committee/chair approval gating; treasurer/
teller transactions, expenses, assets; accounting (chart, journals, periods, **trial balance, income
statement, balance sheet**); reconciliation (bank/mobile-money) with **per-SACCO attribution**;
mobile-money and bank collection into each SACCO's own accounts (no central float); notifications,
complaints/chat, governance, audit trail; observability (Prometheus, correlation IDs), resilience
(timeouts, circuit breakers, retries), rate limiting, idempotency, pagination, a curated OpenAPI spec,
and an enterprise UI.

## 4. Gaps

### High
- **Frontend production build — now Rollup-free and unified (was: not finished).** `npm run build`
  (`scripts/build-frontend.mjs`, esbuild only — no Rollup) now concatenates and minifies the classic
  scripts into a single `dist-vite/tereka-classic-app.js`, rewrites `index.html` to one script tag and
  the service worker to match, and derives the cache-busting version from the current service worker so
  it is never stale. `dist-vite/` is exactly what `server.mjs` (production / `SACCO_SERVE_BUNDLE`) and the
  Caddyfile serve, so the built single-file bundle is the served artifact in production. `build:vite`
  (Vite/Rollup) remains as an alternative that produces the same output. Remaining: **run the build in
  CI/host** (esbuild/rollup are platform-native and cannot run in this assistant sandbox — they run on the
  Windows/CI machine), and optionally the purist ES-module cutover (`import`/`export`), which is not
  required for a working production bundle. Dev mode still serves the source script tree for fast edits.
- **HA proven in primitives, not in practice.** Redis-backed shared state + evidence scripts exist; a
  captured load/soak run and a two-instance failover rehearsal (RTO/RPO) are still needed.
- **Mobile money not production-live.** Adapters, per-network routing, per-SACCO accounts and a sandbox
  readiness gate exist; real MTN/Airtel merchant/KYC onboarding and live callback validation remain.
- **Uncommitted work (new, operational).** ~55 files of this session's features and UI are uncommitted
  (last commit predates them). They pass every in-sandbox gate, but must be committed and taken through
  the full `npm run check` (Java compile + JUnit + vitest) on a JDK 17 machine to confirm green.

### Medium
- **Member per-custom-fund balances.** The Administrator can now create custom funds, but member balances
  are still three fixed columns (savings/shares/welfare) on the member row; letting members hold and see
  Burial/Education balances needs the money-posting path generalized to per-fund accounts. This is the
  remaining half of roles-review gap #1.
- **Advanced reporting depth.** Charts exist on the financial statements; role dashboards (loan-portfolio
  aging, arrears trend, savings growth, income vs expenditure over time) and drill-downs are still flat.
- **Data protection & regulation.** Controls and evidence exist (masking, encryption, consent, retention,
  privacy requests); policy completion and external review remain. (SACCO/BoU licensing stays the SACCOs'
  burden given the no-float design.)
- **Role fidelity.** No distinct seeded Loan Committee role (covered by `loans:approve` or a custom role),
  and members and staff are separate identities, so one person being "Member + Treasurer" needs two
  logins.

### Low
- Legacy Node prototype still tracked; repo hygiene; one pre-existing inline `style="width:…"` that the
  strict CSP would block; commit the pending files.

## 5. Verification status

Everything runnable in this environment is green: both `tsc` projects, UI/i18n/accessibility/type
contracts, OpenAPI coverage, frontend-helper and member-portal tests, `node --check`, balanced CSS. Not
runnable here (need the user's machine): Maven `java:test` (139 methods), vitest (Rollup native binary),
PowerShell and Docker/Redis-backed scripts. Run `npm run check` on JDK 17 for the full gate.

## 6. Suggested next steps

1. **Commit and run the full suite.** Follow `docs/commit-plan-2026-08-17.md`, then `npm run check`, then push.
2. **Finish the Vite/TS runtime cutover** and serve `dist-vite` as the sole artifact.
3. **Member per-custom-fund balances** — generalize posting/balances so members see custom-fund balances.
4. **Advanced dashboard charts** — portfolio aging, arrears and savings trends on role dashboards.
5. **Capture HA evidence** (load/soak + two-instance failover) and complete **mobile-money production onboarding**.
