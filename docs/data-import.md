# Pilot Data Import

Phase 2 starts with member onboarding and opening balance imports for pilot SACCO setup. The goal is to let staff validate spreadsheet data before saving it, with no manual database edits.

## Excel Workbook Templates

Excel-ready `.xlsx` templates are available in `docs/import-templates`:

- `members-import-template.xlsx`
- `member-metadata-import-template.xlsx`
- `opening-balances-import-template.xlsx`
- `loan-book-import-template.xlsx`
- `repayment-history-import-template.xlsx`

Each workbook has:

- `Template` sheet with the exact backend CSV headers and sample rows.
- `Guidance` sheet with the most important validation rules.

The backend import APIs still accept JSON rows parsed from CSV. These workbooks are preparation aids for SACCO staff who prefer Excel before pasting/exporting CSV into the platform.

Regenerate and verify the workbooks with:

```powershell
npm.cmd run imports:templates
npm.cmd run imports:check
```

## Member Import Flow

1. Create or approve the SACCO tenant.
2. Create at least one branch for the tenant.
3. Sign in as platform admin or the SACCO's own staff user.
4. Open Members and select `Import members`.
5. Copy or edit the CSV template.
6. Run `Validate`.
7. Run `Import` only after validation passes.
8. Confirm imported members appear as `pending_approval`.

## Required Member Columns

| Column | Rule |
| --- | --- |
| `membershipNo` | Required, unique inside the SACCO and unique within the import file. |
| `branchId` | Required, must belong to the selected SACCO tenant. |
| `fullName` | Required. |
| `memberType` | Optional; defaults to `individual`. Allowed: `individual`, `group`, `institutional`, `corporate`. |
| `phone` | Required. |
| `email` | Optional. |
| `nationalId` | Optional. |
| `kycStatus` | Optional; defaults to `pending_verification`. |
| `joiningDate` | Optional; defaults to current date. |
| `password` | Required temporary member portal password, minimum 8 characters. |

## API Contract

Get the tenant-scoped template:

```http
GET /api/v1/members/import-template?tenantId={tenantId}
```

Validate or import rows:

```http
POST /api/v1/members/import
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_green",
  "dryRun": true,
  "rows": [
    {
      "membershipNo": "GVS-0100",
      "branchId": "branch_green_main",
      "fullName": "Pilot Member",
      "memberType": "individual",
      "phone": "+256700000000",
      "email": "pilot.member@example.local",
      "nationalId": "CM0000000PILOT",
      "kycStatus": "pending_verification",
      "joiningDate": "2026-07-18",
      "password": "Member@12345"
    }
  ]
}
```

## Member Profile Metadata Import Flow

Use profile metadata import after member records exist. One CSV supports four `recordType` values:

- `kyc_status` updates the member KYC status.
- `document` records KYC/document metadata and storage keys.
- `next_of_kin` records emergency or family contacts.
- `beneficiary` records beneficiary allocation percentages.

Validation is all-or-nothing:

- The member must exist in the selected SACCO.
- `kycStatus` and `verificationStatus` must use supported KYC states.
- `documentType` must be one of the supported document categories.
- Next-of-kin rows require full name, relationship, and phone.
- Beneficiary rows require full name, relationship, and allocation percentage.
- Existing plus imported beneficiary allocations cannot exceed `100`.
- Duplicate metadata rows in the same file are rejected.

## Member Profile Metadata Columns

