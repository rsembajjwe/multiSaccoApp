# Data Model

This model defines the Phase 1 and Phase 2 foundation tables. Production storage should use PostgreSQL with migrations. The current development backend uses a JSON store with the same logical fields so the API can be built before database tooling is introduced.

## Core Rules

- Every SACCO-owned table must include `tenant_id`.
- Platform-owned configuration may omit `tenant_id`.
- IDs should be opaque strings or UUIDs.
- Monetary values must use fixed-precision decimal storage in production.
- Sensitive actions must create `audit_events`.
- Posted financial records must not be edited directly.

## Phase 1 Foundation Entities

### tenants

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| name | text | SACCO or platform tenant name. |
| abbreviation | text | Used for local references. |
| status | enum | `pending_review`, `approved`, `active`, `suspended`, `terminated`. |
| registration_no | text | Cooperative registration number. |
| district | text | Primary operating district. |
| license_expiry | date | UMRA or relevant licence expiry. |
| package_id | uuid/string | Subscription package reference. |
| onboarding_percent | integer | 0-100 setup progress. |
| created_at | timestamp | Creation timestamp. |
| updated_at | timestamp | Last update timestamp. |

### sacco_profiles

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Required tenant reference. |
| legal_name | text | Registered SACCO name. |
| tin | text | Tax Identification Number. |
| umra_license_no | text | Optional where applicable. |
| cooperative_registration_no | text | Official cooperative number. |
| address | text | Physical address. |
| email | text | Official email. |
| phone | text | Official telephone. |
| website | text | Optional website. |

### users

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Tenant scope; platform users belong to platform tenant. |
| full_name | text | User display name. |
| email | text | Unique per tenant. |
| phone | text | Optional login identifier. |
| password_hash | text | PBKDF2 now; Argon2id/bcrypt recommended in production. |
| password_salt | text | Password salt. |
| status | enum | `active`, `locked`, `disabled`. |
| created_at | timestamp | Creation timestamp. |

### roles

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Tenant scope. |
| name | text | Role name. |
| protected | boolean | Prevents accidental removal of system roles. |

### permissions

| Field | Type | Notes |
| --- | --- | --- |
| id | string | Primary key, e.g. `members:create`. |
| module | text | Module name. |
| action | text | `view`, `create`, `edit`, `approve`, `post`, etc. |
| description | text | Human-readable description. |

### user_roles

| Field | Type | Notes |
| --- | --- | --- |
| user_id | uuid/string | User reference. |
| role_id | uuid/string | Role reference. |
| tenant_id | uuid/string | Tenant scope. |

### role_permissions

| Field | Type | Notes |
| --- | --- | --- |
| role_id | uuid/string | Role reference. |
| permission_id | string | Permission reference. |

### sessions

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Session/token id. |
| user_id | uuid/string | Authenticated user. |
| tenant_id | uuid/string | Session tenant. |
| token_hash | text | Store a hash of the issued token in production. |
| expires_at | timestamp | Expiry timestamp. |
| created_at | timestamp | Creation timestamp. |

### audit_events

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Tenant scope. |
| actor_user_id | uuid/string | Optional user reference. |
| actor_name | text | Snapshot of actor name. |
| action | text | What happened. |
| resource_type | text | Optional resource category. |
| resource_id | text | Optional resource id. |
| ip_address | text | Request IP where available. |
| created_at | timestamp | Event timestamp. |

### subscription_packages

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| name | text | Package name. |
| price | decimal | Unit price per member per annual cycle. Current rule: UGX 5,000. |
| billing_period | text | `monthly`, `quarterly`, `annual`, etc. |
| min_members | integer | Minimum billable members per cycle. Current rule: 100. |
| member_limit | integer | Optional package limit. |
| user_limit | integer | Optional package limit. |
| branch_limit | integer | Optional package limit. |
| modules | text | Available module summary. |
| status | enum | `active`, `inactive`. |

