# SACCO Management Platform

A SACCO Management Platform for Uganda described in the requirements document.

The production backend path is Java/Spring Boot in `backend-java`. The current Node server remains as a working prototype bridge, and it can now proxy `/api/v1` traffic to the Java backend with `JAVA_API_BASE`.

## What is included

- Platform administration dashboard.
- SACCO self-registration and approval workflow.
- Subscription packages, invoices, and payment activation.
- Tiered annual subscription billing, with UGX 5,000/member for SACCOs up to 250 members and fixed tiers above that.
- Tenant switching with tenant-scoped demo data.
- Branch-aware member registration and KYC statuses.
- Savings, shares, and welfare transaction posting.
- Maker-checker approval queue.
- Loan application and appraisal queue.
- Java-backed dashboard and operations center with live health counts, alerts, release gates, and runbook links.
- Member self-service portal.
- Member login with balance viewing.
- Reports, compliance snapshot, and audit trail.

## How to run

Option 1: open `index.html` in a modern browser.

Option 2: run a local server:

```powershell
npm.cmd start
```

Then open:

```text
http://127.0.0.1:5173
```

No installation is required. The app uses browser `localStorage` for demo data, and the **Reset demo** button restores the original dataset.

Run the Java backend:

```powershell
npm.cmd run java:start
```

Then open:

```text
http://127.0.0.1:8080/api/v1/health
```

Run the frontend against the Java backend instead of the Node prototype bridge:

```powershell
npm.cmd run java:start
npm.cmd run start:java-api
```

This keeps the app at `http://127.0.0.1:5173` while proxying `/api/v1/*` requests to `http://127.0.0.1:8080`.

If port `8080` is already used locally, run from `backend-java` with:

```powershell
.\mvnw.cmd spring-boot:run -Dspring-boot.run.arguments=--server.port=18080
```

Run the Java backend with PostgreSQL through Docker Compose:

```powershell
Copy-Item deploy\backend.env.example .env
npm.cmd run deploy:backend
```

Then open:

```text
http://127.0.0.1:8080/actuator/health
```

## Developer checks

```powershell
npm.cmd run check
```

This checks the JavaScript syntax for the app and local server, validates mobile contracts, verifies Java proxy-mode forwarding with a mock upstream API, and runs the Java backend tests. GitHub Actions runs this same check on pushes and pull requests to `main`.

```powershell
npm.cmd run postgres:check
```

This starts an isolated Docker Compose stack on PostgreSQL, applies Flyway migrations, smoke-tests login, tenants, members, transactions, loans, reports, and then runs the security hardening checks against the Java API.

```powershell
npm.cmd run security:check
npm.cmd run ui:check
npm.cmd run ui:browser
```

`security:check` expects a running API and uses `API_BASE_URL` when set. `ui:check` protects the Java-backed source, loading, error, and last-sync panels across the main screens.

`ui:browser` runs a Playwright browser regression against the Java-backed UI. It starts the local frontend proxy unless `UI_BASE_URL` is set, expects a Java API at `JAVA_API_BASE` or `http://127.0.0.1:8080`, logs in as the seeded platform admin and member, then verifies Dashboard, SACCO Registration, Subscriptions, Members, Operations, and Member Portal source/sync panels.

```powershell
npm.cmd run java:test
```

This runs the Java/Spring Boot backend tests.

The Java backend now owns the tenant foundation endpoint:

