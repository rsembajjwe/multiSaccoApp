# Security Audit Readiness Checklist

Use this checklist before engaging an independent penetration tester or code auditor. It does not
replace the audit; it makes sure the project team can provide repeatable evidence and respond to
findings cleanly.

## Audit Scope

The audit should cover:

- Staff login, member login, password reset, MFA, session expiry, logout, and token revocation.
- Platform/SACCO/member separation, including SACCO code routing and tenant isolation.
- Role-based access control for platform administrators, SACCO staff, branch-scoped users, and members.
- Financial posting, maker-checker approvals, reversals, loan repayments, subscription payments, and closed periods.
- Mobile-money callbacks, signed callback verification, idempotency, provider status checks, and reconciliation.
- Bank statement import, duplicate references, closed-period rejection, and reconciliation matching.
- Notification providers, SMS/email delivery logs, retries, and secret handling.
- PII masking, National ID encryption, privacy requests, KYC document disposal, and audit logs.
- Browser security headers, CSP, CORS/reverse proxy, offline/PWA behavior, and local storage token handling.
- Docker/Hetzner deployment, `.env` handling, backups, rollback, monitoring, and incident response.

## Evidence To Prepare

Attach or provide:

- Current commit SHA and release evidence pack from `npm.cmd run release:evidence`.
- PostgreSQL/Flyway evidence from `npm.cmd run postgres:check` or hosted migration output.
- Production readiness evidence from `npm.cmd run ready:check` or CI release-gate artifact.
- Security hardening output from `API_BASE_URL=<candidate-api>/api/v1 npm.cmd run security:check`.
- Java backend test report and JaCoCo coverage summary.
- Browser regression and browser accessibility evidence.
- OpenAPI specification and API route map.
- Deployment, staging handoff, incident, compliance, secrets, DR, and monitoring runbooks.
- A redacted environment inventory showing provider IDs and secret names, never secret values.

## Test Accounts

Provide named, temporary, non-production accounts for:

- Platform Super Admin.
- Platform Operations or Support user with restricted permissions.
- SACCO Administrator.
- Treasurer or Accountant.
- Branch-scoped SACCO staff user.
- Member portal user.

All auditor accounts must be disabled or rotated after the test window. Do not share production
bootstrap credentials.

## Rules Of Engagement

Record before testing starts:

- Environment URL and API base URL.
- Testing window and timezone.
- Allowed attack types and prohibited destructive actions.
- Contact person for urgent findings.
- Data set classification and whether real member data is present.
- Backup/restore owner and latest restore point.
- Finding severity model and response SLA.

## Finding Triage

| Severity | Examples | Required action |
| --- | --- | --- |
| Critical | Cross-SACCO data exposure, credential leak, unauthenticated privileged action, financial posting bypass | Stop release until fixed and retested |
| High | Authorization bypass, callback signature bypass, PII exposure, persistent XSS, insecure secret handling | Fix before external UAT or launch unless explicitly accepted by owner |
| Medium | Missing hardening header, weak rate-limit edge case, confusing permission boundary | Fix or add accepted risk with owner and date |
| Low | Documentation gap, minor UI security wording issue | Track for next release |

## Closure

Production launch must not proceed until:

- All Critical findings are closed and retested.
- All High findings are closed or explicitly accepted with owner, expiry, and compensating controls.
- The release evidence template includes the final audit report reference.
- Temporary auditor accounts are disabled.
- Any secret or credential exposed during testing is rotated.
