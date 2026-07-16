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
- `/api/v1/tenants/{tenantId}/profile` for tenant-scoped SACCO legal/contact profile read and update.
- `/api/v1/auth/login` for seeded staff users, using PBKDF2 password verification and safe user responses.
- `/api/v1/auth/me` and `/api/v1/auth/logout` backed by hashed bearer-token sessions.
- `/api/v1/users` for authenticated tenant-scoped user listing and staff creation.
- `/api/v1/users/{userId}/roles` for tenant-scoped staff role assignment and role listing.
- `/api/v1/roles` and `/api/v1/permissions` for seeded permission catalogs, tenant-scoped role listing, and custom role creation.
- `/api/v1/audit-events` for authenticated tenant-scoped audit listing and manual audit capture.
- `/api/v1/branches` for authenticated tenant-scoped branch listing and creation.
- `/api/v1/members` for authenticated tenant-scoped member listing, registration, bulk-import template, detail, and status updates.
- `/api/v1/members/{memberId}/statement` for posted member movements with running savings, shares, welfare balances, and CSV export text.
- `/api/v1/members/{memberId}/next-of-kin` and `/api/v1/members/{memberId}/beneficiaries` for tenant-scoped member contacts and beneficiary allocations.
- `/api/v1/members/{memberId}/documents` for tenant-scoped KYC/document metadata listing and upload.
- `/api/v1/member-auth/login`, `/api/v1/member-auth/me`, and `/api/v1/member-auth/logout` for member portal sessions and balances.
- `/api/v1/member-auth/notifications` for authenticated-member-only in-app notification history.
- `/api/v1/member-auth/mobile-dashboard` and `/api/v1/member-auth/mobile-loans` for server-confirmed member mobile balances, loans, notifications, pending guarantor requests, and mobile loan applications.
- `/api/v1/subscription-packages`, `/api/v1/subscriptions`, and `/api/v1/subscriptions/{subscriptionId}/payments` for tiered annual billing, tenant-scoped subscription visibility, platform payment posting, and subscription payment journals.
- `/api/v1/financial-transactions` for savings, shares, welfare, and withdrawal posting workflows.
- `/api/v1/financial-transactions/{transactionId}/receipt` for printable receipt details on posted financial transactions.
- `/api/v1/financial-transactions/{transactionId}/reversal` for posted reversal entries that reference the original transaction and update balances.
- `/api/v1/chart-of-accounts` and `/api/v1/journal-entries` for seeded accounting accounts and balanced journals derived from posted Java financial and loan events.
- `/api/v1/accounting-periods` for tenant-scoped period listing, close/reopen controls, and closed-period posting protection.
- `/api/v1/suppliers` and `/api/v1/expenses` for tenant-scoped supplier setup, posted operating expenses, and balanced expense journals.
- `/api/v1/assets` for tenant-scoped fixed asset registration, acquisition journals, and derived depreciation journals.
- `/api/v1/statement-lines` and `/api/v1/reconciliation` for statement imports and matched/unmatched cash ledger movements.
- `/api/v1/regulatory-report` for tenant and consolidated supervisory summaries with CSV export text.
- `/api/v1/integrations/mobile-money/callback` and `/api/v1/integrations/mobile-money/callbacks` for idempotent provider payment callbacks and tenant-scoped callback history.
- `/api/v1/notifications/deliveries` for tenant-scoped demo SMS/email delivery history generated from payment notifications.
- `/api/v1/governance-meetings` for tenant-scoped meeting records, nested resolutions, audit events, and regulatory open-resolution totals.
- `/api/v1/complaints` and `/api/v1/member-auth/mobile-complaints` for staff complaint management, member mobile complaint sync, audit events, and regulatory open-complaint totals.
- `/api/v1/loans` for tenant-scoped loan file listing, staff-submitted applications, decisions, and disbursement.
- `/api/v1/loans/{loanId}/guarantors` and `/api/v1/member-auth/guarantor-requests` for staff guarantor requests and member accept/reject decisions.
- `/api/v1/loans/{loanId}/repayments` for staff repayment capture, duplicate reference controls, balance reduction, and loan closure on full payoff.
- `/api/v1/approval-workflows` and `/api/v1/approval-decisions` for tenant-scoped approval setup, approver decisions, and audit-backed decision history.
- Baseline security headers on responses.
- H2 development datasource configured in PostgreSQL compatibility mode.
- PostgreSQL and Flyway dependencies included for the production database path.
- Lombok is configured for concise DTOs and constructor injection in new Java modules.

Seed logins:

- Platform admin: `admin@platform.local` / `Admin@12345`
- SACCO admin: `admin@greenvalley.local` / `Sacco@12345`
- Member portal: `GVS-0001` / `Member@12345`
