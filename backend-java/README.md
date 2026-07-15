# SACCO Java Backend

Spring Boot backend for the Multi SACCO Management Platform.

## Run

```powershell
cd backend-java
.\mvnw.cmd spring-boot:run
```

The Java API starts on:

```text
http://127.0.0.1:8080/api/v1/health
```

## Test

```powershell
cd backend-java
.\mvnw.cmd test
```

## Current Scope

- Java 17.
- Spring Boot 4.0.
- `/api/v1/health` with the same `{ "data": ... }` API envelope used by the prototype.
- `/api/v1/tenants` backed by a Flyway migration and seeded tenant records.
- `/api/v1/auth/login` for seeded staff users, using PBKDF2 password verification and safe user responses.
- `/api/v1/auth/me` and `/api/v1/auth/logout` backed by hashed bearer-token sessions.
- `/api/v1/users` for authenticated tenant-scoped user listing and staff creation.
- Baseline security headers on responses.
- H2 development datasource configured in PostgreSQL compatibility mode.
- PostgreSQL and Flyway dependencies included for the production database path.

Seed logins:

- Platform admin: `admin@platform.local` / `Admin@12345`
- SACCO admin: `admin@greenvalley.local` / `Sacco@12345`
