# API Route Map

Base path: `/api/v1`

Production backend target: Java/Spring Boot in `backend-java`. Node API is demo-only fallback through
`backend/*.mjs`; production requests must be served by Java through `JAVA_API_BASE`.

Java-backed routes currently implemented:

- `GET /api/v1/health`
- `GET /api/v1/mobile-app-policy` (public mobile minimum/latest build policy and force-upgrade decision)
- `GET /api/v1/tenants`
- `GET /api/v1/tenants/fleet` (platform fleet search, health, ownership, and server pagination)
- `GET /api/v1/tenants/fleet/summary` (fleet-wide health, lifecycle, owner and district workloads, incident/SLA queue, six-month renewal forecast, billing, and onboarding metrics)
  - Platform UI supports non-mutating renewal-rate and price-adjustment scenarios with conservative, expected, and growth presets.
- `GET|POST /api/v1/tenants/fleet/forecast-scenarios` and `DELETE /api/v1/tenants/fleet/forecast-scenarios/{scenarioId}` (personal, audited renewal scenario library and comparison)
- `GET|POST /api/v1/tenants/fleet/views` and `DELETE /api/v1/tenants/fleet/views/{viewId}` (personal, audited saved fleet filters)
- `GET|POST /api/v1/tenants/fleet/jobs`, `POST /api/v1/tenants/fleet/jobs/{jobId}/decision`, and `GET /api/v1/tenants/fleet/jobs/{jobId}/results` (maker-checker approval and durable asynchronous bulk updates with per-organization outcomes)
  - Submissions require a business justification and remain `pending_approval` until a different platform operator approves or rejects them with a recorded reason.
  - `GET /api/v1/tenants/fleet/jobs/approval-queue` provides oldest-first server pagination; `GET /api/v1/tenants/fleet/jobs/approval-summary` supplies navigation badges and four/eight-hour SLA metrics.
  - Eligible checkers receive deduplicated request, due-soon, and overdue inbox notifications; the requester receives the final decision and reason.
  - Platform UI exposes an organization-level result report and formula-safe CSV export for remediation workflows.
  - Startup recovery resumes only queued organization rows for jobs interrupted in `queued` or `running` state and preserves completed outcomes.
