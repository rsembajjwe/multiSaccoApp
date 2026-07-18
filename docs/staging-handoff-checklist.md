# Staging Handoff Checklist

Use this checklist before handing the SACCO platform to testers or a pilot SACCO. The handoff owner should attach command output, screenshots, or CI artifacts where possible.

## Environment

| Item | Evidence | Result |
| --- | --- | --- |
| Staging UI URL is reachable over HTTPS. | URL and timestamp. |  |
| Java API URL is reachable over HTTPS or protected internal routing. | `GET /api/v1/health` response timestamp. |  |
| Reverse proxy forwards `/api/v1` to the Java backend. | Browser or API smoke evidence. |  |
| CORS/reverse-proxy origins are restricted to approved staging hosts. | Host config or deployment note. |  |
| `SPRING_PROFILES_ACTIVE=prod` is set. | Environment evidence. |  |

## Secrets

| Item | Evidence | Result |
| --- | --- | --- |
| PostgreSQL database name, user, and password are staging-specific. | Secret-store reference, not secret value. |  |
| `.env` or real secrets are not committed. | `git status --short` and repository review. |  |
| `SACCO_DEMO_LOGINS_ENABLED=false` by default. | Environment evidence. |  |
| Auth rate-limit settings are configured. | `SACCO_AUTH_RATE_LIMIT_MAX_FAILURES` and window evidence. |  |
| Provider IDs are explicit for SMS, email, and mobile money. | Environment evidence. |  |

## Release Gates

| Gate | Command or evidence | Result |
| --- | --- | --- |
| Local verification passed. | `npm.cmd run check` |  |
| Production readiness passed. | `npm.cmd run ready:check` or CI release-gate artifact. |  |
| PostgreSQL/Flyway verified. | `npm.cmd run postgres:check` or staging migration evidence. |  |
| Backup restore rehearsal passed. | `npm.cmd run backup:rehearse` |  |
| Load test passed. | `npm.cmd run load:test` with agreed request/concurrency/p95 values. |  |
| Browser regression passed. | `npm.cmd run ui:browser` or CI artifact. |  |

## Operations

| Item | Evidence | Result |
| --- | --- | --- |
| Operations status endpoint works for platform scope. | Authenticated `GET /api/v1/operations/status`. |  |
| Operations status endpoint works for tenant scope. | Authenticated `GET /api/v1/operations/status?tenantId=...`. |  |
| Monitoring alert destination is configured. | Email, dashboard, or incident channel reference. |  |
| Backup schedule and retention are documented. | Schedule, retention, and owner. |  |
| Restore owner is named. | Owner and escalation contact. |  |
| Incident runbook is available to testers and admins. | Link to `docs/monitoring.md` or hosted runbook. |  |

## UAT Readiness

| Item | Evidence | Result |
| --- | --- | --- |
| Platform admin UAT account exists. | Account reference, not password. |  |
| SACCO staff UAT account exists. | Account reference, not password. |  |
| Member UAT account exists. | Account reference, not password. |  |
| Test SACCO and member data are realistic enough for UAT. | Data setup note. |  |
| UAT data setup has run. | `npm.cmd run uat:setup` output or equivalent manual setup evidence. |  |
| UAT scripts are shared with testers. | Link to `docs/uat-scripts.md`. |  |
| Defect capture process is agreed. | Issue tracker/project reference. |  |

## Handoff Decision

| Decision | Owner | Date | Notes |
| --- | --- | --- | --- |
| Approved for UAT |  |  |  |
| Approved with known findings |  |  |  |
| Blocked |  |  |  |

Do not hand off for external UAT when any release gate fails, demo logins are enabled without written approval, or no restore owner is named.
