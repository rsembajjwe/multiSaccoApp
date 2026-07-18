# Monitoring Guide

The Java backend exposes two monitoring surfaces.

## Public Liveness

```text
GET /actuator/health
GET /api/v1/health
```

Use these for load balancer and uptime checks. They do not require authentication.

## Authenticated Operations Status

```text
GET /api/v1/operations/status
GET /api/v1/operations/status?tenantId=tenant_green
```

This endpoint requires a staff bearer token.

Platform users can view platform-wide status or pass `tenantId` for one SACCO. SACCO users can view only their own tenant.

The response includes:

- `database.reachable`
- tenant/user/member counts
- active member counts
- pending financial transaction count
- open loan count
- open complaint count
- mobile-money callback exceptions
- notification delivery exceptions
- closed accounting period count
- alert objects with `code`, `severity`, `count`, and `message`

## Suggested Alerts

- `callback_exceptions > 0`: critical, review payment provider callbacks.
- `pending_financial_transactions > 0` for more than one business day: warning, checker action required.
- `open_complaints > 0` older than SLA: warning, support follow-up required.
- `delivery_exceptions > 0`: warning, SMS/email provider follow-up required.
- `/actuator/health` not `UP`: critical, service unavailable.

## Operations Runbook

Use these checks for staging and production monitoring.

| Check | Source | Severity | Action |
| --- | --- | --- | --- |
| API liveness | `GET /actuator/health` | Critical | Restart or redeploy the backend, then check database connectivity and recent deployment logs. |
| API envelope | `GET /api/v1/health` | Critical | Confirm the reverse proxy reaches the Java API and security headers are present. |
| Database reachability | `operations.status.database.reachable` | Critical | Check PostgreSQL container/service health, credentials, network routing, and disk space. |
| Mobile-money exceptions | `operations.status.counts.callbackExceptions` | Critical | Compare provider reference, callback payload, member match, and duplicate/idempotency status before reposting or reversing. |
| Pending postings | `operations.status.counts.pendingFinancialTransactions` | Warning | Assign maker-checker approval review before end of business day. |
| Notification exceptions | `operations.status.counts.deliveryExceptions` | Warning | Check SMS/email provider credentials, recipient contact values, provider throttling, and delivery history. |
| Open complaints | `operations.status.counts.openComplaints` | Warning | Route overdue complaints to SACCO support or management escalation. |
| Backup restore rehearsal | `npm.cmd run backup:rehearse` | Critical | Run before a release candidate and record the backup file path plus pass/fail result. |

Minimum monitoring cadence:

- Every minute: `/actuator/health` or hosting platform health check.
- Every 5 minutes: authenticated operations status for platform scope.
- Daily: tenant-scoped operations status for each live SACCO.
- Before each release candidate: backup restore rehearsal.

Recommended alert thresholds:

- Critical immediately: health down, database unreachable, callback exceptions above `0`, backup rehearsal failure.
- Warning after 15 minutes: notification delivery exceptions above `0`.
- Warning after one business day: pending financial transactions above `0`.
- Warning after agreed SLA: open complaints above `0`.

## Example Checks

```powershell
$token = "<staff bearer token>"
Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } `
  -Uri "http://127.0.0.1:8080/api/v1/operations/status"
```

For tenant-scoped platform checks:

```powershell
Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } `
  -Uri "http://127.0.0.1:8080/api/v1/operations/status?tenantId=tenant_green"
```

## Backup Rehearsal

The restore rehearsal uses an isolated Docker Compose project and a disposable PostgreSQL volume. It creates a marker row, backs it up, deletes it, restores the dump, and fails if the marker row is missing.

```powershell
npm.cmd run backup:rehearse
```

Use alternate ports when needed:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-backup-restore.ps1 -PostgresPort 15436
```