| Column | Rule |
| --- | --- |
| `recordType` | Required. Allowed: `kyc_status`, `document`, `next_of_kin`, `beneficiary`. |
| `membershipNo` | Required, must already exist in the selected SACCO. |
| `fullName` | Required for `next_of_kin` and `beneficiary`. |
| `relationship` | Required for `next_of_kin` and `beneficiary`. |
| `phone` | Required for `next_of_kin`; optional for `beneficiary`. |
| `address` | Optional next-of-kin address. |
| `primaryContact` | Optional `true`/`false` for `next_of_kin`. |
| `allocationPercent` | Required for `beneficiary`; total allocations cannot exceed `100`. |
| `documentType` | Required for `document`. Allowed: `national_id`, `photo`, `signature`, `bylaws`, `registration_certificate`, `other`. |
| `storageKey` | Required for `document`; points to the file/object-store key. |
| `verificationStatus` | Optional for `document`; defaults to `pending_verification`. |
| `kycStatus` | Required for `kyc_status`. |

Validate or import profile metadata:

```http
POST /api/v1/members/metadata-import
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_green",
  "dryRun": true,
  "rows": [
    {
      "recordType": "document",
      "membershipNo": "GVS-0100",
      "documentType": "national_id",
      "storageKey": "kyc/GVS-0100/national-id.pdf",
      "verificationStatus": "verified"
    },
    {
      "recordType": "beneficiary",
      "membershipNo": "GVS-0100",
      "fullName": "Sample Beneficiary",
      "relationship": "daughter",
      "phone": "+256700333444",
      "allocationPercent": "50"
    }
  ]
}
```

## Loan Book Import Flow

Use loan book import after members are active and opening balances have been validated.

1. Open Loans.
2. Select `Loan book import`.
3. Copy or edit the CSV template.
4. Run `Validate`.
5. Run `Import` only after validation passes.
6. Confirm the imported loans appear as `active` or `closed`.

Loan book validation checks:

- The member exists in the selected SACCO and is active.
- The product is one of the configured loan products.
- Original amount is greater than zero.
- Outstanding balance is not negative and does not exceed original amount.
- Repayment period is between 1 and 60 months.
- Remaining months are not greater than repayment months.
- Monthly installment times remaining months covers outstanding balance.
- Closed loans have zero outstanding balance.

## Loan Book Columns

| Column | Rule |
| --- | --- |
| `membershipNo` | Required, must belong to an active member in the selected SACCO. |
| `product` | Required. Allowed: `Development Loan`, `Emergency Loan`, `Agriculture Loan`, `School Fees Loan`. |
| `originalAmount` | Required numeric amount greater than `0`. |
| `outstandingBalance` | Required numeric amount between `0` and original amount. |
| `repaymentMonths` | Required whole number from `1` to `60`. |
| `remainingMonths` | Required whole number from `0` to repayment months. |
| `monthlyInstallment` | Required when remaining months are greater than `0`. |
| `disbursedDate` | Optional `YYYY-MM-DD`; defaults to current date. |
| `status` | `active` or `closed`. |
| `purpose` | Optional migration note or loan purpose. |

Validate or import loan book rows:

```http
POST /api/v1/loans/import
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_green",
  "dryRun": true,
  "rows": [
    {
      "membershipNo": "GVS-0100",
      "product": "Development Loan",
      "originalAmount": "1200000",
      "outstandingBalance": "900000",
      "repaymentMonths": "12",
      "remainingMonths": "9",
      "monthlyInstallment": "100000",
      "disbursedDate": "2026-04-18",
      "status": "active",
      "purpose": "Migrated dairy equipment loan"
    }
  ]
}
```

`dryRun=true` validates without saving. `dryRun=false` saves the whole batch only when every row is valid.

## Repayment History Import Flow

Use repayment history import after the migrated loan book is imported. This import records historical repayments that already happened before go-live.

Important accounting rule: repayment history does not reduce the migrated outstanding balance again. The loan book row already carries the current outstanding balance. Repayment history only creates repayment records up to the already-paid amount, calculated as `originalAmount - outstandingBalance` minus any existing imported repayments.

1. Open Loans.
2. Select `Repayment history`.
3. Copy or edit the CSV template.
4. Run `Validate`.
5. Run `Import` only after validation passes.
6. Confirm loan repayment totals and member statements.

Repayment history validation checks:

