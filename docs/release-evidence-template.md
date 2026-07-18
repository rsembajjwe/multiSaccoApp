# Release Evidence Template

Use this template for each staging or production release candidate. Store the completed copy with the release artifact, CI run, or project tracker. Do not paste secrets or passwords into this document.

## Release Candidate

| Field | Value |
| --- | --- |
| Release candidate ID |  |
| Git commit SHA |  |
| Branch or tag |  |
| Environment | Staging / Production |
| UI URL |  |
| API URL |  |
| Evidence owner |  |
| Evidence date/time |  |
| Deployment owner |  |
| Product owner |  |

## Environment Evidence

| Check | Evidence | Result |
| --- | --- | --- |
| UI is reachable over HTTPS. | URL and timestamp. |  |
| API health endpoint is healthy. | `GET /api/v1/health` response timestamp. |  |
| Spring production profile is active. | `SPRING_PROFILES_ACTIVE=prod` evidence. |  |
| Demo logins are disabled. | `SACCO_DEMO_LOGINS_ENABLED=false` evidence. |  |
| Staging preflight passes. | `npm.cmd run staging:preflight` output. |  |
| CORS/reverse proxy origins are restricted. | Host or proxy config reference. |  |
| Secrets are stored outside git. | Secret-store reference, not secret values. |  |

## Automated Gates

Latest local gate evidence before hosted handoff: `npm.cmd run ready:check` passed on `2026-07-18`, including Java/PostgreSQL API smoke, static UI contracts, Java-backed browser regression, browser UAT, security hardening checks, and Docker stack cleanup.

Latest local backup rehearsal evidence: `npm.cmd run backup:rehearse` passed on `2026-07-18` with `backups\rehearsals\sacco_app_backup_rehearsal-20260718-105007.dump`, successful restore verification, and disposable Docker stack cleanup.

| Gate | Command or artifact | Pass/fail | Evidence link or notes |
| --- | --- | --- | --- |
| Local verification | `npm.cmd run check` |  |  |
| Production readiness | `npm.cmd run ready:check` |  |  |
| PostgreSQL/Flyway | `npm.cmd run postgres:check` or hosted migration artifact |  |  |
| Migration evidence | `npm.cmd run migration:evidence` |  | Attach `summary.md`, `members.csv`, `loans.csv`, and `audit.csv`; explain accepted warnings. |
| Backup restore rehearsal | `npm.cmd run backup:rehearse` |  |  |
| Load test | `npm.cmd run load:test` |  |  |
| Browser regression | `npm.cmd run ui:browser` |  |  |
| Browser UAT | `npm.cmd run uat:browser` |  |  |
| CI release gate | GitHub Actions run |  |  |

## Database And Backup

| Field | Value |
| --- | --- |
| Database engine/version |  |
| Flyway schema version count |  |
| Latest Flyway version |  |
| Backup file/path reference |  |
| Restore rehearsal target |  |
| Restore rehearsal result |  |
| Restore owner |  |

## Load Test Summary

| Metric | Target | Actual |
| --- | ---: | ---: |
| Total requests |  |  |
| Concurrency |  |  |
| Error count | 0 |  |
| p95 latency |  |  |

## UAT Sign-Off

| Role | Script | Result | Owner | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| Platform admin | `docs/uat-scripts.md` |  |  |  |  |
| SACCO staff | `docs/uat-scripts.md` |  |  |  |  |
| Member portal | `docs/uat-scripts.md` |  |  |  |  |

## Findings Summary

Use `docs/uat-findings-template.md` for the detailed tracker.

| Severity | Open | Accepted | Closed |
| --- | ---: | ---: | ---: |
| P0 Blocker |  |  |  |
| P1 High |  |  |  |
| P2 Medium |  |  |  |
| P3 Low |  |  |  |

| Accepted finding ID | Severity | Acceptance owner | Expiry or follow-up |
| --- | --- | --- | --- |
|  |  |  |  |

## Release Decision

| Decision | Owner | Date | Notes |
| --- | --- | --- | --- |
| Approved |  |  |  |
| Approved with accepted findings |  |  |  |
| Blocked |  |  |  |

Do not approve a release candidate with failed automated gates, enabled demo logins outside an approved demo window, missing restore evidence, or unaccepted P0/P1 findings.
