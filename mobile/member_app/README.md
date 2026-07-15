# SACCO Member Mobile App Foundation

This folder is the Android-ready Flutter foundation for the member self-service app. It is intentionally lightweight for now so the backend contract can stabilize before adding native build tooling.

## Target flows

- Secure member login through `/api/v1/member-auth/login`.
- Server-confirmed mobile dashboard through `/api/v1/member-auth/mobile-dashboard`.
- Mobile-money payment confirmation through `/api/v1/integrations/mobile-money/callback`.
- Mobile loan application through `/api/v1/member-auth/mobile-loans`.
- Offline complaint draft capture and later sync through `/api/v1/member-auth/mobile-complaints`.
- Guarantor request decisions through `/api/v1/member-auth/guarantor-requests/:id/status`.

## Local API

For Android emulator builds, point the app to:

```text
http://10.0.2.2:5173/api/v1
```

For a physical phone on the same network, use the development machine LAN IP instead.

## Seed account

```text
GVS-0001 / Member@12345
```

## Next native step

Install Flutter, run `flutter create . --platforms=android`, then keep the API contract files in `lib/` and wire them into the generated Android project.