- `GET /api/v1/tenants/fleet/incidents` and `PATCH /api/v1/tenants/fleet/incidents/{incidentKey}` (audited incident assignment, acknowledgement, escalation, resolution notes, and reopening)
- `PATCH /api/v1/tenants/fleet/bulk` (guarded portfolio assignment and lifecycle actions, maximum 100 SACCOs)
- `GET /api/v1/tenants/:id`
- `POST /api/v1/tenants`
- `DELETE /api/v1/tenants/:id`
- `PATCH /api/v1/tenants/:id/status`
- `GET /api/v1/tenants/:id/officials`
- `PATCH /api/v1/tenants/:id/officials/:office`
- `GET /api/v1/tenants/:id/profile`
- `PATCH /api/v1/tenants/:id/profile`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id/roles`
- `PUT /api/v1/users/:id/roles`
- `GET /api/v1/roles`
- `POST /api/v1/roles`
- `GET /api/v1/permissions`
- `GET /api/v1/audit-events`
- `POST /api/v1/audit-events`
- `GET /api/v1/subscription-payments` (tenant-scoped payment history; platform users may view all SACCOs with `subscriptions:view`)
- `POST /api/v1/subscriptions/:subscriptionId/payments` (platform subscription payment recording; requires `subscriptions:manage`)
- `GET /api/v1/branches`
- `POST /api/v1/branches`
- `GET /api/v1/members`
- `GET /api/v1/members/import-template`
- `POST /api/v1/members/import`
- `GET /api/v1/members/metadata-import-template`
- `POST /api/v1/members/metadata-import`
- `POST /api/v1/members`
- `GET /api/v1/members/:id`
- `GET /api/v1/members/:id/statement`
- `PATCH /api/v1/members/:id/status`
- `POST /api/v1/members/:id/activation-credentials`
- `GET /api/v1/members/:id/next-of-kin`
- `POST /api/v1/members/:id/next-of-kin`
- `GET /api/v1/members/:id/beneficiaries`
- `POST /api/v1/members/:id/beneficiaries`
- `GET /api/v1/members/:id/documents`
- `POST /api/v1/members/:id/documents`
- `POST /api/v1/member-auth/login`
- `GET /api/v1/member-auth/me`
- `GET /api/v1/member-auth/collection-accounts`
- `GET /api/v1/member-auth/notifications`
- `POST /api/v1/member-auth/logout`
- `GET /api/v1/financial-products`
- `POST /api/v1/financial-products`
- `GET /api/v1/financial-accounts`
- `POST /api/v1/financial-accounts`
- `GET /api/v1/welfare-claims`
- `POST /api/v1/welfare-claims`
- `PATCH /api/v1/welfare-claims/:id/status`
- `POST /api/v1/welfare-claims/:id/payment`
- `GET /api/v1/financial-transactions`
- `GET /api/v1/financial-transactions/approval-queue`
- `GET /api/v1/financial-transactions/approval-summary`
- `POST /api/v1/financial-transactions`
- `GET /api/v1/financial-transactions/:id/receipt`
- `POST /api/v1/financial-transactions/:id/reversal`
- `PATCH /api/v1/financial-transactions/:id/status`
- `GET /api/v1/financial-transactions/opening-balances/import-template`
- `POST /api/v1/financial-transactions/opening-balances/import`
- `GET /api/v1/chart-of-accounts`
- `GET /api/v1/journal-entries`
- `GET /api/v1/accounting-periods`
- `PATCH /api/v1/accounting-periods/:id/status`
- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers`
- `GET /api/v1/expenses`
- `POST /api/v1/expenses`
- `GET /api/v1/assets`
- `POST /api/v1/assets`
- `GET /api/v1/statement-lines`
- `POST /api/v1/statement-lines`
- `POST /api/v1/statement-lines/batch`
- `GET /api/v1/reconciliation`
- `GET /api/v1/regulatory-report`
- `POST /api/v1/integrations/mobile-money/callback`
- `GET /api/v1/integrations/mobile-money/callbacks`
- `GET /api/v1/notifications/deliveries`
- `GET /api/v1/governance-meetings`
- `POST /api/v1/governance-meetings`
- `POST /api/v1/governance-meetings/:id/resolutions`
- `GET /api/v1/complaints`
- `POST /api/v1/complaints`
- `PATCH /api/v1/complaints/:id/status`
- `POST /api/v1/member-auth/mobile-complaints`
- `GET /api/v1/loans`
- `GET /api/v1/loans/import-template`
- `POST /api/v1/loans/import`
- `GET /api/v1/loans/repayments/import-template`
- `POST /api/v1/loans/repayments/import`
- `POST /api/v1/loans`
- `PATCH /api/v1/loans/:id/status`
- `POST /api/v1/loans/:id/disburse`
- `GET /api/v1/loans/:id/guarantors`
- `POST /api/v1/loans/:id/guarantors`
- `GET /api/v1/loans/:id/repayments`
- `POST /api/v1/loans/:id/repayments`
- `GET|POST /api/v1/loans/:id/recoveries`
- `POST /api/v1/loans/:id/recoveries/:caseId/submit`
- `POST /api/v1/loans/:id/recoveries/:caseId/decision`

Loan recovery methods are independent and post immediately for an authorized SACCO administrator or treasurer. `borrower_savings` deducts only available borrower savings. `guarantor_shortfall` uses borrower savings first and allocates only the remaining shortfall across accepted signed guarantees. A borrower notice is optional and never introduces a grace period or approval step; affected guarantors receive posting notifications.
- `GET /api/v1/member-auth/guarantor-requests`
- `PATCH /api/v1/member-auth/guarantor-requests/:id/status`
- `GET /api/v1/approval-workflows`
- `POST /api/v1/approval-workflows`
- `GET /api/v1/approval-decisions`
- `POST /api/v1/approval-decisions`

All API responses include baseline security headers. Public staff login, member login, and mobile-money callback endpoints are rate limited and return `429 RATE_LIMITED` with `Retry-After` when the development limit is exceeded.

