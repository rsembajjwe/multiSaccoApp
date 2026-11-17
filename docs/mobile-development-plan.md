# Tereka Mobile Applications Development Plan

**Date:** 2026-08-29  
**Status:** Active mobile roadmap  
**Scope:** Android and iOS apps for SACCO members first, then SACCO staff/officers

## 1. Current State

Claude has already started the mobile track with a Flutter member application at `mobile/member_app`.

The current app is more than an empty scaffold:

- Flutter project with Android, iOS and web runners.
- Riverpod for state management.
- Dio API client with bearer-token support.
- Secure session storage.
- GoRouter navigation.
- Feature screens for login, dashboard, loans, payments, messages and profile.
- Repository layer for member, loan, payment, notification and profile data.
- Basic widget smoke tests.
- Manual endpoint constants in `lib/api_contract.dart`.

The backend is the Java/Spring Boot API under `backend-java`, with member-facing endpoints under `/api/v1/member-auth/*` and mobile-money payment endpoints under `/api/v1/integrations/mobile-money/*`.

## 2. Product Direction

Build two mobile applications, sequenced to reduce risk:

1. **Tereka Member App**
   - For SACCO members.
   - Primary app to launch first.
   - Covers balances, savings, shares, welfare, loans, guarantor requests, payments, statements, messages, complaints and profile/security settings.

2. **Tereka Staff App**
   - For SACCO staff and officers.
   - Launch after the member app foundation is stable.
   - Covers field collections, member lookup, member registration, loan intake, approvals and branch-scoped operations.

Keeping them as separate apps is recommended because member auth and staff auth are different, their permissions are different, and app-store messaging will be cleaner.

## 3. Technical Stack

Use the existing Flutter stack:

- Flutter stable channel.
- Dart 3.x.
- Riverpod for state and dependency wiring.
- Dio for HTTP.
- GoRouter for navigation.
- Flutter Secure Storage for Keychain/Keystore token storage.
- Intl for formatting money, dates and localized text.
- Generated OpenAPI client from `openapi.yaml` once the contract is complete.

Planned additions:

- `local_auth` for biometric unlock.
- Firebase Cloud Messaging and APNs for push notifications.
- Crashlytics or Sentry for crash reporting.
- Drift or Isar for local read-only cache.
- Golden/widget/integration testing packages as the UI matures.

## 4. Architecture Target

Keep the current layered layout and mature it without a rewrite:

```text
mobile/member_app/lib/
  core/
    config.dart
    theme/
    errors/
    logging/
    localization/
  data/
    api_client.dart
    generated_api/
    session_store.dart
    *_repository.dart
  domain/
    models.dart
    use_cases/
  features/
    auth/
    dashboard/
    loans/
    payments/
    messages/
    profile/
    statements/
    guarantors/
    support/
  providers.dart
  app.dart
  main.dart
```

Rules:

- Widgets should remain presentation-focused.
- API DTOs should be mapped at repository boundaries.
- Money values should be handled as fixed precision strings or numeric values from the backend, never through lossy UI calculations for financial decisions.
- The backend remains the source of truth for permissions, balances, loan status, payment status and approvals.
- No provider secrets or mobile-money credentials are ever compiled into the app.

## 5. Member App Roadmap

### Phase 0: Stabilize The Started Scaffold

Goal: make the current Flutter app reliably build and test on Android and iOS.

Deliverables:

- Run and fix `flutter analyze`.
- Run and fix `flutter test`.
- Confirm Android emulator local API routing through `10.0.2.2`.
- Confirm iOS simulator local API routing through `localhost`.
- Update stale README/runbook notes now that Android and iOS runners exist.
- Replace mojibake characters in mobile docs and UI strings.
- Confirm seeded demo login uses the current four-letter SACCO code format.
- Add a small app shell smoke test for login, dashboard route, loan route and payment route.

Exit criteria:

- App launches on Android emulator.
- App launches on iOS simulator.
- Login succeeds against the Java-backed local API.
- Tests pass locally.

### Phase 1: Secure Auth And Member Dashboard

Goal: a member can log in securely and see accurate SACCO account information.

Deliverables:

- SACCO code, identifier and password login.
- Session restore from secure storage.
- Session expiry handling and forced logout on `401`.
- Logout that clears secure storage and cached PII.
- Dashboard balances: savings, shares, welfare, loan balance and active alerts.
- Pull-to-refresh with clear loading, empty and error states.
- Password reset entry points for email and SMS flows where supported by the backend.
- Basic profile read screen.

Backend/API checks:

