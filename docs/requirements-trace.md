# Requirements Trace

Source: `C:\Users\Methaltech\Downloads\SACCO Management Platform Requirements.docx`

## Implemented in this prototype

- Public/platform shell with SACCO administration and member portal routes.
- Multi-tenant operating model through selectable tenants and tenant-scoped records.
- SACCO registration capture, status display, administrator approval, and audit event.
- Subscription packages, invoice records, payment posting, and active subscription state.
- SACCO profile indicators including district, registration number, package, onboarding, and licence expiry monitoring.
- Branch-linked member registration.
- Member statuses, member types, KYC status, savings, shares, and welfare balances.
- Savings, shares, welfare, and withdrawal transaction workflow.
- Maker-checker approval queue for financial postings.
- Loan application queue with product, amount, appraisal stage, guarantors, debt-service ratio, and risk.
- Member portal dashboard for balances, loans, statements, payments, and loan application entry points.
- Reports page with financial summary, compliance snapshot, and audit trail.
- Backend health check and API session status shown in the web UI.
- Seeded API login/logout from the web UI.
- Server-side tenants, users, and audit events fetched through `/api/v1`.
- Server-side branch and member onboarding endpoints with tenant isolation.
- Member document metadata endpoint for KYC/document tracking.

## Represented as design controls

- Tenant isolation.
- Idempotent references for financial postings.
- Audit trail for sensitive operations.
- Subscription restriction concept.
- Licence expiry alerts.
- Role separation between platform and SACCO administration.
- Financial transaction approval before posting.
- Frontend API adapter allows gradual migration away from browser `localStorage`.
- Backend rejects cross-tenant member access for SACCO-level users.
- Member register UI can switch from local demo data to API-backed member onboarding after login.
- SACCO registration UI can switch from local demo data to API-backed tenant onboarding after platform login.
- Subscription UI can switch from local demo data to API-backed package, invoice, and payment records after login.
- Subscription billing uses UGX 5,000 per member annually up to 250 members, then fixed annual tiers for larger SACCOs.
- Transactions UI can switch from local demo data to API-backed financial postings after login.
- Backend financial transaction creation validates tenant, member, branch, type, channel, and positive amount.
- Approvals UI can post or reject API-backed pending financial transactions with maker-checker enforcement.
- Members can authenticate into the member portal and view their own backend balances.
- Loans UI can switch from local demo data to API-backed loan files and submit new loan applications.
- SACCO staff can request loan guarantors, and members can accept or reject guarantee requests.
- Loan applications require approval before disbursement, and approval requires an accepted guarantor.
- Active loan repayments reduce outstanding balance, reject overpayments, and close a fully repaid loan.

## Recommended backend modules for the next build

- Identity and Access Management.
- Tenant Management.
- Subscription Management.
- Member Management.
- Savings Management.
- Shares Management.
- Welfare Management.
- Loan Management.
- Guarantor Management.
- Accounting.
- Payments.
- Notifications.
- Reporting.
- Document Management.
- Audit.
- Support.
- Compliance.