All JSON responses should follow one of these shapes:

```json
{ "data": {} }
```

```json
{
  "error": {
    "timestamp": "2026-07-15T12:00:00.000Z",
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "A required field is missing.",
    "correlationId": "req_..."
  }
}
```

## Foundation Routes

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Service health check. | Public |
| GET | `/operations/status` | Operational health counts and alert indicators. | Required |
| GET | `/tenants` | List tenants visible to current user. | Required |
| GET | `/tenants/:id` | Get one tenant. | Required |
| POST | `/tenants` | Submit/create tenant. | Platform admin or public registration flow |
| DELETE | `/tenants/:id` | Permanently delete a SACCO and all tenant-owned records after typed SACCO-code confirmation. | Platform admin with `tenants:delete` |
| PATCH | `/tenants/:id/status` | Approve, activate, suspend, or terminate tenant. | Platform admin |
| GET | `/tenants/:id/officials` | List chairperson, secretary and treasurer assignments for a SACCO. | Required |
| PATCH | `/tenants/:id/officials/:office` | Assign or transfer one SACCO official office to a registered member. | Tenant manager |
| GET | `/tenants/:id/profile` | Get SACCO legal/contact profile. | Required |
| PATCH | `/tenants/:id/profile` | Update SACCO legal/contact profile. | SACCO admin or platform admin |
| GET | `/users` | List users in current tenant. | Required |
| POST | `/users` | Create a user with hashed password. | Admin |
| POST | `/users/official-staff-access` | Create or reuse a staff login for an assigned SACCO official, grant the matching role and link it to the member. | Platform admin |
| GET | `/users/:id/roles` | List assigned roles for a staff user. | Admin |
| PUT | `/users/:id/roles` | Replace assigned roles for a staff user. | Admin |
| POST | `/auth/login` | Authenticate staff with `saccoCode`, `username`, and `password`; legacy `email` plus `password` remains accepted for automation. | Public |
| POST | `/auth/logout` | End current session. | Required |
| GET | `/auth/me` | Get current authenticated user. | Required |
| POST | `/member-auth/login` | Authenticate a member with `saccoCode`, `identifier`, and `password`; identifier may be membership number, phone, or email. | Public |
| GET | `/member-auth/me` | Get current member profile, tenant, branch, and balances. | Member |
| GET | `/member-auth/mobile-dashboard` | Get mobile app dashboard balances, loans, notifications, and last update time. | Member |
| GET | `/member-auth/collection-accounts` | List active SACCO-owned MoMo and bank accounts currently visible to the member. | Member |
| POST | `/member-auth/mobile-loans` | Submit a loan application from the member mobile channel. | Member |
| POST | `/member-auth/mobile-complaints` | Sync an offline member complaint draft. | Member |
| GET | `/member-auth/notifications` | List current member in-app notifications. | Member |
| POST | `/member-auth/logout` | End current member session. | Member |
| GET | `/roles` | List roles for current tenant. | Required |
| POST | `/roles` | Create custom role. | Admin |
| GET | `/permissions` | List known permissions. | Required |
| GET | `/audit-events` | List tenant audit events. | Required |
| POST | `/audit-events` | Write an audit event. | Internal/admin |
| GET | `/subscription-packages` | List platform subscription packages. | Required |
| GET | `/subscriptions` | List visible subscriptions. | Required |
| POST | `/subscriptions/:id/payments` | Record a subscription payment. | Platform admin |
| POST | `/subscriptions/:id/trial-extension` | Extend a trial by 1-31 days with a required audited reason. | Platform admin with subscription management |

## Onboarding and Membership Routes

