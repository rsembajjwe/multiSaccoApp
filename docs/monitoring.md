# Monitoring Guide

The Java backend exposes two monitoring surfaces.

Production logs are written as structured JSON when the `prod` profile is active. Each request adds
`correlationId`, `requestMethod`, `requestPath`, and `clientIp` to the logging context. Query strings,
request bodies, and credentials are intentionally not added to logs.

## Public Health Endpoints

```text
GET /actuator/health/liveness
GET /actuator/health/readiness
GET /api/v1/health
```

Liveness answers whether the application process should be restarted. Readiness answers whether the
instance can safely receive traffic. The aggregate `/actuator/health` endpoint also includes
operational indicators and may report `DOWN` for capacity issues while both probes remain `UP`.

Use these for load balancer and uptime checks. They do not require authentication.

## Authenticated Operations Status

```text
GET /api/v1/operations/status
GET /api/v1/operations/status?tenantId=tenant_green
GET /api/v1/notifications/provider-evidence
GET /api/v1/notifications/provider-job-runs
POST /api/v1/notifications/provider-job-runs/mobile-money-reconciliation
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

The provider evidence endpoint adds SMS, email, and mobile-money operational evidence:

- notification delivery totals and failed deliveries
- provider readiness from AfroSMS/Gmail status checks
- mobile-money payment request totals, pending requests, failed requests, and callbacks
- mobile-money reconciliation job summary: scanned, updated, failed, and last run time

The provider job history endpoint returns the latest recorded background job runs so administrators can confirm when reconciliation last ran, how many requests were checked, and whether provider failures need review.

Use the manual reconciliation endpoint when provider callbacks are delayed or payment requests remain pending after the expected provider window. The action is permission-protected and recorded in audit events.

Manual payment request closure (`failed`, `expired`, or `cancelled`) is also recorded in audit events with the request reference and actor. It also creates an in-app staff alert for active SACCO administrators/finance staff, so payment exceptions are visible in notification delivery history as well as audit logs.

Mobile-money status reconciliation is scheduled by the backend. Tune it with:

```text
SACCO_MOBILE_MONEY_RECONCILIATION_ENABLED=true
SACCO_MOBILE_MONEY_RECONCILIATION_INITIAL_DELAY=PT1M
SACCO_MOBILE_MONEY_RECONCILIATION_FIXED_DELAY=PT5M
SACCO_MOBILE_MONEY_RECONCILIATION_BATCH_SIZE=50
```

## Suggested Alerts

Prometheus-ready API/JVM/database alert rules live in:

```text
deploy/prometheus-alerts.yml
```

Those rules cover API down, 5xx error rate, p95 latency, database pool pressure, JVM heap pressure,
repeated fleet-job recovery, and fleet-job organization failures. Production Compose loads the rules
through `deploy/prometheus.yml`; Prometheus is exposed only to the internal Compose network.

Production Compose also starts Alertmanager and Grafana on the internal network. Alertmanager sends
critical alerts every 15 minutes and warning alerts every two hours until resolution. Grafana
provisions the **Tereka Fleet Operations** dashboard with recovery, organization-failure, processing
rate, completion-outcome, and active-alert panels.

Before deploying, create root-readable secret files outside the repository and set their paths in
`deploy/hetzner.env`:

```text
ALERTMANAGER_WEBHOOK_URL_FILE=/opt/tereka/secrets/alertmanager-webhook-url
GRAFANA_ADMIN_PASSWORD_FILE=/opt/tereka/secrets/grafana-admin-password
```

The webhook file contains only the HTTPS destination URL. The Grafana file contains a unique strong
administrator password. Restrict both files to the deployment owner (`chmod 600`) and never add them
to Git or incident evidence. Grafana, Prometheus, and Alertmanager are intentionally not routed by
Caddy; administrators should use an authenticated SSH tunnel or private management network.
The authenticated Operations Status endpoint remains the source for business/operations alerts:

- `callback_exceptions > 0`: critical, review payment provider callbacks.
- `pending_financial_transactions > 0` for more than one business day: warning, checker action required.
- `open_complaints > 0` older than SLA: warning, support follow-up required.
- `delivery_exceptions > 0`: warning, SMS/email provider follow-up required.
- `/actuator/health/readiness` not `UP`: critical, service cannot safely receive traffic.
- `/actuator/health/liveness` not `UP`: critical, restart or replace the application instance.
- `/actuator/health` not `UP` while readiness is `UP`: warning, inspect aggregate indicators such as disk capacity without restarting the instance.
- `repeatedFleetJobRecoveries > 0`: critical, investigate stalled fleet-job processing.
- `fleetJobsWithFailures > 0`: warning, review per-organization bulk-job results.
- `overdueFleetApprovals > 0`: critical, assign a different platform operator and resolve the fleet decision queue.

Fleet approval notifications are sent immediately to active platform users with `tenants:manage`,
excluding the requester. The eight-hour target uses the Kampala business calendar (08:00-17:00,
Monday-Friday), pauses overnight and on weekends, and enters due-soon state with four business hours
remaining. Add observed public holidays as comma-separated ISO dates in
`SACCO_FLEET_APPROVAL_HOLIDAYS`; review that list annually. The zone, working hours, target, and
warning threshold can be changed through the `SACCO_FLEET_APPROVAL_*` environment variables in
`deploy/hetzner.env.example`. A scheduled scan sends idempotent warning and overdue notifications;
decision outcomes return to the requester. The scan defaults to every 15 minutes and can be tuned
with `SACCO_FLEET_APPROVAL_NOTIFICATION_DELAY`.

## Fleet Bulk-Job Recovery Runbook

Use this runbook for `TerekaFleetBulkJobRepeatedRecovery`,
`TerekaFleetBulkJobOrganizationFailures`, or the matching Operations Status alerts.

1. Open Platform Administration, then SACCO Accounts and Recent bulk jobs. Record the job ID,
   recovery count, latest recovery time, requested count, succeeded count, and failed count.
2. Open **Results** and export the CSV before retrying anything. Identify whether failures share a
   lifecycle action, portfolio owner, district, or missing organization record.
3. For repeated recovery, inspect backend logs around `lastRecoveredAt` on every application node.
   Search by job ID and compare `lastRecoveredBy` with container or host instance IDs.
4. Confirm database health, connection-pool pressure, application restarts, executor saturation, and
   lock waits. Do not manually change `heartbeat_at`, `recovery_count`, or result statuses.
5. If only individual organizations failed, correct the underlying tenant data or permission issue,
   then submit a new job containing only those organizations. Completed financial records must never
   be deleted or edited as part of recovery.
6. If recovery continues, pause new fleet bulk actions operationally, preserve logs and CSV evidence,
   and escalate to the platform engineering owner. Restarting is appropriate only after confirming
   the database is reachable and another healthy node is not actively processing the job.

Resolution evidence must include the alert time, job ID, affected organizations, recovery owner,
root cause, corrective action, and confirmation that a subsequent job completed without recovery.

After changing Alertmanager routes, run the isolated delivery test while Docker is available:

```powershell
npm.cmd run alert-routing:test
```

The test starts the pinned Alertmanager image with the production routing file, sends synthetic
critical and warning fleet alerts, verifies both receivers through a temporary local webhook, and
removes its container and secret file. It never contacts the production notification destination.

After changing Prometheus fleet alert expressions or thresholds, run their rule fixtures:

```powershell
npm.cmd run alerts:test
```

These fixtures verify both the firing thresholds and the below-threshold quiet state, including the
five-minute hold period and the operator-facing labels and annotations.

## Operations Runbook

Use these checks for staging and production monitoring.

| Check | Source | Severity | Action |
| --- | --- | --- | --- |
| API liveness | `GET /actuator/health/liveness` | Critical | Restart or redeploy the backend, then inspect recent deployment logs. |
| API readiness | `GET /actuator/health/readiness` | Critical | Remove the instance from traffic, then check database connectivity and startup state. |
| API envelope | `GET /api/v1/health` | Critical | Confirm the reverse proxy reaches the Java API and security headers are present. |
| Database reachability | `operations.status.database.reachable` | Critical | Check PostgreSQL container/service health, credentials, network routing, and disk space. |
| Mobile-money exceptions | `operations.status.counts.callbackExceptions` | Critical | Compare provider reference, callback payload, member match, and duplicate/idempotency status before reposting or reversing. |
| Pending postings | `operations.status.counts.pendingFinancialTransactions` | Warning | Assign maker-checker approval review before end of business day. |
| Notification exceptions | `operations.status.counts.deliveryExceptions` | Warning | Check SMS/email provider credentials, recipient contact values, provider throttling, and delivery history. |
| Repeated fleet-job recovery | `operations.status.counts.repeatedFleetJobRecoveries` | Critical | Follow the fleet bulk-job recovery runbook, correlate the job and instance IDs, and pause new bulk actions if recovery continues. |
| Fleet-job organization failures | `operations.status.counts.fleetJobsWithFailures` | Warning | Export job results, correct affected organization data, and retry only failed organizations. |
| Mobile-money reconciliation | `providerEvidence.mobileMoney.reconciliationSummary` | Warning | Confirm pending requests are being checked, provider status calls are succeeding, and callbacks are reconciling. |
| Open complaints | `operations.status.counts.openComplaints` | Warning | Route overdue complaints to SACCO support or management escalation. |
| Backup restore rehearsal | `npm.cmd run backup:rehearse` | Critical | Run before a release candidate and record the backup file path plus pass/fail result. |
| Database tuning evidence | `npm.cmd run db:evidence` | Important | Run before a release candidate and confirm pool settings, recovery targets, and DB runbook markers are still present. |
| Secrets evidence | `npm.cmd run secrets:evidence` | Critical | Run before a release candidate and confirm examples contain placeholders, runbooks cover rotation, and production secret guards remain documented. |
| Accessibility evidence | `npm.cmd run accessibility:evidence` | Important | Run before a release candidate and confirm skip links, landmark labels, current-page state, and visible focus markers remain present. |
| i18n evidence | `npm.cmd run i18n:evidence` | Important | Run before a release candidate and confirm supported locale metadata, RTL document wiring, fallback, and RTL CSS markers remain present. |
| Vite evidence | `npm.cmd run vite:evidence` | Important | Run before a release candidate and confirm Vite is installed and the current classic-script bridge build still emits `dist-vite/`. |

Minimum monitoring cadence:

- Every minute: `/actuator/health/liveness` for restart decisions and `/actuator/health/readiness` for traffic routing.
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

For release evidence, prefer the wrapper that records the rehearsal output:

```powershell
npm.cmd run backup:evidence
```

Use alternate ports when needed:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-backup-restore.ps1 -PostgresPort 15436
```
