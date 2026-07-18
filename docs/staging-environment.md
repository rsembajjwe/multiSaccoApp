# Staging Environment and Secrets Guide

Use this guide when preparing a hosted staging environment for pilot SACCO testing. Keep real values in the host secret store or an untracked `.env` file only.

## Required Secrets

| Name | Required | Staging value rule |
| --- | --- | --- |
| `POSTGRES_DB` | Yes | Use a staging-only database name such as `sacco_app_staging`. |
| `POSTGRES_USER` | Yes | Use a staging-only database user. |
| `POSTGRES_PASSWORD` | Yes | Generate a unique strong password; never reuse the local example value. |
| `POSTGRES_PORT` | Yes for Compose | Usually `5432`, or a host-approved alternate port. |
| `BACKEND_PORT` | Yes for Compose | Usually `8080`, or the internal port exposed through the reverse proxy. |
| `SACCO_DEMO_LOGINS_ENABLED` | Yes | Keep `false` except during an explicit demo verification window. |
| `SACCO_AUTH_RATE_LIMIT_MAX_FAILURES` | Yes | Start with `6`; tighten after UAT if needed. |
| `SACCO_AUTH_RATE_LIMIT_WINDOW_SECONDS` | Yes | Start with `60`; tighten after UAT if needed. |
| `SACCO_SMS_PROVIDER` | Yes | Use `demo_sms` until a real SMS adapter is configured. |
| `SACCO_EMAIL_PROVIDER` | Yes | Use `demo_email` until a real email adapter is configured. |
| `SACCO_MOBILE_MONEY_PROVIDER` | Yes | Use `demo_mobile_money` until a real mobile-money adapter is configured. |
| `STAGING_UI_BASE_URL` | Yes for handoff | Use the externally reachable HTTPS staging UI URL. |
| `STAGING_API_BASE_URL` | Yes for handoff | Use the externally reachable HTTPS API base URL ending in `/api/v1`. |

The Spring production profile also accepts `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, and `SERVER_PORT`. Docker Compose derives those from the PostgreSQL variables above.

## Local Staging Dry Run

Create an untracked `.env` from the staging template:

```powershell
Copy-Item deploy\staging.env.example .env
notepad .env
```

Before starting the stack, replace `POSTGRES_PASSWORD` with a strong generated value and confirm:

- `SACCO_DEMO_LOGINS_ENABLED=false`
- `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` are not shared with development.
- Provider values are explicit: `SACCO_SMS_PROVIDER`, `SACCO_EMAIL_PROVIDER`, and `SACCO_MOBILE_MONEY_PROVIDER`.
- `STAGING_UI_BASE_URL` and `STAGING_API_BASE_URL` are real HTTPS staging URLs, not the example placeholders.
- `.env` remains ignored by git.

Run the staging preflight check before handoff:

```powershell
npm.cmd run staging:preflight
```

Start the production-profile stack:

```powershell
docker compose up --build -d postgres backend
```

Verify health:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/actuator/health
Invoke-RestMethod http://127.0.0.1:8080/api/v1/health
```

Run the release checks from the workstation before handoff:

```powershell
npm.cmd run check
npm.cmd run ready:check
```

Prepare tester data after the staging API is running:

```powershell
$env:API_BASE_URL = "https://staging-api.example.com/api/v1"
npm.cmd run uat:setup
```

Run the automated browser UAT pass:

```powershell
$env:JAVA_API_BASE = "https://staging-api.example.com"
npm.cmd run uat:browser
```

## Hosted Staging Checklist

- Store real secrets in the host secret manager or an untracked `.env`; never commit real `.env` files.
- Run the backend with `SPRING_PROFILES_ACTIVE=prod`.
- Keep demo logins disabled by default; document any temporary demo-login enablement and turn it off afterward.
- Put the backend behind HTTPS before external UAT.
- Restrict CORS/reverse-proxy origins to the approved staging UI host.
- Confirm database persistence, backup location, and restore owner before onboarding pilot data.
- Record the successful `npm.cmd run ready:check` output or CI artifact for the release candidate.
- Complete `docs/staging-handoff-checklist.md` before sharing the environment with testers.
- Run `docs/uat-scripts.md` for platform admin, SACCO staff, and member portal sign-off.
- Complete `docs/release-evidence-template.md` and track UAT defects with `docs/uat-findings-template.md`.

## Pre-Handoff Evidence

Attach or record:

- Staging API base URL.
- Backend health response timestamp.
- `npm.cmd run staging:preflight` result.
- `flyway_schema_history` version count from PostgreSQL.
- `npm.cmd run check` result.
- `npm.cmd run ready:check` result.
- `npm.cmd run backup:rehearse` result.
- `npm.cmd run load:test` request/concurrency/p95 result.
- Confirmation that `SACCO_DEMO_LOGINS_ENABLED=false`.
- Completed staging handoff checklist.
- Completed release evidence pack.
- UAT data setup output.
- Automated browser UAT output.
- UAT script result for each role.
- Findings tracker summary with no unaccepted P0/P1 findings.

## Rollback

If staging deployment fails after startup:

1. Stop new traffic at the reverse proxy.
2. Preserve logs from `backend` and `postgres`.
3. Restore the previous image/configuration.
4. If database changes were applied, restore only from an approved staging backup after confirming the target database.
