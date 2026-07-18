# Pilot Data Import

Phase 2 starts with member onboarding and opening balance imports for pilot SACCO setup. The goal is to let staff validate spreadsheet data before saving it, with no manual database edits.

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
- Loan book import UI/API is implemented; next hardening is repayment history import for partially paid loans.
- Contact, next-of-kin, beneficiary, and KYC document metadata import.
- Spreadsheet `.xlsx` helper that exports the same CSV columns.
