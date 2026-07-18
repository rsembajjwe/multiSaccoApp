# UAT Data Setup

Use this setup after a staging Java API is running and before testers execute `docs/uat-scripts.md`.

The setup script creates a fresh UAT branch, staff user, member, posted balances, one pending approval item, one reversal candidate, one staff-originated loan, one pending guarantor request, one member-originated mobile loan, and one synced member complaint. It prints the generated IDs and login details as JSON.

## Run

```powershell
$env:API_BASE_URL = "http://127.0.0.1:8080/api/v1"
npm.cmd run uat:setup
```

For hosted staging, set `API_BASE_URL` to the staging API base URL.

Optional overrides:

```powershell
$env:UAT_RUN_ID = "pilot001"
$env:UAT_MEMBER_PASSWORD = "Member@12345"
$env:UAT_STAFF_PASSWORD = "Sacco@12345"
npm.cmd run uat:setup
```

## Required Conditions

- Java backend is running.
- Database has Flyway seed data.
- Demo logins are enabled for the setup window, or equivalent platform/SACCO test credentials exist.
- Platform admin can log in as `admin@platform.local`.
- SACCO admin can log in as `admin@greenvalley.local`.

Turn demo logins off again after setup when the handoff policy requires it.

## Tester Accounts

The script prints:

- Platform admin seeded login for platform UAT.
- SACCO admin seeded login for administrator UAT.
- New UAT staff login for staff UAT.
- New UAT member login for Member Portal UAT.

Do not commit real staging passwords. If staging uses non-demo credentials, store them in the secret manager or the UAT evidence tracker.

## Expected Test Coverage

The generated data supports:

- Dashboard source/sync checks.
- SACCO Registration review.
- Subscription review and payment-state checks.
- Member list, profile, statement, and balances.
- Pending approval queue.
- Posted transaction receipt and reversal.
- Loan application lifecycle.
- Guarantor request visibility.
- Member Portal balance, loans, notifications, and complaint sync.
- Operations alert and count review.
