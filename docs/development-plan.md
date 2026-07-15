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
- Backend REST API with versioned routes under `/api/v1`.
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
- Local development server.

Current limits:

- Data is stored in browser `localStorage`.
- No real backend yet.
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
- Backend REST API skeleton.
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

Recommended stack:

- Frontend: React or dependency-free progressive app until package tooling is stable.
- Backend: Node.js with Fastify or Express, or Java/Spring Boot if preferred.
- Database: PostgreSQL.
- Migrations: Prisma, Knex, Flyway, or Liquibase depending on backend choice.
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
