# Tereka Proprietor Mobile App

Dedicated Android and iOS administration client for authorised Tereka platform owners and employees.

## Included workflows

- Platform-only authentication, first-login password change, MFA and secure token storage.
- Live platform dashboard with SACCO, subscription, revenue and risk indicators.
- SACCO directory, three-stage registration, administrator invitation and lifecycle actions.
- Subscription billing, outstanding balances and verified payment recording.
- Maker-checker approval inbox for controlled fleet changes.
- Customer support queue, business reports and platform employee administration.
- Permission-aware navigation and optional biometric protection.

## Run

```powershell
flutter run --dart-define=SACCO_ENV=local
```

Production defaults to `https://globalntereka.com/api/v1`. Override with:

```powershell
flutter run --dart-define=SACCO_API_BASE_URL=https://example.test/api/v1
```

The production proprietor username is `rsembajjwe@gmail.com`. The password is the configured platform-bootstrap password and must be changed at first login. The legacy `admin@platform.local` account remains development/demo-only and is intentionally rejected by production.

## Release signing

Configure `TEREKA_PROPRIETOR_UPLOAD_STORE_FILE`, `TEREKA_PROPRIETOR_UPLOAD_STORE_PASSWORD`, `TEREKA_PROPRIETOR_UPLOAD_KEY_ALIAS`, and `TEREKA_PROPRIETOR_UPLOAD_KEY_PASSWORD`. Local builds fall back to the Android debug key and must not be uploaded to an app store.