### subscriptions

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | SACCO tenant reference. |
| package_id | uuid/string | Subscription package reference. |
| status | enum | `pending_payment`, `active`, `grace_period`, `expired`, `suspended`, `cancelled`. |
| invoice | text | Unique invoice reference. |
| amount | decimal | Invoice amount. |
| paid | decimal | Amount received. |
| member_count | integer | Actual member count used for the billing cycle. |
| billable_members | integer | `max(member_count, 100)` for annual billing. |
| unit_price | decimal | Price per member for the cycle. |
| expiry | date | Subscription expiry. |

Subscription billing rule: every SACCO pays UGX 5,000 per member for each annual cycle, with a 100-member minimum. The minimum annual invoice is therefore UGX 500,000.

### subscription_payments

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| subscription_id | uuid/string | Subscription reference. |
| tenant_id | uuid/string | SACCO tenant reference. |
| amount | decimal | Payment amount. |
| channel | text | Manual, mobile money, bank, etc. |
| external_reference | text | Unique payment reference for idempotency. |
| received_at | timestamp | Payment timestamp. |
| recorded_by | uuid/string | User who posted the payment. |

## Phase 3 Core Financial Entities

### financial_transactions

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Required tenant reference. |
| branch_id | uuid/string | Branch reference. |
| member_id | uuid/string | Member reference. |
| type | enum | `savings_deposit`, `share_purchase`, `welfare_contribution`, `withdrawal`. |
| channel | enum | `mobile_money`, `cash`, `bank`, `payroll_deduction`. |
| amount | decimal | Fixed-precision monetary value. |
| status | enum | `pending_approval`, `posted`, `rejected`, `reversed`. |
| reference | text | Unique per tenant. |
| narration | text | Transaction narration. |
| maker_user_id | uuid/string | User who initiated the transaction. |
| checker_user_id | uuid/string | User who approved or rejected the transaction. |
| posted_at | timestamp | Set only after posting. |
| rejection_reason | text | Optional reason captured when a transaction is rejected. |

Financial transaction decisions follow maker-checker separation: a transaction can move from `pending_approval` to `posted` or `rejected`, and the maker cannot approve or reject their own transaction.

## Phase 2 Onboarding Entities

### branches

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Required tenant reference. |
| code | text | Unique per tenant. |
| name | text | Branch name. |
| address | text | Physical address. |
| manager_user_id | uuid/string | Optional user reference. |
| status | enum | `active`, `inactive`. |

### members

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Required tenant reference. |
| branch_id | uuid/string | Branch reference. |
| membership_no | text | Unique per tenant. |
| full_name | text | Individual, group, or institutional name. |
| member_type | enum | `individual`, `group`, `institutional`, `corporate`. |
| phone | text | Primary telephone. |
| email | text | Optional email. |
| national_id | text | NIN or alternate identifier. |
| status | enum | `applicant`, `pending_approval`, `active`, `inactive`, `dormant`, `suspended`, `exited`. |
| kyc_status | enum | `not_verified`, `pending_verification`, `verified`, `rejected`, `expired`. |
| joining_date | date | Membership date. |

### member_documents

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Required tenant reference. |
| member_id | uuid/string | Member reference. |
| document_type | text | NIN, photo, signature, bylaws, etc. |
| storage_key | text | Object storage key. |
| verification_status | enum | `not_verified`, `pending_verification`, `verified`, `rejected`, `expired`. |

### approval_workflows

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Tenant scope. |
| name | text | Workflow name. |
| module | text | Members, loans, transactions, etc. |
| active | boolean | Whether workflow is used. |

### approval_decisions

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid/string | Primary key. |
| tenant_id | uuid/string | Tenant scope. |
| workflow_id | uuid/string | Workflow reference. |
| resource_type | text | Entity being approved. |
| resource_id | text | Entity id. |
| decision | enum | `pending`, `approved`, `rejected`, `corrections_requested`. |
| decided_by | uuid/string | User reference. |
| reason | text | Required for rejection/override. |
| created_at | timestamp | Decision timestamp. |