- The member exists in the selected SACCO.
- The product matches an imported active or closed loan for that member.
- `loanDisbursedDate` is required when more than one matching loan exists.
- Amount is numeric and greater than zero.
- Channel is one of the supported repayment channels.
- Reference is required, unique in the file, and not already recorded.
- Imported history cannot exceed the paid-to-date amount for the loan.

## Repayment History Columns

| Column | Rule |
| --- | --- |
| `membershipNo` | Required, must belong to a member in the selected SACCO. |
| `product` | Required, must match the imported loan product. |
| `loanDisbursedDate` | Optional `YYYY-MM-DD`; required when the member has multiple matching loans. |
| `amount` | Required numeric amount greater than `0`. |
| `channel` | Required. Allowed: `cash`, `bank`, `mobile_money`, `payroll`. |
| `reference` | Required unique repayment reference. |
| `receivedDate` | Optional `YYYY-MM-DD`; defaults to current date. |
| `narration` | Optional repayment note. |

Validate or import repayment history rows:

```http
POST /api/v1/loans/repayments/import
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_green",
  "dryRun": true,
  "rows": [
    {
      "membershipNo": "GVS-0100",
      "product": "Development Loan",
      "loanDisbursedDate": "2026-04-18",
      "amount": "300000",
      "channel": "bank",
      "reference": "LRH-GVS-0100-001",
      "receivedDate": "2026-05-18",
      "narration": "Migrated historical repayment"
    }
  ]
}
```

## Validation Evidence

Record these values in the release evidence pack before pilot onboarding:

- Import template version and commit SHA.
- Tenant and branch used for validation.
- Total rows, created rows, skipped rows, and validation errors.
- Confirmation that no cross-tenant branch IDs were accepted.

## Opening Balance Import Flow

Use opening balances after member records exist and before live posting starts.

1. Open Transactions.
2. Select `Opening balances`.
3. Copy or edit the CSV template.
4. Run `Validate`.
5. Run `Import` only after validation passes.
6. Confirm member balances, posted financial transactions, and member statements.

Opening balances are posted as normal financial transactions:

- `savingsBalance` posts as `savings_deposit`.
- `sharesBalance` posts as `share_purchase`.
- `welfareBalance` posts as `welfare_contribution`.
- Zero-value columns are skipped.
- The whole batch is rejected if any row has validation errors.

## Opening Balance Columns

| Column | Rule |
| --- | --- |
| `membershipNo` | Required, must already exist in the selected SACCO tenant, and cannot repeat in the file. |
| `savingsBalance` | Optional numeric amount; defaults to `0`. |
| `sharesBalance` | Optional numeric amount; defaults to `0`. |
| `welfareBalance` | Optional numeric amount; defaults to `0`. |
| `reference` | Optional base reference; transaction references get `-SAV`, `-SHR`, or `-WEL` suffixes. |
| `postingDate` | Optional `YYYY-MM-DD`; rejected when the accounting period is closed. |
| `narration` | Optional narration copied to posted ledger rows. |

Validate or import opening balances:

```http
POST /api/v1/financial-transactions/opening-balances/import
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tenantId": "tenant_green",
  "dryRun": true,
  "rows": [
    {
      "membershipNo": "GVS-0100",
      "savingsBalance": "100000",
      "sharesBalance": "50000",
      "welfareBalance": "10000",
      "reference": "OB-GVS-0100",
      "postingDate": "2026-07-18",
      "narration": "Opening balances from pilot data import"
    }
  ]
}
```

## Next Import Slices

- Opening balance import UI/API is implemented; next hardening is accounting journal evidence for each posted opening balance.
- Loan book and repayment history import UI/API are implemented; next hardening is matching imported history to statement evidence.
- Contact, next-of-kin, beneficiary, and KYC document metadata import is implemented; next hardening is file/object-storage reconciliation.
- Spreadsheet `.xlsx` templates are implemented with header checks against Java backend constants.
