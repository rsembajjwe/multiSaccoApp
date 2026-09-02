# SACCO Member App (Android + iOS)

Flutter member app for the SACCO platform. **Phase 0 foundation** — a working
vertical slice (login → secure token storage → dashboard) that establishes the
architecture. See `docs/mobile-development-plan.md` for the full roadmap.

## Stack
Flutter · Riverpod (state) · Dio (HTTP) · go_router (navigation) ·
flutter_secure_storage (Keychain/Keystore) · intl (formatting).

## Layout
```
lib/
  core/            config (env base URLs)
  api_contract.dart endpoint paths (to be replaced by a generated OpenAPI client)
  data/            api_client (Dio + auth interceptor), session_store, member_repository
  domain/          entities (MemberSession, DashboardSummary)
  features/        auth/ (login), dashboard/
  providers.dart   Riverpod wiring
  app.dart         router + theme
  main.dart        bootstrap
```

## Run
Backend must be reachable. The default `local` env points the Android emulator
at the host dev server (`http://10.0.2.2:5173/api/v1`).

```bash
flutter pub get
flutter run                                   # Android emulator (local)
flutter run --dart-define=SACCO_LOCAL_URL=http://localhost:5173/api/v1   # iOS simulator
flutter run --dart-define=SACCO_ENV=staging   # staging.tereka.online
```

Seed demo login (dev/demo profile): SACCO `GVS`, identifier `GVS-0001`,
password `Member@12345`.

## Test
```bash
flutter analyze
flutter test
```

## Next (Phase 1+)
- Replace `api_contract.dart` with a client generated from `openapi.yaml` in CI.
- Add: statements, loan apply/repay, mobile-money payments, notifications/push,
  support chat, profile & settings, biometric unlock, TLS certificate pinning.
- iOS signing (Fastlane match) + a macOS CI build job.

> Phase 0 code was scaffolded but **not compiled here** (no Flutter SDK in the
> authoring environment). Run `flutter pub get && flutter analyze && flutter test`
> first; expect minor fixes (e.g. the exact `mobile-dashboard` JSON shape in
> `DashboardSummary.fromJson`, which is defensively parsed but should be pinned
> to the real payload).
