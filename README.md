# SACCO Management Platform

A dependency-free browser prototype for the Multi-Tenant SACCO Management Platform for Uganda described in the requirements document.

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

## Developer checks

```powershell
npm.cmd run check
```

This checks the JavaScript syntax for the app and local server.

```powershell
npm.cmd run test:api
```

This starts the development server on a test port and verifies the Phase 1 API foundation.

The API smoke test now also covers Phase 2 branch and member onboarding endpoints.

After API login, the Members screen reads backend branches and members and posts new members to `/api/v1/members`.

After Platform Admin API login, the SACCO Registration screen reads backend tenants and posts new SACCO applications to `/api/v1/tenants`.

After Platform Admin API login, the Subscriptions screen reads backend packages/invoices and records subscription payments through `/api/v1/subscriptions/:id/payments`.

After SACCO API login, the Transactions screen reads backend financial postings and submits new pending transactions to `/api/v1/financial-transactions`.

After SACCO API login, the Loans screen reads backend loan files and submits new loan applications to `/api/v1/loans`.

SACCO staff can request loan guarantors, and members can accept or reject guarantee requests from the Member portal.

SACCO staff can approve guaranteed loan applications and disburse approved loans.

SACCO staff can record repayments on active loans, with balances reduced by the backend.

After API login, the Reports screen reads the backend chart of accounts and balanced journal entries.

Reports also show reconciliation results for imported bank, cash, mobile-money, and payroll statement lines.

Reports include governance meetings, open resolutions, and member/service complaints from the backend.

Reports include regulatory summaries with CSV export data for supervisory filing.

After API login, the Approvals screen reads pending financial postings and posts or rejects them through `/api/v1/financial-transactions/:id/status`.

Members can login from **Member portal** using the seeded account `GVS-0001` / `Member@12345` to view their savings, shares, and welfare balances.

## Demo roles

- Select **Platform Administration** to manage registrations, packages, subscriptions, support, and platform audit events.
- Select a SACCO tenant to manage members, transactions, loans, approvals, and member portal views for that SACCO.

## Production next steps

This is now the first build foundation. A production build should add:

- Backend REST API with `/api/v1/...` endpoints.
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

## Seed API accounts

- Platform admin: `admin@platform.local` / `Admin@12345`
- SACCO admin: `admin@greenvalley.local` / `Sacco@12345`
