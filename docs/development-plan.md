# SACCO Management Platform Development Plan

## 1. Product Goal

Build a secure multi-tenant SACCO management platform for Uganda that supports SACCO onboarding, subscriptions, member management, savings, shares, welfare, loans, approvals, accounting, reports, mobile-money collections, and member self-service.

The project should grow from the current browser prototype into a production system using a phased modular-monolith approach.

## 2. Build Strategy

The platform will be built in phases so each release is usable and testable.

Recommended delivery order:

1. Platform foundation.
2. SACCO onboarding and membership.
3. Core financial operations.
4. Loans and guarantors.
5. Accounting, reports, and governance.
6. Integrations and Android app.
7. Production hardening.

## 3. Target Architecture

Initial production architecture:

- Frontend web app for platform administrators, SACCO staff, and members.
- Java/Spring Boot REST API with versioned routes under `/api/v1`.
- PostgreSQL database using shared tables with mandatory `tenant_id`.
- Redis for caching, sessions, rate limiting, and OTPs.
- Object storage for documents, KYC files, certificates, receipts, and statements.
- Background worker for reports, notifications, reconciliations, and long-running jobs.
- Audit/event logging for sensitive actions.
- Docker-based deployment.

Recommended backend modules:

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

## 4. Current State

Implemented now:

- Static browser app.
- Tenant switching.
- Platform dashboard.
- SACCO registration list.
- Subscription packages and invoices.
- Member register.
- Savings, shares, and welfare transaction workflow.
- Loan queue.
- Approval queue.
- Reports and audit trail.
- Member portal demo.
- Local Node prototype server.
- Java/Spring Boot backend skeleton in `backend-java`.

Current limits:

- Data is stored in browser `localStorage`.
- Java backend is scaffolded, but most business endpoints still need migration from the Node prototype.
- No authentication.
- No database.
- No real payment integration.
- No immutable ledger.
- No file upload/storage.
- No Android app yet.

## 5. Phase 1: Foundation Release

Goal: create the production-ready base for multi-tenant SACCO operations.

Deliverables:

- Project structure for frontend and backend.
- Java/Spring Boot REST API skeleton.
- PostgreSQL schema and migrations.
- Tenant model with `tenant_id` isolation.
- Authentication with secure password hashing.
- Role and permission model.
- Platform admin login.
- SACCO admin login.
- Audit event capture.
- API error format.
- Development, test, and production environment configuration.

Core entities:

- Tenant.
- SACCOProfile.
- User.
- Role.
- Permission.
- UserRole.
- AuditEvent.

Acceptance criteria:

- A platform administrator can log in.
- A SACCO administrator can log in.
- Users only see records belonging to their tenant.
- Backend blocks cross-tenant access.
- Sensitive actions create audit events.

## 6. Phase 2: SACCO Onboarding and Membership

Goal: allow SACCOs to register, be approved, configure basics, and manage members.

Deliverables:

- SACCO self-registration.
- Registration review and approval.
- SACCO profile management.
- Branch management.
- Member registration.
- Member approval workflow.
- KYC status tracking.
- Bulk member import template.
- Member documents metadata.
- Member portal login foundation.

Core entities:

- Branch.
- Member.
- MemberDocument.
- NextOfKin.
- Beneficiary.
- ApprovalWorkflow.
- ApprovalStep.
- ApprovalDecision.

Acceptance criteria:

- A SACCO can submit an application.
- Platform admin can approve or reject the application.
- SACCO admin can configure branches.
- SACCO staff can register members.
- Member records are tenant-isolated.
- KYC status is visible and auditable.

## 7. Phase 3: Core Financial Operations

Goal: implement savings, shares, welfare, receipts, and statements.

Deliverables:

- Savings product setup.
- Savings accounts.
- Savings deposits and withdrawals.
- Share product setup.
- Share purchases and transfers.
- Welfare product setup.
- Welfare contributions and claims.
- Maker-checker approvals for financial postings.
- Receipts.
- Member statements.
- Reversal and adjustment workflow.

