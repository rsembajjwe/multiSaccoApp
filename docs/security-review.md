# Security Review Checklist

This checklist tracks security controls required before production use.

## Current Status

No unresolved critical security finding is recorded in this project documentation as of the current Phase 7 hardening pass. Treat any confirmed cross-tenant data exposure, credential leak, unaudited financial mutation, or unauthenticated privileged action as critical.

## Release Gates

A production release must not proceed unless all critical items are closed or explicitly accepted by the system owner in writing.

Required gates:

- `npm.cmd run check` passes locally and in CI.
- `npm.cmd run postgres:check` passes in a Docker/PostgreSQL environment before production release.
- `API_BASE_URL=http://host:port/api/v1 npm.cmd run security:check` passes against the release candidate backend.
- `npm.cmd run ui:check` passes before releasing UI/backend integration polish.
- Tenant isolation tests pass for staff, member, and platform routes.
- Permission tests pass for assigned role permissions, platform-only actions, and SACCO-only actions.
- Financial calculation tests pass for balances, loans, repayments, reversals, expenses, and subscriptions.
- Public endpoints are limited to health, login, member login, mobile-money callback, and static assets.
- Privileged staff MFA is available and tested.
- Password reset revokes active sessions after password rotation.
- Audit logs are created for sensitive administration, financial, member, loan, and access actions.
- Backup and restore procedures are tested on a non-production copy.
- Operational monitoring has no critical callback or delivery exception backlog.

## Authentication and Sessions

Evidence:

- Staff login: `POST /api/v1/auth/login`.
- Staff current session: `GET /api/v1/auth/me`.
- Staff logout: `POST /api/v1/auth/logout`.
- Member login: `POST /api/v1/member-auth/login`.
- Member current session: `GET /api/v1/member-auth/me`.

Checklist:

- Password hashes and salts are not returned in API responses.
- Bearer tokens are stored hashed server-side.
- Logout revokes the active session.
- Password reset tokens are hashed, expiring, and single use.
- MFA challenge codes are hashed and expire.
- Member sessions cannot call staff-only routes.
- Failed staff/member login attempts are rate limited and return `Retry-After`.
- Seeded demo staff/member credentials are disabled by default under the production Spring profile.
- Password reset and MFA secret material is returned only when demo logins are explicitly enabled.

## Concrete Pass/Fail Checks

| Control | Automated check | Pass condition |
| --- | --- | --- |
| PostgreSQL migrations | `npm.cmd run postgres:check` | Java backend starts on PostgreSQL and `flyway_schema_history` shows successful migrations. |
| API smoke | `npm.cmd run postgres:check` | Login, tenants, members, transactions, loans, reports, operations, subscriptions, and member portal endpoints pass against Java/PostgreSQL. |
| Headers | `npm.cmd run security:check` | Health/API responses include `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`. |
| Auth required | `npm.cmd run security:check` | Staff-only endpoints return `401` without a bearer token. |
| Token handling | `npm.cmd run security:check` | Login/me responses hide password hash/salt and logout revokes the token. |
| Tenant isolation | `npm.cmd run security:check` | SACCO staff cross-tenant profile, operations, and member import requests return `403`. |
| Tenant isolation regressions | `npm.cmd run java:test` | Staff, platform, audit, document, subscription, report, operation, and member-portal paths are tenant-scoped. |
| Member isolation | `npm.cmd run security:check` | Member sessions can read balances/loans/notifications/guarantors but cannot call staff APIs. |
| Assigned permissions | `npm.cmd run java:test` | Users without assigned role permissions receive `403 PERMISSION_REQUIRED` on protected tenant, user, and role endpoints. |
| Financial permissions | `npm.cmd run java:test` | Loans-only staff can access loan views but receive `403 PERMISSION_REQUIRED` on financial transaction and accounting endpoints. |
| Loan and approval permissions | `npm.cmd run java:test` | Loan-originator staff can create loan applications and view approval workflows but cannot approve loans, record repayments, or create approval decisions. |
| Operational permissions | `npm.cmd run java:test` | Loans-only and no-role staff receive `403 PERMISSION_REQUIRED` on operations, notification, governance, and complaint staff endpoints. |
| Rate limiting | `npm.cmd run security:check` | Repeated failed staff logins return `429` with `Retry-After`. |
| Demo gating | `npm.cmd run security:check` plus prod properties | `application-prod.properties` defaults `SACCO_DEMO_LOGINS_ENABLED` to `false`. |
| UI source/sync polish | `npm.cmd run ui:check` | Main screens retain source, last-sync, loading, error, and refresh contract text. |

## Authorization and Tenant Isolation

Checklist:

- Platform users can view platform-wide records only where intended.
- SACCO staff can access only their own tenant.
- Members can access only their own profile, dashboard, notifications, complaints, loans, and guarantor requests.
- Tenant-owned queries include tenant scoping.
- Cross-tenant route attempts return `403 TENANT_ACCESS_DENIED`.
- Platform-only actions return `403 PLATFORM_ADMIN_REQUIRED` for SACCO staff.

Regression tests should be added before fixing any isolation defect.

## Financial Controls

Checklist:

- New financial transactions start as `pending_approval`.
- Maker-checker controls prevent makers approving their own postings.
- Posted transactions update balances exactly once.
- Reversals create linked correcting entries and do not mutate the original posting.
- Duplicate external references are rejected or treated idempotently where appropriate.
- Closed accounting periods block ordinary posting, disbursement, repayment, expenses, assets, and statement imports.
- Loan disbursement requires approval.
- Loan repayment rejects duplicate references and overpayments.
- Subscription payments are platform-only and idempotent by external reference.

## Input and API Hardening

Checklist:

- Validation rejects malformed email, invalid status, invalid type, invalid channel, missing tenant, missing member, and non-positive amounts.
- Baseline security headers are present on API and static responses.
- Public login and callback endpoints are rate limited in the development build.
- Error responses use the standard envelope and do not expose stack traces.
- CSV export fields are generated by server-side projection and not by direct user-supplied raw output.

## Audit Trail

Sensitive operations should write audit events, including:

- Tenant creation and status changes.
- SACCO profile updates.
- User creation and role assignment.
- Password reset and MFA activity.
- Member creation, status updates, contacts, beneficiaries, and documents.
- Financial posting decisions and reversals.
- Loan approvals, disbursements, guarantor decisions, and repayments.
- Expense, asset, statement import, governance, complaint, and notification template actions.

## Operational Security

Checklist:

- `.env` is not committed.
- Local `backups/` are ignored by git.
- Production database credentials are strong and stored outside source control.
- Docker deployment uses the production profile and PostgreSQL.
- Production/demo seed logins are gated with `SACCO_DEMO_LOGINS_ENABLED=false` unless running an explicit demo verification.
- Backups are encrypted or stored in access-controlled infrastructure outside the project folder.
- Restore is tested with `-ConfirmRestore` only on approved targets.

## Finding Log

| ID | Severity | Status | Area | Finding | Resolution |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Critical | Closed | Baseline | Production hardening required documented gates for release. | Added this security review checklist and linked it from project manuals. |
