# SACCO Member App (Android + iOS)

Flutter member-facing app for the SACCO platform. Members sign in, view their
savings/shares/welfare/loan balances, see transaction history, repay loans and
pay subscription dues by mobile money, deposit to funds, raise complaints,
manage their profile, and receive in-app notices.

## Stack
Flutter · Riverpod (state) · Dio (HTTP + auth interceptor) · go_router
(navigation + auth redirect) · flutter_secure_storage (Keychain/Keystore) ·
local_auth (biometric unlock) · image_picker (profile photo) · intl.

## Architecture
```
lib/
  main.dart          bootstrap (ProviderScope)
  app.dart           MaterialApp.router + theme + session-expiry redirect + auto-lock
  providers.dart     Riverpod wiring (repositories + async data providers)
  api_contract.dart  member-auth endpoint paths
  core/
    config.dart      environment base URLs (local/staging/prod)
    theme.dart       enterprise Material 3 theme (light + dark)
    auth_events.dart session-expired + app-locked notifiers
    widgets/         Shimmer/ListSkeleton/DashboardSkeleton, ErrorRetry
  data/              api_client (Dio), session_store, and repositories:
                     member, loan, payment, notification, profile
  domain/models.dart defensive fromJson entities
  features/
    auth/            login, forgot-password, biometric lock
    dashboard/       balances, quick actions, recent activity
    transactions/    full + category-filtered statement
    loans/           list + loan detail (repayment history, pay)
    payments/        mobile-money pay sheet + status polling
    subscription/    membership status + pay dues
    complaints/      submit + history
    messages/        in-app notices (unread badge, mark read)
    profile/         photo upload, contact editing, notification channels
    shell/           bottom-nav shell (Home · Loans · Pay · Inbox · Complaints · Profile)
```

Data flows: screen → Riverpod provider → repository → `ApiClient` (Dio). The
client injects the bearer token, unwraps the `{data:…}` envelope, maps errors to
readable messages, and on 401 clears the session and signals a redirect to login.

## Features
- **Auth**: SACCO-code + identifier + password login; opaque bearer token in the
  OS keystore; optional **biometric unlock** with auto-lock on resume; forgot
  password (SMS/email code → reset).
- **Dashboard**: total balance header, tappable Savings/Shares/Welfare/Loans
  cards (→ category-filtered history), other-funds list, recent activity, and
  quick actions (Deposit · Pay loan · Statement).
- **Transactions**: full statement (`/statement`) with per-category filtering.
- **Loans**: list → detail with repayment history and a mobile-money repayment.
- **Payments**: deposits (savings/shares/welfare), loan repayment, subscription
  dues — each with a **status sheet that polls until confirmed/failed**.
- **Subscription**: status + pay dues. **Complaints**: submit + track.
- **Profile**: profile photo upload, edit phone/WhatsApp/email, notification
  channels, subscription link, sign out.
- **Inbox**: notices with unread badge on the tab and mark-all-read.

## Run
The backend must be running and reachable. Local dev uses H2 in-memory + Flyway
(no Postgres needed) on port **18084**.

```powershell
# 1) backend (separate window; sets SERVER_PORT=18084)
cd ..\..            # repo root
powershell -ExecutionPolicy Bypass -File .\scripts\start-local-java-stack.ps1
#   verify: http://localhost:18084/api/v1/health  -> JSON

# 2) app on an Android emulator (reaches host via 10.0.2.2)
cd mobile\member_app
flutter pub get
flutter run --dart-define=SACCO_ENV=local
```

Environments (via `--dart-define`): `SACCO_ENV=prod` is the default and uses
`https://globalntereka.com/api/v1`; pass `SACCO_ENV=local` explicitly for
`10.0.2.2:18084`, or select `staging`. A custom endpoint can be
selected with `--dart-define=SACCO_API_BASE_URL=https://example.com/api/v1`.

To run or install the app on a physical phone against the hosted backend:

```powershell
flutter run --release --dart-define=SACCO_ENV=prod
# Or create an installable Android package:
flutter build apk --release --dart-define=SACCO_ENV=prod
```

The production endpoint uses HTTPS, so the phone can connect over mobile data or
Wi-Fi without being on the development computer's network.

Demo login (dev/demo profile only): SACCO **GREE**, identifier **GREE-0001**,
password **Member@12345**.

### Android notes
- Cleartext to the dev backend is allowed via
  `android/app/src/main/res/xml/network_security_config.xml` (dev hosts only).
- `MainActivity` extends `FlutterFragmentActivity` (required by local_auth).
- `build.gradle.kts` excludes a duplicate `androidx.annotation` LICENSE file.

## App icon & splash
Assets live in `assets/icon/`. Regenerate native icons/splash after changing them:
```bash
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

## Test
```bash
flutter analyze
flutter test        # model parsing, login widget, theme
```

## Backend endpoints used (member-auth)
`/login` · `/logout` · `/me` · `/mobile-dashboard` · `/statement` ·
`/fund-balances` · `/loans/{id}/repayments` · `/mobile-loans` ·
`/loan-products` · `/notifications` (+ `/{id}/acknowledge`) · `/complaints`
(+ `/mobile-complaints`) · `/membership` · `/profile-photo` (GET/POST) ·
`PATCH /profile` (phone/WhatsApp/email) · `/password-reset/request|confirm`,
plus `/integrations/mobile-money/payment-requests`.

## Push notifications (planned — needs Firebase)
Design is topic-based: each member subscribes to FCM topic `member_<id>`; the
backend `PushNotificationProvider` sends to that topic. To enable:
1. Create a Firebase project; add an Android app (`com.example.sacco_member_app`);
   place `google-services.json` in `android/app/`.
2. Generate a service-account key (Project settings → Service accounts) for the
   backend to send via the Firebase Admin SDK.
3. (iOS) add `GoogleService-Info.plist` + enable APNs.

Then: add `firebase_core`/`firebase_messaging`, request notification permission,
subscribe to `member_<id>` at login, handle foreground/background messages
(refresh the inbox + badge), and swap the backend push stub for a real FCM send.
