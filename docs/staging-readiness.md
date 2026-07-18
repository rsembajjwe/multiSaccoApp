# Staging Readiness Plan

This plan turns the current project completeness assessment into concrete release gates. It should be reviewed before any hosted demo, pilot SACCO onboarding, or production deployment.

## Current Completion Snapshot

| Track | Current readiness | Status |
| --- | ---: | --- |
| MVP functionality | 75-80% | Java-backed core workflows exist for onboarding, members, transactions, loans, reports, operations, subscriptions, and member self-service. |
| Staging readiness | 72-78% | PostgreSQL/Flyway, API smoke tests, security checks, UI contract checks, browser regression, browser UAT, handoff checklist, and evidence templates are ready for a hosted run. |
| Production launch readiness | 60-65% | Core controls and release evidence path exist, but real providers, hosted secrets, monitoring, backup scheduling, data migration, and signed UAT still need completion. |

## Staging Entry Gates

A build can be called staging-ready only when every required gate passes.

| Gate | Command or evidence | Pass condition | Current status |
| --- | --- | --- | --- |
| Full local verification | `npm.cmd run check` | JavaScript syntax, UI contracts, proxy mode, mobile contract, and Java tests pass. | Ready |
| PostgreSQL verification | `npm.cmd run postgres:check` | Docker/PostgreSQL starts, Flyway applies, API smoke test passes, and security checks pass. | Ready |
| Production-readiness bundle | `npm.cmd run ready:check` | Isolated Java/PostgreSQL stack passes Flyway, API smoke, security, UI, browser regression, and browser UAT checks. | Ready |
| Seed/demo gating | `SACCO_DEMO_LOGINS_ENABLED=false` in production profile | Demo credentials are disabled unless explicitly enabled for dev/demo verification. | Ready |
| Browser-backed UI regression | `npm.cmd run ui:browser` | Main Java-backed screens render source, sync, loading/error, and member portal panels. | Ready |
| Browser UAT smoke test | `npm.cmd run uat:browser` plus `docs/uat-scripts.md` | Platform admin, SACCO staff, and member portal scripts pass or have accepted findings. | Ready for hosted run |
| Staging environment secrets | `docs/staging-environment.md` plus staging host secret store | Database password, rate-limit settings, API base URL, and demo-login flag are environment-managed. | Ready for handoff |
| Staging handoff checklist | `docs/staging-handoff-checklist.md` | Environment, secrets, release gates, operations, UAT accounts, and decision evidence are recorded. | Required before staging handoff |
| Release evidence pack | `docs/release-evidence-template.md` | Command results, environment evidence, UAT sign-off, load-test numbers, and release decision are recorded. | Ready for use |
| UAT findings tracker | `docs/uat-findings-template.md` | Findings have severity, owner, status, retest result, and acceptance notes. | Ready for use |
| Backup restore rehearsal | `npm.cmd run backup:rehearse` | Backup file restores cleanly on an isolated non-production database. | Ready |

## Remaining Work to Reach Production

These items are the main gap between the current build and live SACCO operation.

| Priority | Area | Work needed | Done when |
| --- | --- | --- | --- |
| P0 | Authorization | Endpoint-level permission checks now cover tenant/user/role administration, finance/accounting, reports, loans, approvals, operations, notifications, governance, and complaints. | Permission tests prove blocked actions return `403` and allowed actions still pass. |
| P0 | Tenant isolation | Regression tests now cover cross-tenant staff, platform, member, loan, transaction, subscription, report, document, operation, audit, and member-portal access paths. | Tenant isolation tests run in CI and fail on missing `tenant_id` controls. |
| P0 | Financial correctness | Tests now assert reversal statement impact, balanced reversal journals, exact loan repayment balances/totals, balanced repayment journals, subscription idempotency, closed-period blocking, expenses, assets, and subscription billing tiers. | Calculations are verified against expected ledger/balance outcomes. |
| P0 | Secrets and deployment | Staging variables, secret-handling rules, demo-login control, HTTPS/reverse-proxy requirements, and handoff evidence are documented in `docs/staging-environment.md`. | Deployment guide has a tested staging path with no secrets in source control. |
| P1 | Provider integrations | SMS, email, and mobile-money flows now use provider interfaces with demo provider IDs controlled by environment; real adapters and callback signature verification still need provider-specific implementation. | Provider sandbox tests prove callbacks are authenticated and idempotent. |
| P1 | Monitoring | Operations runbook now defines health, database, callback, pending posting, notification, complaint, and backup rehearsal alert checks. | Alert routing is connected to the hosting/operations platform. |
| P1 | Backups | Backup, restore, and isolated restore-rehearsal scripts exist; encrypted scheduling and release evidence remain operational setup tasks. | Restore evidence is recorded for each release candidate. |
| P1 | CI/CD | GitHub Actions now runs local verification on Windows and a Docker/PostgreSQL production-readiness gate with browser regression on Ubuntu. | Main branch cannot be promoted if the release suite fails. |
| P2 | UAT | UAT scripts, seeded test data, browser UAT, release evidence, and findings templates now cover platform admin, SACCO staff, and member portal acceptance paths. | Signed UAT findings are closed or explicitly accepted. |
| P2 | Data migration | Member, opening balance, and loan book imports now include templates, dry-run validation, all-or-nothing Java-backed creation/posting, UI paste flows, and import guide coverage; contact/KYC metadata imports remain. | Pilot SACCO data imports without manual database edits. |

## Recommended Next Sprint

Focus the next sprint on turning the high-risk items into tests and enforcement.

1. Run hosted staging handoff using `docs/staging-handoff-checklist.md` and `docs/release-evidence-template.md`.
2. Execute pilot UAT scripts and close or accept findings using `docs/uat-findings-template.md`.
3. Repayment history import for migrated loans, then contact/KYC metadata import.
4. Connect monitoring alerts and encrypted backup schedules in the staging hosting environment.
5. Provider sandbox credentials and callback-signature test fixtures.

## Release Candidate Checklist

Use this checklist before tagging a staging or production release.

- `npm.cmd run check` passes.
- `npm.cmd run ready:check` passes.
- `npm.cmd run load:test` meets the agreed request and p95 threshold.
- No P0 security findings are open in `docs/security-review.md`.
- Demo logins are disabled outside explicit demo verification.
- Database backup and restore have been rehearsed on a non-production copy.
- Browser UAT and manual UAT scripts cover Dashboard, SACCO Registration, Subscriptions, Members, Transactions, Loans, Approvals, Reports, Operations, and Member Portal.
- Release evidence and findings tracker are completed for the release candidate.
- Staging secrets are stored outside git.
- Deployment owner confirms HTTPS, CORS origin, backup schedule, and monitoring destinations.
