# Technical Manual

This manual is for developers and operators maintaining the SACCO Management Platform.

## Architecture

The platform has three main parts:

- Browser frontend in `index.html`, `app.js`, and `styles.css`.
- SPA host and Java API proxy in `server.mjs`.
- Legacy demo fallback in `backend/`; this is not the production business backend.
- Java/Spring Boot production backend in `backend-java/`.

The Java backend is the production path. It uses Spring Boot, Spring MVC, Spring Data JPA, Flyway migrations, H2 for development tests, and PostgreSQL for production-like deployments.

## Running Locally

Production-style local development:

```powershell
npm.cmd run java:start
npm.cmd run start:java-api
```

Legacy demo fallback:

```powershell
npm.cmd start
```

This starts `server.mjs` without `JAVA_API_BASE`, so `/api/v1` uses the legacy in-memory Node fallback
only for local demonstrations. Do not use this mode for production-style testing.

Java backend:

```powershell
npm.cmd run java:start
```

Frontend proxied to the Java backend:

```powershell
npm.cmd run java:start
npm.cmd run start:java-api
```

When `JAVA_API_BASE` is set, `server.mjs` forwards `/api/v1/*` requests to Spring Boot and still serves the frontend locally. See `docs/java-backend-parity-audit.md` for the route parity checkpoint.

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

This validates JavaScript syntax, mobile foundation contracts, Java proxy-mode forwarding, and the Java backend test suite.

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the same check on pushes and pull requests to `main`.

Run only Java tests:

```powershell
npm.cmd run java:test
```

Run the legacy demo API smoke test:

```powershell
npm.cmd run test:api
```

This smoke test is retained only to keep the local/demo fallback from breaking while the Java backend
remains the production source of truth. When it starts `server.mjs` itself, it explicitly sets
`SACCO_NODE_API_ENABLED=true` and a demo-fallback reason so the legacy mode cannot look accidental.

Run only the Java proxy-mode check:

```powershell
node scripts/check-java-proxy-mode.mjs
```

This starts a mock Java API, runs `server.mjs` with `JAVA_API_BASE`, and verifies `/api/v1` status, headers, authorization, and request-body forwarding.

Run a lightweight mixed-scenario load test against a running Java backend:

```powershell
npm.cmd run load:test
```

The load test defaults to `http://127.0.0.1:8080`, 100 requests, concurrency 10, a 1,000 ms p95 latency limit, a 2,000 ms p99 latency limit, a 1 req/s minimum throughput, and a 5,000 ms per-request timeout. It logs total throughput, p50/p95/p99 latency, scenario-level metrics, and a `LOAD_SUMMARY_JSON` line for release evidence. Override values with `LOAD_BASE_URL`, `LOAD_REQUESTS`, `LOAD_CONCURRENCY`, `LOAD_P95_MS`, `LOAD_P99_MS`, `LOAD_MIN_RPS`, and `LOAD_TIMEOUT_MS`.

The default scenario mix covers health, operations status, SACCO account listing, subscriptions, platform users, audit events, regulatory reports, and provider operational evidence. Use `npm.cmd run load:evidence` to write the timestamped report under `reports/load-evidence/`.

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

Use `docs/security-review.md` as the production security release gate. Critical findings must be closed or formally accepted before release.

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
3. Review `docs/security-review.md` and close or accept any critical findings.
4. Build the Docker backend image.
5. Confirm `.env` values are production safe.
6. Run database backup before migration.
7. Start the stack and confirm `/actuator/health`.
8. Check `/api/v1/operations/status`.
9. Run `npm.cmd run load:test` against the target environment or staging clone.
10. Verify staff login, member login, transaction approval, loan repayment, and reporting workflows.
11. Confirm backup creation after deployment.

## Troubleshooting

If the Java backend fails to start, check database connection variables and Flyway migration errors.

If tests fail after a migration, verify the H2-compatible SQL and seeded data assumptions.

If Docker commands fail on Windows, confirm Docker Desktop is running and the Linux engine is available.

If a user sees another tenant's data, treat it as a critical issue and add a regression test before fixing the route.