Core entities:

- SavingsProduct.
- SavingsAccount.
- SavingsTransaction.
- ShareProduct.
- ShareAccount.
- ShareTransaction.
- WelfareProduct.
- WelfareContribution.
- WelfareClaim.
- PaymentTransaction.

Acceptance criteria:

- Financial transactions use fixed-precision decimals.
- Posted transactions cannot be edited directly.
- Reversals reference original transactions.
- Balances derive from posted transactions.
- Maker cannot approve their own transaction where maker-checker applies.
- Statements match transaction records.

## 8. Phase 4: Loans and Guarantors

Goal: support credit products, applications, appraisal, approvals, disbursement, and repayment.

Deliverables:

- Loan product setup.
- Loan application.
- Credit appraisal.
- Guarantor request and acceptance.
- Guarantee capacity checks.
- Loan committee workflow.
- Disbursement workflow.
- Repayment schedule.
- Loan repayment posting.
- Arrears tracking.
- Portfolio-at-risk reports.

Core entities:

- LoanProduct.
- LoanApplication.
- Loan.
- LoanInstallment.
- LoanRepayment.
- LoanGuarantor.
- Collateral.

Acceptance criteria:

- A loan cannot be disbursed before approval.
- Guarantors must accept obligations.
- Members cannot over-guarantee.
- Repayments reduce loan balance correctly.
- Arrears and outstanding balances are accurate.

## 9. Phase 5: Accounting, Reports, and Governance

Goal: add stronger financial controls and SACCO governance operations.

Deliverables:

- Chart of accounts.
- Journal entries and journal lines.
- Balanced double-entry posting.
- Cash and bank accounts.
- Expenses.
- Supplier records.
- Assets.
- Bank reconciliation.
- Mobile-money reconciliation.
- Meetings and resolutions.
- Complaints.
- Regulatory reports.
- Exportable reports.

Core entities:

- ChartOfAccount.
- JournalEntry.
- JournalLine.
- BankAccount.
- MobileMoneyAccount.
- Reconciliation.
- Expense.
- Supplier.
- Asset.
- Meeting.
- Resolution.
- Complaint.

Acceptance criteria:

- Every financial posting creates balanced journal entries.
- Reports reconcile with transaction records.
- Closed periods block ordinary postings.
- Reconciliation identifies unmatched payments.
- Governance records are searchable and auditable.

## 10. Phase 6: Integrations and Mobile

Goal: connect the platform to real payment, messaging, and mobile channels.

Deliverables:

- Mobile-money collection integration.
- Payment callback idempotency.
- SMS provider integration.
- Email provider integration.
- Notification templates.
- Android app foundation.
- Member mobile dashboard.
- Loan application from mobile.
- Guarantor acceptance from mobile.
- Offline draft support for selected non-financial workflows.

Acceptance criteria:

- Duplicate payment callbacks are not posted twice.
- Members receive notifications for important events.
- Android app can authenticate securely.
- Mobile app displays balances with last-updated time.
- Critical financial actions wait for server confirmation.

## 11. Phase 7: Production Hardening

Goal: prepare the platform for live SACCO use.

Deliverables:

- Automated tests.
- Tenant-isolation tests.
- Permission tests.
- Financial-calculation tests.
- Security headers.
- Rate limiting.
- Password reset.
- MFA for privileged users.
- Backup procedures.
- Monitoring and alerts.
- Deployment scripts.
- User manuals.
- Administrator manual.
- Technical manual.

Acceptance criteria:

- No unresolved critical security findings.
- Backups can be restored.
- Load testing meets agreed targets.
- Audit logs cover sensitive actions.
- Production deployment is repeatable.

## 12. Immediate Sprint 1

Objective: convert the current prototype into a backend-ready development foundation.

Tasks:

