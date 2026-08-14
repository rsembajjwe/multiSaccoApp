# Tereka Online Secrets Inventory

Use this inventory with `docs/secrets-management.md` for staging and production. It lists secret names and control evidence only. Never record secret values here.

## Managed Store Evidence

Before a hosted environment is approved, record the managed secret-store reference in the release evidence pack.

| Environment | Secret store | Access owner | Rotation tracker | Last verified | Evidence link |
| --- | --- | --- | --- | --- | --- |
| Staging | `record-secret-store-name` | `record-owner-role` | `record-ticket-or-board` | `YYYY-MM-DD` | `record-release-evidence-link` |
| Production | `record-secret-store-name` | `record-owner-role` | `record-ticket-or-board` | `YYYY-MM-DD` | `record-release-evidence-link` |

## Required Production Secrets

| Secret name | Purpose | Required when | Owner | Rotation cadence | Verification evidence |
| --- | --- | --- | --- | --- | --- |
| `SPRING_DATASOURCE_PASSWORD` | Java backend database password | Production profile | Platform infrastructure owner | 90 days or staff/vendor departure | Backend starts with prod profile; `npm.cmd run ready:check` |
| `POSTGRES_PASSWORD` | PostgreSQL container/managed database password | Docker Compose or managed PostgreSQL provisioning | Platform infrastructure owner | 90 days or staff/vendor departure | PostgreSQL login and backup rehearsal evidence |
| `SACCO_PII_ENCRYPTION_KEY` | Encrypt member PII fields | All hosted environments | Platform security owner | Planned re-encryption only | Java production startup guard and data-protection evidence |
| `SACCO_DOCUMENT_STORAGE_LOCAL_ROOT` | KYC document disposal/storage location | `SACCO_DOCUMENT_STORAGE_PROVIDER=local_filesystem` | Platform operations owner | Review every deployment | Document storage readiness validator evidence |
| `SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD` | First real platform super-admin password | First production bootstrap | Platform owner | Immediately after first login and on admin departure | Bootstrap admin login then password rotation audit event |
| `SACCO_MOBILE_MONEY_CALLBACK_SECRET` | HMAC verification for provider callbacks | Signed callbacks enabled | Payments owner | 90 days or callback exposure incident | Signed callback smoke test and provider callback evidence |
| `SACCO_AFROSMS_EMAIL` | AfroSMS account login | `SACCO_SMS_PROVIDER=afrosms` | Notifications owner | 180 days or disclosure | Provider configuration screen shows configured without value |
| `SACCO_AFROSMS_PASSWORD` | AfroSMS API password | `SACCO_SMS_PROVIDER=afrosms` | Notifications owner | 180 days or disclosure | SMS provider smoke/evidence without printing value |
| `SACCO_AFROSMS_SOURCE` | Approved AfroSMS sender/source | `SACCO_SMS_PROVIDER=afrosms` | Notifications owner | On sender change | SMS provider smoke/evidence |
| `SACCO_GMAIL_SMTP_USERNAME` | Gmail/Workspace SMTP username | `SACCO_EMAIL_PROVIDER=gmail_smtp` | Notifications owner | 180 days or account change | Email provider smoke/evidence |
| `SACCO_GMAIL_SMTP_PASSWORD` | Gmail/Workspace app password | `SACCO_EMAIL_PROVIDER=gmail_smtp` | Notifications owner | 180 days or disclosure | Email provider smoke/evidence without printing value |
| `SACCO_GMAIL_FROM_ADDRESS` | Sender email address | `SACCO_EMAIL_PROVIDER=gmail_smtp` | Notifications owner | On sender change | Email provider smoke/evidence |
| `SACCO_MTN_MOMO_SUBSCRIPTION_KEY` | MTN MoMo Collections subscription key | `SACCO_MOBILE_MONEY_PROVIDER=mtn_momo` | Payments owner | Provider policy or 180 days | Provider readiness and payment request evidence |
| `SACCO_MTN_MOMO_API_USER_ID` | MTN MoMo API user id | `SACCO_MOBILE_MONEY_PROVIDER=mtn_momo` | Payments owner | Provider policy or 180 days | Provider readiness and payment request evidence |
| `SACCO_MTN_MOMO_API_KEY` | MTN MoMo API key | `SACCO_MOBILE_MONEY_PROVIDER=mtn_momo` | Payments owner | Provider policy or 180 days | Provider readiness and payment request evidence |
| `SACCO_MTN_MOMO_TARGET_ENVIRONMENT` | MTN target environment name | `SACCO_MOBILE_MONEY_PROVIDER=mtn_momo` | Payments owner | On provider environment change | Provider readiness evidence |
| `SACCO_AIRTEL_MONEY_CLIENT_ID` | Airtel Money client id | `SACCO_MOBILE_MONEY_PROVIDER=airtel_money` | Payments owner | Provider policy or 180 days | Provider readiness and payment request evidence |
| `SACCO_AIRTEL_MONEY_CLIENT_SECRET` | Airtel Money client secret | `SACCO_MOBILE_MONEY_PROVIDER=airtel_money` | Payments owner | Provider policy or 180 days | Provider readiness and payment request evidence |
| `SACCO_AIRTEL_MONEY_COUNTRY_CODE` | Airtel country code | `SACCO_MOBILE_MONEY_PROVIDER=airtel_money` | Payments owner | On market change | Provider readiness evidence |
| `SACCO_MPESA_DARAJA_CONSUMER_KEY` | Daraja consumer key | `SACCO_MOBILE_MONEY_PROVIDER=mpesa_daraja` | Payments owner | Provider policy or 180 days | Provider readiness and payment request evidence |
| `SACCO_MPESA_DARAJA_CONSUMER_SECRET` | Daraja consumer secret | `SACCO_MOBILE_MONEY_PROVIDER=mpesa_daraja` | Payments owner | Provider policy or 180 days | Provider readiness and payment request evidence |
| `SACCO_MPESA_DARAJA_BUSINESS_SHORT_CODE` | Daraja PayBill/Till code | `SACCO_MOBILE_MONEY_PROVIDER=mpesa_daraja` | Payments owner | On merchant change | Provider readiness evidence |
| `SACCO_MPESA_DARAJA_PASSKEY` | Daraja STK push passkey | `SACCO_MOBILE_MONEY_PROVIDER=mpesa_daraja` | Payments owner | Provider policy or 180 days | Provider readiness evidence |
| `SACCO_MPESA_DARAJA_CALLBACK_URL` | Public HTTPS callback URL | `SACCO_MOBILE_MONEY_PROVIDER=mpesa_daraja` | Payments owner | On domain/callback change | Provider callback evidence |
| `SACCO_REDIS_URL` | Redis URL for HA rate limiting/idempotency | Multi-instance backend or Redis store enabled | Platform infrastructure owner | 90 days or Redis credential change | `npm.cmd run ha:evidence` |

## Rotation Evidence Template

Copy this table into the release or operations tracker for every planned or emergency rotation. Do not add secret values.

| Secret name | Environment | Rotation type | Rotated by | Rotation date | Old credential revoked | Validation command | Next rotation date | Evidence link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SECRET_NAME_ONLY` | Staging/Production | Planned/Emergency | `person-or-role` | `YYYY-MM-DD` | Yes/No | `npm.cmd run ready:check` | `YYYY-MM-DD` | `ticket-or-release-link` |

## Emergency Disclosure Rule

If a credential is pasted into chat, email, ticket text, screenshots, logs, or any committed file, treat it as exposed. Revoke it, issue a new value in the managed store, redeploy, run verification evidence, and record the incident without repeating the exposed value.
