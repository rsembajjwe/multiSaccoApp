# PostgreSQL Integration Verification

Use this runbook before promoting a backend build beyond local development.

## Command

```powershell
npm.cmd run postgres:check
```

The script starts an isolated Docker Compose project named `saccoapp-postgres-check`, maps PostgreSQL to `15432`, maps the Java backend to `18080`, enables demo logins only for verification, and removes the throwaway database volume on exit.

## What It Verifies

- Docker/PostgreSQL startup with the Java backend under the `prod` Spring profile.
- Flyway migrations apply outside H2 and are visible in `flyway_schema_history`.
- Java-backed API smoke coverage for login, tenants, members, subscriptions, transactions, loans, accounting, reports, operations, and member portal endpoints.
- Runtime security checks for headers, auth requirements, logout, tenant isolation, member isolation, demo gating defaults, and login rate limits.

## Expected Result

The command ends with:

```text
PostgreSQL integration verification passed.
```

If Docker Desktop is installed but the engine is not running, start Docker Desktop and rerun the command.

## Latest Verified Run

Date: `2026-07-18`

Command:

```powershell
npm.cmd run postgres:check
```

Result: `PASS`

Evidence summary:

- Backend health became ready at `http://127.0.0.1:18080/api/v1/health`.
- Docker pulled `postgres:16-alpine`, built the Java backend image, and started the isolated `saccoapp-postgres-check` stack.
- PostgreSQL container reached `Healthy`.
- Flyway applied all `37` migrations successfully in PostgreSQL, from `V1__tenant_foundation.sql` through `V37__operations_governance_notification_permissions.sql`.
- Java/PostgreSQL API smoke test passed against `http://127.0.0.1:18080/api/v1`.
- Security hardening checks passed, including demo-login gating, security headers, bearer-token requirements, logout revocation, password-reset enumeration protection, tenant isolation, member/staff session isolation, and login rate limiting.
- The isolated Docker Compose stack and throwaway PostgreSQL volume were removed after the run.
