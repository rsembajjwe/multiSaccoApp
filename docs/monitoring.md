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
