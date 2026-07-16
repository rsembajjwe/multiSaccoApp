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
- `/api/v1/tenants/{tenantId}` and `/api/v1/tenants/{tenantId}/status` for authenticated onboarding review.
- `/api/v1/auth/login` for seeded staff users, using PBKDF2 password verification and safe user responses.
- `/api/v1/auth/me` and `/api/v1/auth/logout` backed by hashed bearer-token sessions.
- `/api/v1/users` for authenticated tenant-scoped user listing and staff creation.
- `/api/v1/audit-events` for authenticated tenant-scoped audit listing and manual audit capture.
- `/api/v1/branches` for authenticated tenant-scoped branch listing and creation.
- `/api/v1/members` for authenticated tenant-scoped member listing, registration, detail, and status updates.
- `/api/v1/member-auth/login`, `/api/v1/member-auth/me`, and `/api/v1/member-auth/logout` for member portal sessions and balances.
- `/api/v1/financial-transactions` for savings, shares, welfare, and withdrawal posting workflows.
- `/api/v1/loans` for tenant-scoped loan file listing, staff-submitted applications, decisions, and disbursement.
- `/api/v1/loans/{loanId}/guarantors` and `/api/v1/member-auth/guarantor-requests` for staff guarantor requests and member accept/reject decisions.
- Baseline security headers on responses.
- H2 development datasource configured in PostgreSQL compatibility mode.
- PostgreSQL and Flyway dependencies included for the production database path.

Seed logins:

- Platform admin: `admin@platform.local` / `Admin@12345`
- SACCO admin: `admin@greenvalley.local` / `Sacco@12345`
- Member portal: `GVS-0001` / `Member@12345`
