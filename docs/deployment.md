# Deployment Guide

This guide covers the Java/Spring Boot backend deployment path with PostgreSQL.

## Prerequisites

- Docker Desktop or Docker Engine with Compose.
- Java 17 only if running outside Docker.

## Local Production-Like Stack

Create a local environment file from the tracked example:

```powershell
Copy-Item deploy\backend.env.example .env
```

Edit `.env` and set a strong `POSTGRES_PASSWORD`.

Keep `SACCO_DEMO_LOGINS_ENABLED=false` outside development/demo verification. The production Spring profile defaults seeded staff/member demo logins to disabled unless this environment variable is explicitly enabled.

Start PostgreSQL and the Java backend:

```powershell
docker compose up --build
```

Health check:

```text
http://127.0.0.1:8080/actuator/health
```

API health:

```text
http://127.0.0.1:8080/api/v1/health
```

## Services

- `postgres`: PostgreSQL 16 with persisted `postgres_data` volume.
- `backend`: Java API built from `backend-java/Dockerfile` with `SPRING_PROFILES_ACTIVE=prod`.

## Configuration

The production profile reads these environment variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SERVER_PORT`

Compose derives these from:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `BACKEND_PORT`
- `SACCO_DEMO_LOGINS_ENABLED`
- `SACCO_AUTH_RATE_LIMIT_MAX_FAILURES`
- `SACCO_AUTH_RATE_LIMIT_WINDOW_SECONDS`

## Migrations

Flyway runs automatically on backend startup. Do not edit an applied migration in production; add a new `VNN__description.sql` migration instead.

For a local PostgreSQL verification run:

```powershell
npm.cmd run postgres:check
```

The script uses an isolated Compose project, alternate ports `15432` and `18080`, and a throwaway database volume. It confirms `flyway_schema_history`, runs the API smoke test against the Java backend, then runs the security hardening checks.

## Backup

Create a database backup:

```powershell
npm.cmd run backup:db
```

By default, backups are written to `backups/` and are ignored by git.

Restore from a backup:

```powershell
npm.cmd run restore:db -- -BackupPath .\backups\sacco_app-YYYYMMDD-HHMMSS.dump -ConfirmRestore
```

Restore is destructive because it runs `pg_restore --clean --if-exists`. Confirm the target environment and backup path before using `-ConfirmRestore`.

## Load Test

After the backend is running, execute the baseline load check:

```powershell
npm.cmd run load:test
```

Defaults are 100 requests, concurrency 10, and p95 latency below 1,000 ms against `http://127.0.0.1:8080`. For a larger staging check:

```powershell
$env:LOAD_REQUESTS = "1000"
$env:LOAD_CONCURRENCY = "25"
$env:LOAD_P95_MS = "1500"
npm.cmd run load:test
```

## Stop

```powershell
docker compose down
```

To remove the local database volume:

```powershell
docker compose down -v
```
