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
- Reports can read API-backed chart of accounts and balanced journal entries derived from posted financial events.
- Reconciliation compares imported statement lines with ledger cash movements and exposes unmatched exceptions.
- Governance records support meetings, resolutions, complaints, audit events, and tenant-scoped reporting.
- Regulatory reports provide tenant-scoped and platform-consolidated supervisory summaries with CSV export data.
- Closed accounting periods block ordinary posting activity and can be opened or closed from Reports.
- Supplier and expense workflows create balanced accounting entries and respect closed-period controls.
- Fixed asset registration creates balanced acquisition and depreciation entries, with asset totals included in regulatory reporting.
- Mobile-money callback ingestion posts confirmed member collections or loan repayments, rejects duplicate provider references through idempotency, and creates member notifications.
- Notification delivery outbox simulates SMS and email provider sends for member notifications.
- Member mobile dashboard endpoint and UI show server-confirmed balances, loan totals, latest notifications, and last-updated time.
- Members can submit mobile loan applications for their own account, with server confirmation and mobile-dashboard refresh.
- Members can save offline complaint drafts locally and sync them later to server-side complaints with notification feedback.
- Android member app foundation documents Flutter entrypoint, emulator API base URL, seed login, and required mobile API endpoints.
- API/static responses include baseline security headers, and public login/callback endpoints include development rate limiting.
- Java/Spring Boot backend skeleton added with the `/api/v1/health` envelope, security headers, H2 development datasource, and PostgreSQL/Flyway production dependencies.
- Java tenant foundation exposes seeded SACCO tenants from a Flyway-managed table through `/api/v1/tenants`.
- Java identity foundation authenticates seeded platform/SACCO administrators through `/api/v1/auth/login` without exposing password hashes or salts.
- Java auth sessions store hashed bearer tokens and support current-user lookup plus logout revocation.
- Java user administration enforces tenant-scoped listing and blocks SACCO admins from creating users in another tenant.
- Java audit events are tenant-scoped and capture manual entries plus automatic user-creation events.
- Java SACCO onboarding supports platform tenant creation/status review and blocks SACCO users from viewing or modifying other tenants.
- Java branch management lists and creates tenant-scoped branches while blocking cross-tenant branch access.
- Java member management registers and lists branch-linked members with tenant isolation, balance fields, KYC state, and status updates.
- Java member self-service authentication lets active members login and view only their own profile, tenant, branch, and savings/share/welfare balances.

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
