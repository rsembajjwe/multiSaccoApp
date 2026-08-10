# Tereka Online Secrets Management

Use this runbook for staging and production. Never paste real secrets into Git, release notes, support tickets, screenshots, or AI chats.

## Storage Model

- Store production secrets in a managed host secret store, Vault, cloud KMS/Secrets Manager, or the deployment platform's encrypted environment variable store.
- Keep local `.env` files untracked. The committed `deploy/*.env.example` files must contain only placeholders.
- Load secrets into the Java backend through environment variables. Do not bake secrets into Docker images, compose files, frontend files, or Java properties.
- Keep `SACCO_DEMO_LOGINS_ENABLED=false` outside explicit development/demo windows.

## Required Secret Groups

- Database: `SPRING_DATASOURCE_PASSWORD`, `POSTGRES_PASSWORD`.
- PII encryption: `SACCO_PII_ENCRYPTION_KEY`.
- Document storage: `SACCO_DOCUMENT_STORAGE_PROVIDER`, `SACCO_DOCUMENT_STORAGE_LOCAL_ROOT`.
- Platform bootstrap: `SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD`.
- Callback signing: `SACCO_MOBILE_MONEY_CALLBACK_SECRET`.
- SMS: `SACCO_AFROSMS_EMAIL`, `SACCO_AFROSMS_PASSWORD`, `SACCO_AFROSMS_SOURCE`.
- Email: `SACCO_GMAIL_SMTP_USERNAME`, `SACCO_GMAIL_SMTP_PASSWORD`, `SACCO_GMAIL_FROM_ADDRESS`.
- Mobile money: MTN MoMo, Airtel Money, or M-Pesa provider keys depending on the enabled provider.

## Rotation Schedule

- Database password: rotate every 90 days or immediately after staff/vendor departure.
- PII encryption key: rotate only with a planned re-encryption runbook, because existing encrypted
  National ID values must remain decryptable during the rotation window.
- Document storage root: review during every deployment and backup change; changing it requires a
  planned migration of existing KYC files.
- Platform bootstrap/admin password: rotate after first login, then whenever an administrator leaves.
- Mobile-money callback secret: rotate every 90 days and after any callback endpoint exposure incident.
- Provider API keys: rotate according to provider policy, or at least every 180 days.
- Gmail app password and AfroSMS password: rotate every 180 days or immediately after credential disclosure.

## Rotation Procedure

1. Create the replacement secret in the managed secret store.
2. Update the deployment environment variable reference without committing the value.
3. For callback/provider credentials, coordinate the matching value in the provider portal before switching traffic.
4. Restart or redeploy the backend.
5. Run `npm.cmd run ready:check` where Docker is available, or at minimum `npm.cmd run security:check` against the running API.
6. Confirm login, notifications, and payment callbacks still work.
7. Revoke the old secret after the new value is confirmed.
8. Record evidence in the release or operations tracker: secret name, rotation date, owner, validation command, and next rotation date. Do not record the secret value.

## Emergency Rotation

Use emergency rotation if a secret appears in a chat, email, screenshot, ticket, commit, log, or shared document.

1. Disable or revoke the exposed credential in the provider/admin console.
2. Issue a new credential and update the secret store.
3. Redeploy the backend.
4. Review audit logs for suspicious login, payment, SMS, or email activity.
5. Document the incident and rotate any dependent credentials.

## Verification

- `ProductionSecretReadinessValidator` blocks weak database passwords, PII encryption keys, and callback secrets when demo logins are disabled.
- `IntegrationProviderReadinessValidator` blocks production startup when real provider settings are missing.
- `DocumentStorageReadinessValidator` blocks production startup unless KYC document storage disposal is configured.
- `npm.cmd run check` includes `scripts/check-secrets-management.mjs`, which ensures deployment example files use placeholders and this runbook remains present.
- `npm.cmd run secrets:evidence` records the secrets management contract as timestamped release evidence under `reports/secrets-evidence/`.