1. Add a formal data model document.
2. Define API route map for Phase 1 and Phase 2.
3. Choose production stack.
4. Create backend project skeleton.
5. Create database migration skeleton.
6. Implement tenant, user, role, and audit tables.
7. Implement authentication endpoints.
8. Replace prototype data access with an API adapter layer.
9. Keep the current UI working while backend is introduced.
10. Add basic automated checks.

Progress:

- Data model document added.
- API route map added.
- Backend development server routes added under `/api/v1`.
- Migration draft added for the Phase 1 foundation schema.
- Health, login, tenants, users, roles, permissions, and audit endpoints added.
- API smoke test added.
- Frontend API adapter added for health, login/logout, tenants, users, and audit events.
- Branch, member, member status, and member document API endpoints added.
- Phase 2 onboarding and membership migration draft added.
- Members screen now reads API-backed branches/members after login and creates members through `/api/v1/members`.
- SACCO registration screen now reads API-backed tenants after login and creates/approves tenants through `/api/v1/tenants`.
- Subscription package, invoice, and payment endpoints added.
- Subscriptions screen now reads API-backed packages/subscriptions after login and records payments through `/api/v1/subscriptions/:id/payments`.
- Subscription billing now uses UGX 5,000 per member annually up to 250 members, then fixed annual tiers for 251-500, 501-2,500, and 2,501-10,000 members.
- Member portal login now authenticates members and returns their own backend balances.
- Financial transaction listing and submission endpoints added for savings deposits, share purchases, welfare contributions, and withdrawals.
- Transactions screen now reads API-backed postings after login and submits new pending transactions through `/api/v1/financial-transactions`.
- Approval queue now reads API-backed pending financial postings and posts or rejects them through `/api/v1/financial-transactions/:id/status`.
- Loan listing and application endpoints added, and the Loans screen now submits applications through `/api/v1/loans`.
- Loan guarantor request endpoints added, with member accept/reject decisions in the member portal.
- Loan approval and disbursement endpoints added, enforcing accepted-guarantor approval and approval-before-disbursement controls.
- Loan repayment endpoints added, with active-loan balance reduction, duplicate-reference protection, and close-on-full-payment behavior.
- Accounting chart and derived journal endpoints added, and Reports now displays API-backed balanced ledger entries.
- Statement-line import and reconciliation endpoints added, and Reports now highlights matched and unmatched cash movements.
- Governance meeting, resolution, and complaint endpoints added, with Reports showing open governance actions and complaints.
- Regulatory report endpoint added, with tenant/consolidated supervisory summaries and exportable CSV payloads shown in Reports.
- Accounting period controls added, with closed periods blocking ordinary financial postings and visible in Reports.
- Supplier and expense endpoints added, with expenses posting balanced journal entries and appearing in Reports.
- Fixed asset endpoints added, with acquisition and depreciation journals plus asset totals in Reports and regulatory summaries.
- Mobile-money callback endpoint added, with idempotent posting for member collections/loan repayments and member in-app notifications.
- Simulated SMS and email provider delivery outbox added for member notifications, visible on Dashboard and Reports.
- Member mobile dashboard endpoint and Member Portal card added, including server-confirmed balances, notifications, loan totals, and last-updated time.
- Mobile loan application endpoint and Member Portal flow added, allowing members to submit their own loan applications with server confirmation.
- Offline complaint draft support added for the Member Portal, with local draft save and server sync when online.
- Android member app foundation added under `mobile/member_app`, with Flutter entrypoint, API contract, emulator base URL, and validation script.
- Security headers and development rate limiting added for API/static responses, staff login, member login, and mobile-money callbacks.
- Java/Spring Boot backend scaffold added under `backend-java`, with `/api/v1/health`, H2 dev datasource, PostgreSQL/Flyway dependencies, security headers, and MockMvc tests.
- Java tenant foundation added with Flyway `tenants` migration, seeded SACCO tenants, JPA repository, and `/api/v1/tenants`.
- Java identity foundation added with seeded users, PBKDF2 password verification, safe user responses, token generation, and `/api/v1/auth/login`.
- Java session foundation added with hashed bearer-token sessions, `/api/v1/auth/me`, and `/api/v1/auth/logout`.
- Java user administration added with authenticated tenant-scoped `/api/v1/users` listing and creation.
- Java audit foundation added with Flyway `audit_events`, tenant-scoped `/api/v1/audit-events`, and automatic audit entries for user creation.
- Java role and permission foundation added with Flyway `roles`/`permissions`/`role_permissions`/`user_roles`, seeded platform/SACCO roles, authenticated permission listing, tenant-scoped custom role creation, permission validation, and audit events.
- Java SACCO onboarding added with authenticated tenant detail, platform-only tenant creation, platform-only status updates, tenant access checks, and audit events.
- Java SACCO profile management added with Flyway `sacco_profiles`, seeded legal/contact details, tenant-scoped read/update endpoints, validation, and audit events.
- Java branch management added with Flyway `branches`, seeded branch records, tenant-scoped `/api/v1/branches`, duplicate-code checks, and audit events.
- Java member management added with Flyway `members`, seeded member balances, tenant-scoped `/api/v1/members`, registration, detail, status updates, and audit events.
- Java bulk member import template added with `/api/v1/members/import-template`, tenant-scoped sample rows, headers, and CSV content for onboarding preparation.
- Java member document metadata added with Flyway `member_documents`, seeded KYC records, member-scoped listing/upload, validation, tenant isolation, and audit events.
- Java member next-of-kin and beneficiaries added with Flyway `member_next_of_kin`/`member_beneficiaries`, seeded onboarding contacts, tenant-scoped member routes, allocation caps, and audit events.
- Java member self-service auth added with Flyway `member_sessions`, member login by membership number/phone/email, balance-aware `/api/v1/member-auth/me`, logout revocation, and member audit events.
- Java member mobile self-service added with `/api/v1/member-auth/mobile-dashboard` and `/api/v1/member-auth/mobile-loans`, server-confirmed dashboard projection, mobile loan validation, loan notification creation, and member audit events.
- Java member notifications listing added with `/api/v1/member-auth/notifications`, returning only the authenticated member's in-app notification history.
- Java subscription billing added with Flyway `subscription_packages`/`subscriptions`/`subscription_payments`, UGX 5,000/member annual billing up to 250 members with a 100-member minimum, fixed tiers above 250 members, platform-only payment posting, idempotent references, closed-period controls, and balanced subscription payment journals.
- Java financial product setup added with Flyway `financial_products`, seeded savings/share/welfare products, tenant-scoped listing/creation, duplicate-code controls, and audit events.
- Java financial accounts added with Flyway `financial_accounts`, seeded member product accounts, tenant/member/type filtering, active-member account opening, duplicate member-product controls, and audit events.
- Java welfare claims added with Flyway `welfare_claims`, tenant-scoped submission, approval/rejection, payment controls, member welfare balance reduction, audit events, and balanced welfare claim journals.
- Java financial transactions added with Flyway `financial_transactions`, tenant-scoped listing, pending transaction submission, maker-checker posting/rejection, and member balance updates.
- Java financial transaction receipts added with `/api/v1/financial-transactions/{transactionId}/receipt`, posted-only controls, member/branch/SACCO details, and printable receipt text.
- Java member statements and financial reversals added with `/api/v1/members/{memberId}/statement` and `/api/v1/financial-transactions/{transactionId}/reversal`, posted movement rows, running balances, CSV export text, original-transaction references, duplicate reversal protection, and balance updates.
- Java accounting foundation added with Flyway `chart_of_accounts`, seeded accounts, authenticated `/api/v1/chart-of-accounts`, and tenant-scoped balanced `/api/v1/journal-entries` derived from posted Java financial transactions, loan disbursements, and loan repayments.
- Java accounting periods added with Flyway `accounting_periods`, tenant-scoped listing, close/reopen status changes, audit events, and closed-period checks for financial transaction posting, loan disbursement, and loan repayment.
- Java supplier and expense accounting added with Flyway `suppliers`/`expenses`, Lombok-backed entities, tenant-scoped supplier setup, posted expense controls, balanced expense journals, reconciliation matching, and regulatory expense totals.
- Java fixed assets added with Flyway `assets`, Lombok-backed entities, tenant-scoped asset registration, closed-period acquisition controls, balanced acquisition/depreciation journals, and regulatory cost/net-book-value totals.
- Java reconciliation foundation added with Flyway `statement_lines`, statement import controls, closed-period protection, and `/api/v1/reconciliation` matching statement lines to Java cash ledger movements by tenant, account, reference, and amount.
- Java regulatory reporting added with Lombok-backed response DTOs, tenant/consolidated supervisory summaries, PAR indicator, reconciliation exception totals, and CSV export text.
- Java mobile-money callbacks added with Flyway `mobile_money_callbacks`, public idempotent provider ingestion, member collection posting, loan repayment posting, statement-line creation, and tenant-scoped callback history.
- Java notifications added with Flyway `notifications`/`notification_deliveries`, payment notification creation, demo SMS/email delivery records, and tenant-scoped delivery history.
- Java governance meetings added with Flyway `governance_meetings`/`governance_resolutions`, tenant-scoped meeting/resolution capture, audit events, nested meeting responses, and regulatory open-resolution totals.
- Java complaints added with Flyway `complaints`, staff capture/status updates, member mobile complaint sync, tenant/member controls, audit events, and regulatory open-complaint totals.
- Java loan applications added with Flyway `loans`, seeded loan files, tenant-scoped `/api/v1/loans`, active-member validation, product/amount/term validation, DSR estimate, and audit events.
- Java loan decisions added with approve/reject status updates, accepted-guarantor approval control, approval-before-disbursement enforcement, active-loan balance creation, and audit events.
- Java loan guarantors added with Flyway `loan_guarantors`, staff guarantor requests, duplicate/borrower/capacity controls, member accept/reject decisions, loan guarantor count refresh, and audit events.
- Java loan repayments added with Flyway `loan_repayments`, staff repayment capture, duplicate-reference protection, active-loan and overpayment controls, repayment totals, close-on-full-payment behavior, and audit events.
- Java approval workflows added with Flyway `approval_workflows`/`approval_decisions`, tenant-scoped workflow setup, approver decision history, rejection/correction reason controls, and audit events.
- Java user role assignment added with tenant-scoped `/api/v1/users/{userId}/roles`, role-tenant validation, duplicate cleanup, and audit events.

