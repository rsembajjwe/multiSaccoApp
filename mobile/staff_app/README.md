# SACCO Administrator App (Android + iOS)

Staff-facing app for SACCO operations on the go. Built toward **full parity**
with the Tereka web admin, delivered in phases. Every feature is gated by the
signed-in user's **permissions** (`module:action`), returned by the backend at
login, so each role sees only what it may act on.

## Stack
Flutter · Riverpod · Dio · go_router · flutter_secure_storage · intl. Mirrors
the member app's architecture; **indigo** brand to distinguish the two apps.

## Architecture
```
lib/
  main.dart / app.dart      bootstrap, router (+ session-expiry redirect), theme
  providers.dart            Riverpod wiring
  core/                     config (env URLs), theme, auth_events, widgets
  data/                     api_client (Dio), session_store (token+permissions),
                            auth_repository (login, MFA verify, me, logout)
  domain/models.dart        StaffSession (permissions + roles), MfaChallenge
  features/
    auth/                   staff login with two-factor (MFA) step
    dashboard/              identity header + permission-gated section grid
    shell/                  (reserved for bottom-nav as sections land)
```

`StaffSession.can('loans:approve')` / `canAny([...])` gate the UI; the same
permission strings the backend enforces.

## Auth
`POST /auth/login` with `{saccoCode, username, password}` → token + `permissionIds`
(+ roles, tenant). If the account has MFA, the response is an **MFA challenge**;
the app then calls `POST /auth/mfa/verify` with `{challengeId, code}`. Token and
permissions are stored in the OS keystore.

## Run
Backend must be running on port 18084 (H2 dev; see the repo scripts).

```bash
cd mobile/staff_app
# generate the platform runners (no lib/ is touched):
flutter create --platforms=android,ios --project-name sacco_staff_app .
flutter pub get
flutter run     # Android emulator (reaches host via 10.0.2.2)
```

After `flutter create`, the same **dev-only Android cleartext config** the member
app uses is needed to reach `http://10.0.2.2:18084` — add
`android/app/src/main/res/xml/network_security_config.xml` (permit `10.0.2.2`,
`localhost`) and reference it on `<application>` in the manifest. Consider renaming
the package to `com.methaltech.sacco_staff` (distinct from the member app).

Demo staff logins (dev profile): SACCO **GREE**, e.g.
`admin@greenvalley.local` / `Sacco@12345`, or `treasurer@greenvalley.local` /
`Treasurer@12345`.

## Roadmap (phased toward full parity)
1. **Foundation (done)** — staff login + MFA, permission gating, dashboard hub,
   SACCO status summary (members, balances, loan portfolio).
2. **Members (done)** — search/list and a financial profile per member:
   savings, shares, welfare and loan balances, plus their loans.
3. **Loans (done)** — searchable loan book; each loan opens its terms,
   schedule and full payment (repayment) history.
4. **Interest income (done)** — profit from interest booked per year,
   derived from the loan book.
5. **Subscription (done)** — platform subscription status and member
   capacity, with pay-balance and top-up-members (mobile money).
6. **Transactions (done)** — SACCO-wide financial ledger with search and a
   type filter (savings / withdrawals / shares / welfare).
7. **Reports (done)** — membership, member-fund composition, loan portfolio
   with arrears, interest income, and operations.
8. **Welfare (done)** — welfare claims list with a status filter.
9. **Audit log (done)** — recent audit events (who did what, when) with search.
10. **Users & roles (done, view)** — staff directory with per-user roles, and
    a roles list with permission counts.
11. **Approvals** — maker-checker queues (loans, transfers, repayments).
12. **Cross-cutting** — push (staff topics), biometric lock, offline resilience.
