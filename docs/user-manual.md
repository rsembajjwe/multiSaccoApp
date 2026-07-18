# User Manual

This manual is for SACCO staff and members using the SACCO Management Platform.

## Staff Login

1. Open the web app at `http://127.0.0.1:5173`.
2. Use **Staff login** for backend-backed workflows.
3. Enter the SACCO code, username, and password issued by the platform or SACCO administrator. Use `PLATFORM` for platform administration; SACCO staff use their SACCO's assigned code.
4. Confirm the API status indicator shows the backend session is active.

Staff users see only records for their SACCO unless they are platform administrators.
Platform administrators can also be limited by assigned platform roles and permissions.

## Member Management

Use **Members** to register and maintain member records.

- Create a member with branch, membership number, contact details, KYC status, and opening balances.
- Update member status when a member is approved, suspended, activated, or exited.
- Add member documents for KYC and supporting files.
- Add next-of-kin contacts and beneficiaries during onboarding.
- Download the member import template before preparing bulk uploads.

Member balances are updated by posted financial transactions and loan repayments, not by editing the member record directly.

## Transactions

Use **Transactions** to capture SACCO financial movements.

Supported transaction types include:

- Savings deposits.
- Share purchases.
- Welfare contributions.
- Withdrawals.

New transactions are submitted as `pending_approval`. They do not change balances until approved by an authorized checker.

## Approvals

Use **Approvals** to review pending financial postings.

- Approve valid postings to update savings, shares, or welfare balances.
- Reject incorrect postings with a clear reason.
- The maker-checker rule prevents a user from approving their own transaction.

## Receipts, Statements, and Reversals

Posted transactions can produce receipt details for member confirmation.

Member statements show posted movements with running savings, shares, and welfare balances. Use the CSV export text when a member needs a portable copy.

If a posted transaction is wrong, create a reversal. A reversal creates a new posted correcting entry and references the original transaction. The original transaction remains in the audit trail.

## Loans and Guarantors

Use **Loans** to submit, review, approve, disburse, and repay member loans.

1. Submit a loan application for an active member.
2. Request guarantors where required.
3. Members accept or reject guarantor requests from the member portal.
4. Approve only when the required guarantee controls are satisfied.
5. Disburse an approved loan.
6. Record repayments against active loans.

The backend rejects overpayments, duplicate repayment references, and disbursements before approval.

## Reports

Use **Reports** for:

- Chart of accounts.
- Journal entries.
- Reconciliation.
- Regulatory summaries.
- Accounting periods.
- Supplier expenses.
- Fixed assets.
- Governance meetings and resolutions.
- Complaints.
- Mobile-money callbacks.
- Notification deliveries.

Closed accounting periods block ordinary postings, loan disbursements, repayments, expenses, assets, and statement imports for the closed date range.

## Member Portal

Members can log in with their membership number, phone, or email. Seeded demo member accounts are disabled outside the development/demo profile; live members must use credentials issued during onboarding or password reset.

Members can:

- View their own savings, shares, and welfare balances.
- View their mobile dashboard.
- See loan totals and latest notifications.
- Submit mobile loan applications.
- Accept or reject guarantor requests.
- Save offline complaint drafts and sync them later.

Members cannot view another member's account or SACCO records.