```text
GET http://127.0.0.1:8080/api/v1/tenants
GET http://127.0.0.1:8080/api/v1/tenants/{tenantId}
POST http://127.0.0.1:8080/api/v1/tenants
PATCH http://127.0.0.1:8080/api/v1/tenants/{tenantId}/status
POST http://127.0.0.1:8080/api/v1/auth/login
GET http://127.0.0.1:8080/api/v1/auth/me
POST http://127.0.0.1:8080/api/v1/auth/logout
GET http://127.0.0.1:8080/api/v1/users
POST http://127.0.0.1:8080/api/v1/users
GET http://127.0.0.1:8080/api/v1/audit-events
POST http://127.0.0.1:8080/api/v1/audit-events
GET http://127.0.0.1:8080/api/v1/branches
POST http://127.0.0.1:8080/api/v1/branches
GET http://127.0.0.1:8080/api/v1/members
POST http://127.0.0.1:8080/api/v1/members
GET http://127.0.0.1:8080/api/v1/members/{memberId}
PATCH http://127.0.0.1:8080/api/v1/members/{memberId}/status
POST http://127.0.0.1:8080/api/v1/member-auth/login
GET http://127.0.0.1:8080/api/v1/member-auth/me
POST http://127.0.0.1:8080/api/v1/member-auth/logout
GET http://127.0.0.1:8080/api/v1/financial-transactions
POST http://127.0.0.1:8080/api/v1/financial-transactions
PATCH http://127.0.0.1:8080/api/v1/financial-transactions/{transactionId}/status
GET http://127.0.0.1:8080/api/v1/chart-of-accounts
GET http://127.0.0.1:8080/api/v1/journal-entries
GET http://127.0.0.1:8080/api/v1/accounting-periods
PATCH http://127.0.0.1:8080/api/v1/accounting-periods/{periodId}/status
GET http://127.0.0.1:8080/api/v1/suppliers
POST http://127.0.0.1:8080/api/v1/suppliers
GET http://127.0.0.1:8080/api/v1/expenses
POST http://127.0.0.1:8080/api/v1/expenses
GET http://127.0.0.1:8080/api/v1/assets
POST http://127.0.0.1:8080/api/v1/assets
GET http://127.0.0.1:8080/api/v1/statement-lines
POST http://127.0.0.1:8080/api/v1/statement-lines
GET http://127.0.0.1:8080/api/v1/reconciliation
GET http://127.0.0.1:8080/api/v1/regulatory-report
POST http://127.0.0.1:8080/api/v1/integrations/mobile-money/callback
GET http://127.0.0.1:8080/api/v1/integrations/mobile-money/callbacks
GET http://127.0.0.1:8080/api/v1/notifications/deliveries
GET http://127.0.0.1:8080/api/v1/governance-meetings
POST http://127.0.0.1:8080/api/v1/governance-meetings
POST http://127.0.0.1:8080/api/v1/governance-meetings/{meetingId}/resolutions
GET http://127.0.0.1:8080/api/v1/complaints
POST http://127.0.0.1:8080/api/v1/complaints
PATCH http://127.0.0.1:8080/api/v1/complaints/{complaintId}/status
POST http://127.0.0.1:8080/api/v1/member-auth/mobile-complaints
GET http://127.0.0.1:8080/api/v1/loans
POST http://127.0.0.1:8080/api/v1/loans
PATCH http://127.0.0.1:8080/api/v1/loans/{loanId}/status
POST http://127.0.0.1:8080/api/v1/loans/{loanId}/disburse
GET http://127.0.0.1:8080/api/v1/loans/{loanId}/guarantors
POST http://127.0.0.1:8080/api/v1/loans/{loanId}/guarantors
GET http://127.0.0.1:8080/api/v1/loans/{loanId}/repayments
POST http://127.0.0.1:8080/api/v1/loans/{loanId}/repayments
GET http://127.0.0.1:8080/api/v1/member-auth/guarantor-requests
PATCH http://127.0.0.1:8080/api/v1/member-auth/guarantor-requests/{guarantorId}/status
```

```powershell
npm.cmd run test:api
```

This starts the development server on a test port and verifies the Phase 1 API foundation.

To run the same smoke test against a running Java backend:

```powershell
$env:API_BASE_URL = "http://127.0.0.1:8080/api/v1"
$env:SKIP_RATE_LIMIT_TEST = "1"
npm.cmd run test:api
Remove-Item Env:\API_BASE_URL, Env:\SKIP_RATE_LIMIT_TEST
```

The API smoke test now also covers Phase 2 branch and member onboarding endpoints.

After API login, the Members screen reads backend branches and members and posts new members to `/api/v1/members`.

After Platform Admin API login, the SACCO Registration screen reads backend tenants and posts new SACCO applications to `/api/v1/tenants`.

SACCO Registration also shows a backend-backed onboarding control center for applications, approvals, licence watch, onboarding progress, package coverage, and activation gates.

After Platform Admin API login, the Subscriptions screen reads backend packages/invoices and records subscription payments through `/api/v1/subscriptions/:id/payments`.

Subscriptions also shows a billing control center for invoice totals, paid/outstanding balances, active subscriptions, billable members, per-member tier usage, fixed-tier usage, and payment access.

After SACCO API login, the Transactions screen reads backend financial postings and submits new pending transactions to `/api/v1/financial-transactions`.

Transactions also shows a backend-backed posting control center with posted, pending, reversed, reversible, rejected, and statement-ready totals plus direct receipt, statement, and reversal actions.

