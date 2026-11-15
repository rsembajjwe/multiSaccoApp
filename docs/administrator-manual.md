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

- Up to 250 members: UGX 5,000 per registered member per year, with no minimum member charge.
- Above 250 members: fixed annual package tiers are retained for larger SACCO bands.
- Proprietor SACCO registration lists the Community package for the up-to-250-member band and shows whether a price is per member or a fixed annual total.
- Fixed annual packages must be settled in one payment. A proprietor may upgrade a SACCO to a higher member-limit package; verified payments are credited and the remaining upgraded-package balance becomes due in full.

### SACCO official onboarding

- Proprietor registration captures a chairperson, treasurer, and secretary as the SACCO's first three verified members.
- Every official must have an active email address, an active international-format phone number, or both.
- The selected email or SMS channel receives a generated temporary password. First login requires a password change before staff access is granted.

### SMS revenue and credits

- The proprietor sets the platform selling price per SMS from Staff App Billing.
- Cash purchases are recorded by the proprietor against a SACCO and immediately credit that SACCO's prepaid SMS wallet.
- Mobile-money SMS purchases are initiated from the staff app at the same proprietor-controlled rate.
- Broadcasts and SMS notifications debit the SACCO wallet by the number of SMS segments sent. The member app only receives applicable messages; it does not control the SACCO wallet.

New SACCOs receive one month of free staff-app access. Platform administrators can grant an audited extension of 1-31 days with a required reason. This SACCO-level subscription controls staff operations and does not activate member-app accounts.

Member-app access is a separate UGX 5,000 annual subscription for each member. Its expiry always matches the SACCO staff-subscription cycle: if the SACCO cycle runs January 2026 to January 2027, a member paying in November 2026 still expires in January 2027. The fee is not prorated. Unpaid members remain fully manageable by authorised SACCO staff but are restricted to the member-app subscription payment screen.

Only platform administrators can post subscription payments. Payments are idempotent by external reference and feed accounting journals.

## Identity and Access

Administrators should apply these controls:

- Create named users for each staff member.
- Assign roles based on job responsibility.
- Use MFA for privileged staff accounts.
- Reset passwords through the password-reset workflow instead of sharing credentials.
- Remove or suspend access when staff leave.

Role and permission changes are tenant-scoped and audited.

### Protected Role Matrix

The default seed includes protected roles for platform oversight and SACCO operations. These roles give a safe starting point before creating SACCO-specific custom roles.

| Role | Scope | Main views |
|---|---|---|
| Platform Super Admin | Platform | Dashboard, SACCO Registration, Subscriptions, Members, Transactions, Loans, Approvals, Operations, Reports, Users/Roles |
| Platform Operations Officer | Platform | Dashboard, SACCO Registration view, Members view, Transactions view, Loans view, Approvals view, Operations, Reports, Notifications, Complaints |
| Platform Billing Officer | Platform | Dashboard, SACCO Registration view, Subscriptions, Billing reports, Operations |
| Platform Compliance Officer | Platform | Dashboard, SACCO Registration view, Transactions view, Loans view, Accounting view, Approvals view, Operations, Reports |
| Platform Support Officer | Platform | Dashboard, SACCO Registration view, Members view, Operations, Reports, Complaints, Notifications |
| SACCO Administrator | SACCO | Dashboard, Members, Transactions, Loans, Approvals, Operations, Reports, Users/Roles |
| Chairperson | SACCO | Dashboard, Loans, Approvals, Reports, Operations, Governance |
| Treasurer | SACCO | Dashboard, Transactions, Finance approvals, Reports, Operations, Accounting |
| Secretary | SACCO | Dashboard, Members, Member approvals, Reports, Governance, Complaints |
| Accountant | SACCO | Dashboard, Transactions, Accounting, Reconciliation, Reports, Operations |
| Teller / Cashier | SACCO | Dashboard, Member lookup, Transaction capture |
| Auditor | SACCO | Dashboard, Members view, Transactions view, Loans view, Approvals view, Operations, Reports |
| Member | SACCO member | Member Portal only |

Members are authenticated through the member portal session, not staff roles. A member can view only their own balances, statements, loans, notifications, guarantor requests, and drafts.

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
npm.cmd run restore:db -- -BackupPath .\backups\sacco_app-YYYYMMDD-HHMASAS.dump -ConfirmRestore
```

Restore is destructive because the script cleans existing database objects before loading the backup.

Before approving a release candidate, run a restore rehearsal against a disposable database:

```powershell
npm.cmd run backup:rehearse
```

Keep the successful rehearsal output with the release evidence.

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