| Method | Route | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/branches` | List tenant branches. | Required |
| POST | `/branches` | Create branch. | SACCO admin |
| GET | `/members` | List tenant members. | Required |
| GET | `/members/import-template` | Return CSV headers, sample rows, and content for bulk member import. | Required |
| POST | `/members/import` | Validate or create tenant-scoped member import rows with all-or-nothing save behavior. | Required |
| GET | `/members/metadata-import-template` | Return CSV headers, sample rows, and content for profile metadata import. | Required |
| POST | `/members/metadata-import` | Validate or create KYC status, document, next-of-kin, and beneficiary metadata rows. | Required |
| POST | `/members` | Register member. | SACCO staff |
| GET | `/members/:id` | Get member profile. | Required |
| GET | `/members/:id/statement` | Get posted member movements with running savings/share/welfare balances and CSV export text. | Required |
| PATCH | `/members/:id/status` | Approve, suspend, activate, or exit member. | Authorized approver |
| POST | `/members/:id/activation-credentials` | Activate a member, set their password to their phone number, and send SACCO code plus password by SMS or email. | Authorized approver |
| GET | `/members/:id/next-of-kin` | List member next-of-kin contacts. | Required |
| POST | `/members/:id/next-of-kin` | Add a member next-of-kin contact. | SACCO staff |
| GET | `/members/:id/beneficiaries` | List member beneficiaries and allocations. | Required |
| POST | `/members/:id/beneficiaries` | Add a member beneficiary allocation. | SACCO staff |
| GET | `/members/:id/documents` | List member documents. | Required |
| POST | `/members/:id/documents` | Upload/register member document metadata. | SACCO staff |
| GET | `/financial-products` | List tenant fund product definitions. | `fund-types:view` |
| POST | `/financial-products` | Create a tenant financial product definition. | `fund-types:manage` (Chairperson) |
| GET | `/financial-accounts` | List member accounts linked to savings, shares, and welfare products. | Required |
| POST | `/financial-accounts` | Open a financial account for an active member and product. | SACCO staff |
| GET | `/welfare-claims` | List tenant welfare claims. | Required |
| POST | `/welfare-claims` | Submit a member welfare claim. | SACCO staff |
| PATCH | `/welfare-claims/:id/status` | Approve or reject a submitted welfare claim. | Authorized approver |
| POST | `/welfare-claims/:id/payment` | Pay an approved welfare claim and reduce member welfare balance. | SACCO staff |
| GET | `/financial-transactions` | List tenant financial transactions. | Required |
| GET | `/financial-transactions/approval-queue` | List the oldest platform-wide pending financial decisions with organization and member context. | Platform transaction viewer |
| GET | `/financial-transactions/approval-summary` | Return platform queue counts, pending value, oldest item and decision capability. | Platform transaction viewer |
| POST | `/financial-transactions` | Submit a pending financial transaction. | SACCO staff |
| GET | `/financial-transactions/:id/receipt` | Generate a receipt projection for a posted financial transaction. | Required |
| POST | `/financial-transactions/:id/reversal` | Create a posted reversal that references the original transaction. | Authorized staff |
| PATCH | `/financial-transactions/:id/status` | Post or reject a pending financial transaction. | Authorized checker |
| GET | `/financial-transactions/opening-balances/import-template` | Return CSV headers, sample rows, and content for opening balance imports. | Required |
| POST | `/financial-transactions/opening-balances/import` | Validate or post all-or-nothing opening balance ledger transactions. | Authorized checker |
| GET | `/financial-transactions/savings/import-template` | Return the tenant-scoped CSV template for bulk savings deposits. | Required |
| POST | `/financial-transactions/savings/import` | Dry-run or create tenant-scoped pending savings deposit transactions in bulk. | Transactions create |
| GET | `/accounting-periods` | List tenant accounting periods. | Required |
| PATCH | `/accounting-periods/:id/status` | Open or close an accounting period. | SACCO staff |
| GET | `/chart-of-accounts` | List the accounting chart used for journal lines. | Required |
| GET | `/journal-entries` | List balanced journal entries derived from posted events. | Required |
| GET | `/suppliers` | List tenant suppliers. | Required |
| POST | `/suppliers` | Create a supplier. | SACCO staff |
| GET | `/expenses` | List posted tenant expenses. | Required |
| POST | `/expenses` | Post an operating expense. | SACCO staff |
| GET | `/assets` | List tenant fixed assets with depreciation values. | Required |
| POST | `/assets` | Register a fixed asset acquisition. | SACCO staff |
| GET | `/statement-lines` | List imported bank, cash, mobile-money, and payroll statement lines. | Required |
| POST | `/statement-lines` | Import a statement line for reconciliation. | SACCO staff |
| POST | `/statement-lines/batch` | Batch import bank, cash, mobile-money, or payroll statement lines with row-level validation. | SACCO staff |
| GET | `/sacco-payment-accounts` | List SACCO-owned MoMo numbers/merchant codes and bank accounts for the current or selected SACCO. | SACCO staff / platform |
| POST | `/sacco-payment-accounts` | Add a SACCO-owned collection account for a platform-allowed channel. | SACCO staff |
| PATCH | `/sacco-payment-accounts/:id` | Update or deactivate a SACCO-owned collection account. | SACCO staff |
| DELETE | `/sacco-payment-accounts/:id` | Remove a SACCO-owned collection account. | SACCO staff |
| GET | `/reconciliation` | Compare statement lines with ledger cash movements. | Required |
| GET | `/regulatory-report` | Return supervisory report rows, consolidated totals, and CSV export text. | Required |
| POST | `/integrations/mobile-money/callback` | Receive idempotent mobile-money payment callbacks. | Public/provider |
| GET | `/integrations/mobile-money/callbacks` | List tenant mobile-money callback history. | Required |
| GET | `/notifications/deliveries` | List simulated SMS and email provider delivery history. | Required |
| POST | `/notifications/messages/sms` | Send immediately or schedule custom/account-status SMS to all or selected members using SACCO credits. | `notifications:manage` |
| GET | `/notifications/sms-schedules` | List the signed-in SACCO's scheduled SMS history. | `notifications:manage` |
| PATCH | `/notifications/sms-schedules/{scheduleId}/cancel` | Cancel a pending scheduled SMS. | `notifications:manage` |
| GET | `/governance-meetings` | List tenant governance meetings and resolutions. | Required |
| POST | `/governance-meetings` | Create a governance meeting record. | SACCO staff |
| POST | `/governance-meetings/:id/resolutions` | Record a meeting resolution. | SACCO staff |
| GET | `/complaints` | List member or service complaints. | Required |
| POST | `/complaints` | Capture a complaint. | SACCO staff |
| PATCH | `/complaints/:id/status` | Update complaint status and resolution notes. | SACCO staff |
| GET | `/loans` | List tenant loan applications and files. | Required |
| GET | `/loans/import-template` | Return CSV headers, sample rows, and content for loan book import. | Required |
| POST | `/loans/import` | Validate or create all-or-nothing migrated active/closed loan book records. | Authorized checker |
| GET | `/loans/repayments/import-template` | Return CSV headers, sample rows, and content for migrated repayment history. | Required |
| POST | `/loans/repayments/import` | Validate or create historical repayment records without reducing migrated outstanding balances again. | Authorized checker |
| POST | `/loans` | Submit a loan application for an active member. | SACCO staff |
| PATCH | `/loans/:id/status` | Approve or reject a loan application. | Authorized approver |
| POST | `/loans/:id/disburse` | Disburse an approved loan. | Authorized disbursement officer |
| GET | `/loans/:id/repayments` | List repayments recorded against a loan. | Required |
| POST | `/loans/:id/repayments` | Record an active loan repayment and reduce balance. | SACCO staff |
| GET | `/loans/:id/guarantors` | List guarantor requests for a loan. | Required |
| POST | `/loans/:id/guarantors` | Request a member to guarantee a loan. | SACCO staff |
| GET | `/member-auth/guarantor-requests` | List current member guarantee requests. | Member |
| PATCH | `/member-auth/guarantor-requests/:id/status` | Accept or reject a guarantee request. | Member |
| GET | `/approval-workflows` | List workflows. | Admin |
| POST | `/approval-workflows` | Create workflow. | Admin |
| GET | `/approval-decisions` | List pending or historical decisions. | Required |
| POST | `/approval-decisions` | Record approval decision. | Authorized approver |

## Current Sprint 1 API Implementation

Implemented in the no-dependency development server:

- `GET /api/v1/health`
- `GET /api/v1/tenants`
- `GET /api/v1/tenants/:id`
- `POST /api/v1/tenants`
- `PATCH /api/v1/tenants/:id/status`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/member-auth/login`
- `GET /api/v1/member-auth/me`
- `GET /api/v1/member-auth/mobile-dashboard`
- `GET /api/v1/member-auth/collection-accounts`
- `POST /api/v1/member-auth/mobile-loans`
- `POST /api/v1/member-auth/mobile-complaints`
- `GET /api/v1/member-auth/notifications`
- `POST /api/v1/member-auth/logout`
- `GET /api/v1/roles`
- `POST /api/v1/roles`
- `GET /api/v1/permissions`
- `GET /api/v1/audit-events`
- `POST /api/v1/audit-events`
- `GET /api/v1/subscription-packages`
- `GET /api/v1/subscriptions`
- `POST /api/v1/subscriptions/:id/payments`
- `GET /api/v1/branches`
- `POST /api/v1/branches`
- `GET /api/v1/members`
- `POST /api/v1/members`
- `GET /api/v1/members/:id`
- `PATCH /api/v1/members/:id/status`
- `GET /api/v1/members/:id/documents`
- `POST /api/v1/members/:id/documents`
- `GET /api/v1/financial-products`
- `POST /api/v1/financial-products`
- `GET /api/v1/financial-accounts`
- `POST /api/v1/financial-accounts`
- `GET /api/v1/welfare-claims`
- `POST /api/v1/welfare-claims`
- `PATCH /api/v1/welfare-claims/:id/status`
- `POST /api/v1/welfare-claims/:id/payment`
- `GET /api/v1/financial-transactions`
- `POST /api/v1/financial-transactions`
- `PATCH /api/v1/financial-transactions/:id/status`
- `GET /api/v1/accounting-periods`
- `PATCH /api/v1/accounting-periods/:id/status`
- `GET /api/v1/chart-of-accounts`
- `GET /api/v1/journal-entries`
- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers`
- `GET /api/v1/expenses`
- `POST /api/v1/expenses`
- `GET /api/v1/assets`
- `POST /api/v1/assets`
- `GET /api/v1/statement-lines`
- `POST /api/v1/statement-lines`
- `POST /api/v1/statement-lines/batch`
- `GET /api/v1/sacco-payment-accounts`
- `POST /api/v1/sacco-payment-accounts`
- `PATCH /api/v1/sacco-payment-accounts/:id`
- `DELETE /api/v1/sacco-payment-accounts/:id`
- `GET /api/v1/reconciliation`
- `GET /api/v1/regulatory-report`
- `POST /api/v1/integrations/mobile-money/callback`
- `GET /api/v1/integrations/mobile-money/callbacks`
- `GET /api/v1/notifications/deliveries`
- `GET /api/v1/governance-meetings`
- `POST /api/v1/governance-meetings`
- `POST /api/v1/governance-meetings/:id/resolutions`
- `GET /api/v1/complaints`
- `POST /api/v1/complaints`
- `PATCH /api/v1/complaints/:id/status`
- `GET /api/v1/loans`
- `GET /api/v1/loans/import-template`
- `POST /api/v1/loans/import`
- `GET /api/v1/loans/repayments/import-template`
- `POST /api/v1/loans/repayments/import`
- `POST /api/v1/loans`
- `PATCH /api/v1/loans/:id/status`
- `POST /api/v1/loans/:id/disburse`
- `GET /api/v1/loans/:id/repayments`
- `POST /api/v1/loans/:id/repayments`
- `GET /api/v1/loans/:id/guarantors`
- `POST /api/v1/loans/:id/guarantors`
- `GET|POST /api/v1/loans/:id/recoveries`
- `POST /api/v1/loans/:id/recoveries/:caseId/submit`
- `POST /api/v1/loans/:id/recoveries/:caseId/decision`
- `GET /api/v1/member-auth/guarantor-requests`
- `PATCH /api/v1/member-auth/guarantor-requests/:id/status`
- `GET /api/v1/approval-workflows`
- `POST /api/v1/approval-workflows`
- `GET /api/v1/approval-decisions`
- `POST /api/v1/approval-decisions`

The development server uses an in-memory store seeded at startup. PostgreSQL migrations are documented separately and will replace the development store in the next backend step.
