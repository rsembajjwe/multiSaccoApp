# Running the SACCO Member App on Android & iOS (Phase 0)

Companion to `docs/mobile-development-plan.md`. Gets the Phase 0 scaffold in
`mobile/member_app` actually launching on both platforms.

## 1. Prerequisites
- Flutter SDK (stable channel) + Dart. `flutter doctor` should be clean.
- **Android:** Android Studio + an emulator (API 34 recommended) or a device.
- **iOS:** macOS + Xcode + CocoaPods + a simulator/device. (iOS builds require a Mac.)

## 2. Generate the platform runners
The repo ships `mobile/member_app/lib` + `pubspec.yaml` but **no `android/` or
`ios/` folders yet**. Generate them without touching your Dart:

```bash
cd mobile/member_app
flutter create --platforms=android,ios --project-name sacco_member_app .
flutter pub get
```

## 3. Android — allow the dev API over HTTP (required)
The default dev API is `http://10.0.2.2:5173/api/v1` (the emulator's route to your
host machine). **Android 9+ blocks cleartext HTTP by default**, so login will fail
until you allow it *for dev only*.

Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- DEV ONLY: permit cleartext to the emulator's host route and localhost. -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">localhost</domain>
  </domain-config>
  <!-- Everything else (prod https://globalntereka.com) stays TLS-only. -->
</network-security-config>
```

Reference it on the `<application>` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ... >
```

`flutter create` adds `<uses-permission android:name="android.permission.INTERNET"/>`
for debug; confirm it's present for release builds too.

> Production points at `https://globalntereka.com/api/v1`

## Proprietor application

The platform-owner application is in `mobile/proprietor_app`. It uses the same environment defines as the staff and member applications:

```powershell
cd mobile/proprietor_app
flutter run --dart-define=SACCO_ENV=local
flutter build apk --release --dart-define=SACCO_ENV=prod
```

Only users belonging to `tenant_platform` can open this application. Backend permissions continue to govern SACCO management, billing, approvals, support and employee administration.
> (`--dart-define=SACCO_ENV=prod`),
> which needs **no** cleartext exception — keep the config dev-scoped as above so
> release builds stay strict.

## 4. iOS — allow the dev API over HTTP (simulator)
On the iOS simulator the host is `localhost`, so pass
`--dart-define=SACCO_API_BASE_URL=http://localhost:18084/api/v1`. Permit cleartext to
localhost for dev by adding to `ios/Runner/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

(Production HTTPS needs no ATS exception. When biometric unlock lands in Phase 1,
also add `NSFaceIDUsageDescription`.)

## 5. Run
```bash
# Android emulator (local env → 10.0.2.2)
flutter run --dart-define=SACCO_ENV=local

# iOS simulator (localhost)
flutter run --dart-define=SACCO_ENV=local --dart-define=SACCO_API_BASE_URL=http://localhost:18084/api/v1

# Against staging
flutter run --dart-define=SACCO_ENV=staging

# Physical Android or iOS phone against the hosted backend
flutter run --release --dart-define=SACCO_ENV=prod

# Custom hosted API endpoint
flutter run --release --dart-define=SACCO_API_BASE_URL=https://example.com/api/v1
```

Seed demo login (dev/demo profile only): SACCO **GVS**, identifier **GVS-0001**,
password **Member@12345**. The backend must be running and reachable.

## 6. Verify loop
```bash
flutter analyze     # fix any scaffold nits it reports first
flutter test        # runs the login widget smoke test
```

> Phase 0 was authored without a Flutter SDK in the loop, so run `analyze` before
> anything else and paste whatever it flags — the likeliest fix is the
> `mobile-dashboard` JSON shape in `DashboardSummary.fromJson`, which is parsed
> defensively but should be pinned to the live payload.

## 7. Then Phase 1
1. Replace `lib/api_contract.dart` with a **typed client generated from `openapi.yaml`** in CI (fill the member loan-read gaps in the spec first — they're currently untyped, so the app can't safely model them from the spec alone).
2. Build **Loans** (member loans arrive inside the `mobile-dashboard` payload; apply via `POST /member-auth/mobile-loans` with `{loanProductId, principal, termMonths, purpose}`), then **Statements**, then **mobile-money payments**.
3. Add biometric unlock, TLS certificate pinning, push notifications, and the backend push-token + force-upgrade endpoints noted in the plan.
