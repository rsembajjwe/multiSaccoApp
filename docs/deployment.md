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

## Migrations

Flyway runs automatically on backend startup. Do not edit an applied migration in production; add a new `VNN__description.sql` migration instead.

## Backup

Create a database backup:

```powershell
docker compose exec postgres pg_dump -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Fc -f /tmp/sacco_app.dump
docker compose cp postgres:/tmp/sacco_app.dump .\sacco_app.dump
```

Restore into a clean database:

```powershell
docker compose cp .\sacco_app.dump postgres:/tmp/sacco_app.dump
docker compose exec postgres pg_restore -U $env:POSTGRES_USER -d $env:POSTGRES_DB --clean --if-exists /tmp/sacco_app.dump
```

## Stop

```powershell
docker compose down
```

To remove the local database volume:

```powershell
docker compose down -v
```