- Confirm `/member-auth/login`, `/member-auth/me`, `/member-auth/logout` and `/member-auth/mobile-dashboard` response shapes in `openapi.yaml`.
- Add missing OpenAPI schemas before generating the typed client.

Exit criteria:

- Member can log in and return to a valid saved session.
- Expired/invalid sessions route back to login.
- Dashboard values match the web member portal for the same seeded member.

### Phase 2: Statements, Receipts And Contribution History

Goal: members can inspect their money movement without visiting the SACCO office.

Deliverables:

- Statement list with date range filter.
- Transaction detail and receipt view.
- Savings, shares, welfare and dues contribution history.
- Search/filter by transaction type and status.
- PDF/share/download decision: either server-generated receipt download or mobile-rendered receipt, based on existing backend support.

Backend/API checks:

- Confirm member-scoped statement endpoints exist and are documented.
- Ensure tenant/member isolation is enforced server-side for every statement endpoint.

Exit criteria:

- A member can see only their own transactions.
- Receipt data matches posted financial transactions.
- Empty and failed-network states are polished.

### Phase 3: Loans And Guarantor Flows

Goal: support the full member loan journey from application to repayment visibility.

Deliverables:

- Loan list and loan detail.
- Loan product list with terms, limits and interest.
- Loan application form.
- Guarantor selection/request flow.
- Incoming guarantor requests.
- Accept/decline guarantor request.
- Display guarantee amount, signature status, loan status, repayment schedule and outstanding balance.
- Loan repayment history.

Backend/API checks:

- Confirm mobile loan application payload aligns with the hardened backend: product ID, principal/amount, term months, purpose, guarantor pledges and savings-secured behavior.
- Confirm guarantor pledge amount is honored and capacity errors are exposed clearly.
- Confirm loan approval status values are stable enough for mobile display.

Exit criteria:

- Member can apply for a loan.
- Member can respond to guarantor requests.
- Loan status transitions are understandable and consistent with the web app.

### Phase 4: Mobile Money Payments

Goal: members can initiate secure payments from the app.

Deliverables:

- Payment purpose selector: savings, shares, welfare, membership dues and loan repayment.
- Provider-aware phone number validation.
- Payment request creation.
- Payment status polling.
- Payment history.
- Clear pending, failed, expired and successful payment states.
- Retry flow that does not create duplicate payments without user confirmation.

Security rules:

- The app never asks for or stores a mobile-money PIN.
- Provider credentials stay only on the backend.
- Payment status is server-authoritative.
- Duplicate callback/idempotency behavior remains backend-owned.

Exit criteria:

- Member can start an STK/mobile-money collection request.
- Member sees the status update after backend callback or polling.
- Failed and duplicate payment cases are handled cleanly.

### Phase 5: Messages, Support And Profile

Goal: make the app useful for SACCO communication and member service.

Deliverables:

- Member notifications and SACCO notices.
- Notification read/acknowledge state.
- Complaint creation and tracking.
- Support chat thread list and chat detail if enabled by the backend.
- Profile details.
- Notification channel preferences.
- Privacy consent and privacy request screens.
- Account deletion/privacy request entry point for store compliance.

Backend/API additions:

- Push token registration endpoint, for example `POST /member-auth/push-tokens`.
- Push token removal endpoint for logout/device removal.
- Notification push fan-out from the existing notification service.

Exit criteria:

- Member receives in-app messages.
- Push notifications work in internal testing builds.
- Complaint/support flows are member-scoped and audited.

### Phase 6: Hardening And Store Launch

Goal: ship a production-ready Android and iOS member app.

Deliverables:

- Biometric unlock as a local convenience.
- TLS-only production builds.
- Certificate pinning decision and implementation if operationally ready.
- App version/force-upgrade check.
- Crash reporting with PII scrubbing.
- Analytics events for non-sensitive funnel health.
- Accessibility pass with TalkBack and VoiceOver.
- Low-end Android performance pass.
- Store screenshots, descriptions, privacy policy and data-safety forms.
- Play Console internal testing and TestFlight builds.

Backend/API additions:

- `GET /api/v1/app/version` or equivalent mobile app config endpoint.
- Maintenance-mode and minimum-supported-build fields.

Exit criteria:

- Production build artifacts are signed.
- Store compliance materials are ready.
- Pilot SACCO users can complete agreed UAT flows.

## 6. Staff App Roadmap

Start after the member app reaches Phase 3 or later, unless there is an urgent field-operations need.

### Staff Phase 0: Shared Foundation

