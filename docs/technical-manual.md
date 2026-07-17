# Technical Manual

This manual is for developers and operators maintaining the SACCO Management Platform.

## Architecture

The platform has three main parts:

- Browser frontend in `index.html`, `app.js`, and `styles.css`.
- Prototype Node API in `server.mjs` and `backend/`.
- Java/Spring Boot production backend in `backend-java/`.

The Java backend is the production path. It uses Spring Boot, Spring MVC, Spring Data JPA, Flyway migrations, H2 for development tests, and PostgreSQL for production-like deployments.

## Running Locally

Frontend and prototype API:

```powershell
npm.cmd start
```

Java backend:

```powershell
npm.cmd run java:start
```

Production-like Docker stack:

```powershell
Copy-Item deploy\backend.env.example .env
npm.cmd run deploy:backend
```

## Validation

Run the full project check:

```powershell
npm.cmd run check
```

This validates JavaScript syntax, mobile foundation contracts, and the Java backend test suite.

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the same check on pushes and pull requests to `main`.

Run only Java tests:

```powershell
npm.cmd run java:test
```

Run the prototype API smoke test:

```powershell
npm.cmd run test:api
```

Run a lightweight load test against a running Java backend:

```powershell
npm.cmd run load:test
```

The load test defaults to `http://127.0.0.1:8080`, 100 requests, concurrency 10, and a 1,000 ms p95 latency limit. Override values with `LOAD_BASE_URL`, `LOAD_REQUESTS`, `LOAD_CONCURRENCY`, and `LOAD_P95_MS`.

## Database Migrations

Java migrations live in:

```text
backend-java/src/main/resources/db/migration
```

Rules:

- Add new migrations with the next `VNN__description.sql` number.
- Do not edit migrations that have already run in production.
- Keep tenant-owned tables keyed by `tenant_id`.
- Add indexes for tenant-scoped lookups and idempotency references.

## Security Controls

Implemented controls include:

- Baseline security headers.
- Hashed staff bearer sessions.
- Staff logout and session revocation.
- Staff password reset with hashed expiring reset tokens.
- MFA challenge flow for privileged users.
- Member-only sessions for member portal access.
- Tenant isolation for staff and member routes.
- Maker-checker approval on financial postings.
- Audit events for sensitive actions.
- Rate limiting for public login and callback endpoints in the development build.

## Operations Endpoints

Public health:

```text
GET /actuator/health
GET /api/v1/health
```

Authenticated operational status:

```text
GET /api/v1/operations/status
GET /api/v1/operations/status?tenantId=tenant_green
```

Platform users can request platform-wide status. SACCO users are restricted to their tenant.

## Backup and Restore

Scripts live in `scripts/`.

Create a backup:

```powershell
npm.cmd run backup:db
```

Restore a backup:

```powershell
npm.cmd run restore:db -- -BackupPath .\backups\sacco_app-YYYYMMDD-HHMMSS.dump -ConfirmRestore
```

The restore path requires explicit confirmation because it replaces the target database state.

## Release Checklist

Before a production release:

1. Run `npm.cmd run check`.
2. Confirm CI is passing on `main`.
3. Build the Docker backend image.
4. Confirm `.env` values are production safe.
5. Run database backup before migration.
6. Start the stack and confirm `/actuator/health`.
7. Check `/api/v1/operations/status`.
8. Run `npm.cmd run load:test` against the target environment or staging clone.
9. Verify staff login, member login, transaction approval, loan repayment, and reporting workflows.
10. Confirm backup creation after deployment.

## Troubleshooting

If the Java backend fails to start, check database connection variables and Flyway migration errors.

If tests fail after a migration, verify the H2-compatible SQL and seeded data assumptions.

If Docker commands fail on Windows, confirm Docker Desktop is running and the Linux engine is available.

If a user sees another tenant's data, treat it as a critical issue and add a regression test before fixing the route.