Recommended stack:

- Frontend: React or dependency-free progressive app until package tooling is stable.
- Backend: Java/Spring Boot.
- Database: PostgreSQL.
- Migrations: Flyway.
- Authentication: server sessions or JWT with refresh-token rotation.

Sprint 1 acceptance criteria:

- Backend starts locally.
- Health endpoint returns OK.
- Database connection works.
- Tenants can be listed through API.
- Users can be created with hashed passwords.
- Login returns an authenticated session/token.
- Audit events can be written and listed.
- Existing UI remains usable.

## 13. Key Risks

- Financial correctness risk: must use decimal money types and immutable postings.
- Tenant isolation risk: every tenant-owned query must enforce `tenant_id`.
- Regulatory risk: compliance thresholds must be configurable.
- Payment risk: mobile-money callbacks must be idempotent.
- Security risk: support access to tenant data must be controlled and audited.
- Scope risk: the platform is large, so releases must stay phased.

## 14. Definition of Done

A feature is done when:

- It has tenant-aware backend logic where applicable.
- It has validation for required fields and business rules.
- It records audit events for sensitive actions.
- It has UI states for empty, loading, success, and error cases.
- It has tests appropriate to financial and permission risk.
- It is documented in the requirements trace or API docs.
- It can run locally with clear commands.