- Reuse core Flutter patterns from the member app.
- Use staff `/auth/login`, not `/member-auth/login`.
- Store staff sessions separately from member sessions.
- Drive navigation from server-returned permissions.

### Staff Phase 1: Field Operations

- Member search.
- Branch-scoped member list.
- Member registration/intake.
- Deposit and contribution capture.
- Loan repayment capture.
- Receipt view.

### Staff Phase 2: Loan Officer Workflows

- Loan intake.
- Attach signed-form/reference evidence.
- Guarantor request creation.
- Credit appraisal view.
- Branch-scoped loan list.

### Staff Phase 3: Approvals And Controls

- Pending transaction approvals.
- Loan approvals by role.
- Disbursement maker-checker.
- Branch-scoped reporting.
- Audit event visibility for permitted roles.

### Staff Phase 4: Hardening

- Strict permission-driven UI.
- Offline read-only branch cache.
- Device binding where required.
- Audit-friendly action confirmations.
- Store or enterprise distribution decision.

## 7. Backend Work Required For Mobile

Most member features can use existing endpoints. Additive backend work still needed:

- Complete `openapi.yaml` for every member mobile endpoint.
- Push-token registration and unregister endpoints.
- Push fan-out integration in notification delivery.
- App version/force-upgrade endpoint. **Done for the Staff app:** public server policy, configurable
  minimum/latest Android builds, optional update notice, and mandatory login blocking.
- Member-scoped statement/receipt endpoints if not already exposed cleanly.
- Mobile-specific API smoke script covering login, dashboard, loans, payments and notifications.
- Optional app-device table for device metadata, revoked devices and audit.

No backend rewrite is planned.

## 8. CI/CD Plan

Add mobile CI in stages:

1. `flutter pub get`.
2. `flutter analyze`.
3. `flutter test`.
4. OpenAPI client generation from `openapi.yaml`.
5. Contract drift check: generated client must match committed output.
6. Android debug build on pull requests.
7. Android signed AAB on release tags.
8. iOS build on macOS runner when Apple signing is configured.
9. Fastlane lanes for Play Internal Testing and TestFlight.

Secrets required:

- Android upload keystore.
- Play Console service account.
- Apple Developer credentials or Fastlane Match configuration.
- Crash reporting DSN/API keys.

## 9. Testing Strategy

Minimum test layers:

- Unit tests for repositories and domain mapping.
- Widget tests for every primary screen.
- Golden tests for login, dashboard, loan detail and payment sheet.
- Integration tests for login, dashboard refresh, loan application and payment request.
- Backend contract tests for member endpoint response shapes.
- Manual UAT on one low-end Android device, one recent Android device, one small iPhone and one large iPhone.

High-risk cases:

- Expired sessions.
- Wrong SACCO code.
- Tenant/member isolation.
- Duplicate payment requests.
- Guarantor capacity exceeded.
- Loan application rejected by backend validation.
- Offline startup with cached PII.

## 10. Security And Compliance

Mandatory controls:

- Store tokens only in Keychain/Keystore.
- Never store passwords.
- Clear cached PII on logout and token expiry.
- Mask sensitive member information where practical.
- Use HTTPS-only for staging and production.
- Keep provider credentials and secrets on the backend.
- Do not log bearer tokens, phone numbers, national IDs or payment references in plaintext telemetry.
- Provide in-app privacy/account deletion request path.
- Prepare Google Play Data Safety and Apple App Privacy disclosures before external testing.

## 11. Suggested Delivery Timeline

Indicative timeline with one Flutter engineer and backend support:

- Phase 0: 1 week.
- Phase 1: 2 weeks.
- Phase 2: 2 weeks.
- Phase 3: 3 weeks.
- Phase 4: 2 to 3 weeks.
- Phase 5: 2 weeks.
- Phase 6: 2 to 3 weeks.

Member app MVP target: 6 to 8 weeks for login, dashboard, statements, loans and payments.

Store-ready member app target: 12 to 16 weeks depending on signing, push notifications, provider testing and UAT feedback.

Staff app target after member foundation: 8 to 12 weeks.

## 12. Immediate Next Steps

1. Run `flutter analyze` and `flutter test` in `mobile/member_app`.
2. Fix any compile/analyzer issues from the existing scaffold.
3. Update `docs/mobile-run-android-ios.md` because platform runners now exist.
4. Confirm the local demo credentials and current four-letter SACCO code in mobile docs.
5. Complete OpenAPI coverage for member mobile endpoints.
6. Replace `lib/api_contract.dart` with generated client code.
7. Finish Phase 1 login/session/dashboard flows against the Java API.
8. Add the first mobile CI job.
