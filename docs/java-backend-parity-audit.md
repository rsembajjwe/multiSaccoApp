# Java Backend Parity Audit

Date: 2026-07-17

## Result

The Java/Spring Boot backend now covers the web UI route surface that was previously served only by the Node prototype bridge. The remaining migration gap was local frontend routing: `server.mjs` always handled `/api/v1` with the Node API.

That gap is now addressed with `JAVA_API_BASE`. When set, the local web server proxies `/api/v1/*` requests to the Java backend while continuing to serve the static frontend from `http://127.0.0.1:5173`.

## Covered Route Groups

- Health and operations status.
- Staff authentication, sessions, MFA, password reset, users, roles, permissions, and audit events.
- Tenant onboarding, tenant profiles, branches, members, contacts, beneficiaries, documents, statements, and member import template.
- Member self-service authentication, dashboard, notifications, mobile loans, mobile complaints, and guarantor decisions.
- Subscriptions, packages, and payment posting.
- Financial products, accounts, transactions, receipts, reversals, welfare claims, and approvals.
- Loans, guarantors, disbursement, and repayments.
- Accounting periods, chart of accounts, journal entries, expenses, suppliers, assets, statement lines, reconciliation, and regulatory reports.
- Mobile-money callbacks, notifications, notification templates, governance meetings, resolutions, and complaints.

## Java-Only Hardening Already Present

- MFA enable/verify endpoints.
- Password reset request/confirm endpoints.
- PostgreSQL/Flyway production profile and Docker deployment path.

## Local Java-Backed Frontend Mode

Start Spring Boot:

```powershell
npm.cmd run java:start
```

Start the frontend with `/api/v1` proxied to Java:

```powershell
npm.cmd run start:java-api
```

Or set a custom Java API base:

```powershell
$env:JAVA_API_BASE = "http://127.0.0.1:18080"
npm.cmd start
```

## Automated Proxy Verification

`node scripts/check-java-proxy-mode.mjs` starts a mock Java API and verifies that `server.mjs` forwards `/api/v1` requests, response headers, authorization headers, and JSON request bodies while still applying local security headers. The full `npm.cmd run check` command includes this verification before running the Java backend tests.
