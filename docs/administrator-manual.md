# Administrator Manual

This manual is for platform administrators and SACCO administrators responsible for setup, oversight, and controlled operations.

## Platform Administration

Platform administrators manage the multi-SACCO environment.

Core responsibilities:

- Review SACCO registration applications.
- Approve, activate, suspend, or terminate SACCO tenants.
- Monitor subscriptions and post subscription payments.
- View platform-wide audit events.
- Review operational status across tenants.
- Maintain platform-level roles, permissions, and privileged staff access.

Use `admin@platform.local` / `Admin@12345` in the seeded development environment.

## SACCO Administration

SACCO administrators manage only their own tenant.

Core responsibilities:

- Maintain SACCO legal and contact profile details.
- Create branches.
- Create staff users.
- Assign tenant roles.
- Configure financial products and member accounts.
- Oversee member onboarding and KYC.
- Monitor approvals, reversals, complaints, and governance actions.

Cross-tenant reads and writes are blocked for SACCO administrators.

## Subscription Administration

Subscription billing follows the configured SACCO member-count model:

- Up to 250 members: UGX 5,000 per member per year, with a 100-member minimum.
- Above 250 members: fixed annual package tiers are retained for larger SACCO bands.

Only platform administrators can post subscription payments. Payments are idempotent by external reference and feed accounting journals.

## Identity and Access

Administrators should apply these controls:

- Create named users for each staff member.
- Assign roles based on job responsibility.
- Use MFA for privileged staff accounts.
- Reset passwords through the password-reset workflow instead of sharing credentials.
- Remove or suspend access when staff leave.

Role and permission changes are tenant-scoped and audited.

## Operational Monitoring

Use:

```text
GET /api/v1/operations/status
GET /api/v1/operations/status?tenantId=tenant_green
```

The endpoint returns database reachability, key counts, and alerts for pending postings, open complaints, callback exceptions, and delivery exceptions.

Suggested daily checks:

- Pending financial transactions.
- Mobile-money callback exceptions.
- Notification delivery exceptions.
- Open complaints.
- Recently closed accounting periods.

## Backup and Restore

Create backups from the project root:

```powershell
npm.cmd run backup:db
```

Restore only after confirming the target environment:

```powershell
npm.cmd run restore:db -- -BackupPath .\backups\sacco_app-YYYYMMDD-HHMMSS.dump -ConfirmRestore
```

Restore is destructive because the script cleans existing database objects before loading the backup.

## Incident Checklist

For posting or payment issues:

1. Check the audit trail for the member, transaction, or callback reference.
2. Check operations status alerts.
3. Review reconciliation unmatched lines.
4. Use reversals for posted financial corrections.
5. Avoid editing database records directly.

For login issues:

1. Confirm the user or member is active.
2. Use password reset for staff credentials.
3. Check whether MFA is enabled and a challenge is pending.
4. Revoke sessions when account compromise is suspected.