After SACCO API login, the Loans screen reads backend loan files and submits new loan applications to `/api/v1/loans`.

Loans also shows a backend-backed control center with portfolio value, outstanding balance, ready-to-disburse loans, repayments, guarantor-pending counts, and DSR watch indicators.

SACCO staff can request loan guarantors, and members can accept or reject guarantee requests from the Member portal.

SACCO staff can approve guaranteed loan applications and disburse approved loans.

SACCO staff can record repayments on active loans, with balances reduced by the backend.

After API login, the Reports screen reads the backend chart of accounts and balanced journal entries.

Reports also shows a backend-backed control center for ledger integrity, reconciliation exceptions, compliance status, governance items, accounting periods, operations exceptions, and operating assets.

Reports also show reconciliation results for imported bank, cash, mobile-money, and payroll statement lines.

Reports include governance meetings, open resolutions, and member/service complaints from the backend.

Reports include regulatory summaries with CSV export data for supervisory filing.

Reports include accounting periods, and closed periods block ordinary financial postings.

Reports include supplier expenses, and posted expenses feed the accounting ledger.

Reports include a fixed asset register, acquisition journals, and derived depreciation journals.

Reports include mobile-money callback history, and duplicate provider callbacks are idempotent.

Members receive in-app notifications for mobile-money collections and loan repayments.

Reports and Dashboard show simulated SMS/email provider deliveries for member notifications.

Operations shows Java-backed monitoring counts, operational alerts, production readiness gates, and direct links to Phase 7 runbooks after API login.

Dashboard KPIs switch to backend member, transaction, loan, approval, audit, and operations counts after API login.

The app shell shows a status strip for tenant context, staff API session, member session, operations scope, and last backend sync across every screen.

Operations shows a backend-backed command center for release readiness, alert load, exception load, queue pressure, API scope, database status, and runbook coverage.

Members shows backend summary KPIs, balance totals, branch coverage, and direct statement/profile actions after API login.

Member Portal includes a mobile dashboard card with server-confirmed balances, last-updated time, loan totals, notifications, and a demo mobile-money payment action.

Member Portal also shows a self-service control center for total balance, loan exposure, guarantee decisions, notifications, server status, offline drafts, and member/KYC status.

Members can submit a mobile loan application from the Member Portal and see the dashboard refresh after server confirmation.

Members can save offline complaint drafts locally and sync them later from the Member Portal.

Android member app foundation lives in `mobile/member_app`, with a Flutter-ready API contract for emulator base URL `http://10.0.2.2:5173/api/v1`.

All API and static responses now include baseline security headers, and public login/callback endpoints include in-memory rate limiting for the development build.

After API login, the Approvals screen reads pending financial postings and posts or rejects them through `/api/v1/financial-transactions/:id/status`.

Approvals also shows a backend-backed control center for pending queue size, pending value, workflow coverage, decision history, corrections, and checker-clear status.

Members can login from **Member portal** using the seeded account `GVS-0001` / `Member@12345` to view their savings, shares, and welfare balances.

## Demo roles

- Select **Platform Administration** to manage registrations, packages, subscriptions, support, and platform audit events.
- Select a SACCO tenant to manage members, transactions, loans, approvals, and member portal views for that SACCO.

## Production next steps

This is now the first build foundation. A production build should add:

- Java/Spring Boot REST API with `/api/v1/...` endpoints.
- PostgreSQL schema with mandatory `tenant_id` on tenant-owned tables.
- Strong authentication, MFA, RBAC, branch restrictions, and approval limits.
- Real mobile-money and bank integrations.
- Immutable financial ledgers and balanced journal entries.
- File uploads, malware scanning, and object storage.
- Android app, preferably Flutter as recommended in the requirements.
- Automated tests for tenant isolation, permissions, financial calculations, and callbacks.

## Planning

- [Development plan](docs/development-plan.md)
- [Requirements trace](docs/requirements-trace.md)
- [Data model](docs/data-model.md)
- [API route map](docs/api-route-map.md)
- [Deployment guide](docs/deployment.md)
- [Monitoring guide](docs/monitoring.md)
- [User manual](docs/user-manual.md)
- [Administrator manual](docs/administrator-manual.md)
- [Technical manual](docs/technical-manual.md)
- [Security review checklist](docs/security-review.md)
- [Android member app foundation](mobile/member_app/README.md)

## Seed API accounts

- Platform admin: `admin@platform.local` / `Admin@12345`
- SACCO admin: `admin@greenvalley.local` / `Sacco@12345`
