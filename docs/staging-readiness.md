# Staging Readiness Plan

This plan turns the current project completeness assessment into concrete release gates. It should be reviewed before any hosted demo, pilot SACCO onboarding, or production deployment.

## Current Completion Snapshot

| Track | Current readiness | Status |
| --- | ---: | --- |
| MVP functionality | 75-80% | Java-backed core workflows exist for onboarding, members, transactions, loans, reports, operations, subscriptions, and member self-service. |
| Staging readiness | 65-70% | PostgreSQL/Flyway, API smoke tests, security checks, UI contract checks, and browser regression are automated locally. |
| Production launch readiness | 55-60% | Core controls exist, but real integrations, stronger permissions, deployment secrets, monitoring, backups, and UAT still need completion. |

## Staging Entry Gates

A build can be called staging-ready only when every required gate passes.

| Gate | Command or evidence | Pass condition | Current status |
| --- | --- | --- | --- |
| Full local verification | `npm.cmd run check` | JavaScript syntax, UI contracts, proxy mode, mobile contract, and Java tests pass. | Ready |
| PostgreSQL verification | `npm.cmd run postgres:check` | Docker/PostgreSQL starts, Flyway applies, API smoke test passes, and security checks pass. | Ready |
| Production-readiness bundle | `npm.cmd run ready:check` | Isolated Java/PostgreSQL stack passes Flyway, API smoke, security, UI, and browser regression checks. | Ready |
| Seed/demo gating | `SACCO_DEMO_LOGINS_ENABLED=false` in production profile | Demo credentials are disabled unless explicitly enabled for dev/demo verification. | Ready |
| Browser-backed UI regression | `npm.cmd run ui:browser` | Main Java-backed screens render source, sync, loading/error, and member portal panels. | Ready |
| Manual smoke test | Staff and member login in browser | Platform admin, SACCO admin, and member flows work from the UI with Java API enabled. | Required before staging handoff |
| Staging environment secrets | Staging `.env` or host secret store | Database password, rate-limit settings, API base URL, and demo-login flag are environment-managed. | Pending |
| Backup restore rehearsal | `npm.cmd run backup:db` then `npm.cmd run restore:db -- -ConfirmRestore` on non-production copy | Backup file restores cleanly and health/API checks pass afterward. | Pending |

## Remaining Work to Reach Production

These items are the main gap between the current build and live SACCO operation.

| Priority | Area | Work needed | Done when |
| --- | --- | --- | --- |
| P0 | Authorization | Extend endpoint-level permission checks to every remaining business controller; tenants, users, roles, permissions, financial transactions, financial products/accounts, welfare claims, accounting, reconciliation, mobile-money callback history, and regulatory reports now enforce assigned role permissions. | Permission tests prove blocked actions return `403` and allowed actions still pass. |
| P0 | Tenant isolation | Add regression tests for cross-tenant members, loans, transactions, subscriptions, reports, documents, and operations. | Tenant isolation tests run in CI and fail on missing `tenant_id` controls. |
| P0 | Financial correctness | Expand tests for reversals, statement balances, loan repayments, closed periods, expenses, assets, and subscription billing tiers. | Calculations are verified against expected ledger/balance outcomes. |
| P0 | Secrets and deployment | Define staging and production environment variables, rotate demo passwords, require strong database credentials, and document HTTPS/reverse-proxy setup. | Deployment guide has a tested staging path with no secrets in source control. |
| P1 | Provider integrations | Replace simulated SMS/email/mobile-money flows with provider adapters and callback signature verification. | Provider sandbox tests prove callbacks are authenticated and idempotent. |
| P1 | Monitoring | Add deployment health dashboards, structured logs, alert thresholds, and callback/delivery exception monitoring. | Operations runbook describes alerts and response steps. |
| P1 | Backups | Schedule encrypted database backups and test restore regularly. | Restore evidence is recorded for each release candidate. |
| P1 | CI/CD | Run `check`, Java tests, PostgreSQL verification, and browser regression in GitHub Actions or a staging pipeline. | Main branch cannot be promoted if the release suite fails. |
| P2 | UAT | Run SACCO staff/member acceptance testing with realistic data. | Signed UAT findings are closed or explicitly accepted. |
| P2 | Data migration | Define import templates and validation for onboarding a real SACCO from spreadsheets. | Pilot SACCO data imports without manual database edits. |

## Recommended Next Sprint

Focus the next sprint on turning the high-risk items into tests and enforcement.

1. Continue endpoint-level permission enforcement across loan, approval, notification, governance, complaint, and operations controllers.
2. Tenant-isolation regression tests for staff, platform, and member routes.
3. Financial calculation tests for statements, reversals, loans, subscriptions, and closed periods.
4. Staging environment/secrets guide with a tested `.env` example and deployment checklist.
5. Provider integration interfaces for SMS, email, and mobile money, with demo adapters kept behind development configuration.

## Release Candidate Checklist

Use this checklist before tagging a staging or production release.

- `npm.cmd run check` passes.
- `npm.cmd run ready:check` passes.
- `npm.cmd run load:test` meets the agreed request and p95 threshold.
- No P0 security findings are open in `docs/security-review.md`.
- Demo logins are disabled outside explicit demo verification.
- Database backup and restore have been rehearsed on a non-production copy.
- Manual UI smoke test covers Dashboard, SACCO Registration, Subscriptions, Members, Transactions, Loans, Approvals, Reports, Operations, and Member Portal.
- Staging secrets are stored outside git.
- Deployment owner confirms HTTPS, CORS origin, backup schedule, and monitoring destinations.
