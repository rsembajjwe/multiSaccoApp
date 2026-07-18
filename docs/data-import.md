# Pilot Data Import

Phase 2 starts with member onboarding imports for pilot SACCO setup. The goal is to let staff validate spreadsheet data before saving it, with no manual database edits.

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

`dryRun=true` validates without saving. `dryRun=false` saves the whole batch only when every row is valid.

## Validation Evidence

Record these values in the release evidence pack before pilot onboarding:

- Import template version and commit SHA.
- Tenant and branch used for validation.
- Total rows, created rows, skipped rows, and validation errors.
- Confirmation that no cross-tenant branch IDs were accepted.

## Next Import Slices

- Opening balances import with balanced ledger posting.
- Loan book import with repayment schedule validation.
- Contact, next-of-kin, beneficiary, and KYC document metadata import.
- Spreadsheet `.xlsx` helper that exports the same CSV columns.
