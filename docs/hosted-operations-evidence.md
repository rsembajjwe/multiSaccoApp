# Hosted Operations Evidence Checklist

Use this checklist after deploying staging or production. Local checks prove the code and runbooks;
this checklist proves the hosted environment can alert, preserve logs, back up data off-server, and
restore within the agreed targets.

## Required Hosted Evidence

| Area | Evidence to attach | Release rule |
| --- | --- | --- |
| Alert routing | Screenshot or export showing API, database, callback, delivery, and backup alerts routed to an email, SMS, or incident channel | Alerts must reach a named owner |
| Monitoring dashboard | Dashboard URL or screenshot for API health, 5xx rate, latency, database pool pressure, JVM heap, and provider exceptions | Dashboard must be reachable by operators |
| Centralized logs | Log sink reference showing backend, Caddy/reverse proxy, PostgreSQL, and provider callback logs with correlation IDs | Logs must not expose secrets or request bodies |
| Off-server backups | Object-store, managed database, or backup-service evidence showing encrypted backups outside the app server | Backups cannot live only on the application VM |
| Backup schedule | Cron, managed backup policy, or hosting-provider schedule with retention and owner | Schedule and retention must be documented |
| Restore drill | Staging restore rehearsal or managed PITR restore drill with RPO/RTO measured | Restore proof must be newer than the release candidate |
| Incident contact | On-call or owner roster with escalation path | A human owner must be reachable |

## Alert Coverage

The hosted alert set must cover:

- API down or `/actuator/health` not healthy.
- API 5xx error rate above threshold.
- API p95 latency above threshold.
- PostgreSQL unreachable or database pool pressure.
- JVM heap pressure.
- Mobile-money callback exceptions.
- Notification delivery exceptions for AfroSMS or Gmail SMTP.
- Pending postings older than the agreed business window.
- Backup job failure or missed backup window.

## Backup And Restore Requirements

Before handoff:

- Confirm backups are encrypted at rest.
- Confirm backup storage is separate from the application server.
- Confirm restore owner and second operator.
- Confirm production small-start target: 24 hour RPO and 4 hour RTO.
- Confirm enterprise target: 15 minute or better RPO and 60 minute or better RTO when managed PITR is purchased.
- Run `npm.cmd run backup:evidence` locally or against staging where Docker/PostgreSQL is available.
- Record hosted restore drill date, data cutoff, restore start, restore verified time, RPO measured, and RTO measured.

## Release Blockers

Do not approve hosted staging handoff or production launch when:

- No alert destination is configured.
- No centralized log destination is configured.
- Backup evidence is missing, failed, or older than the release candidate.
- Backups are stored only on the same server as the application database.
- No restore owner is named.
- RPO/RTO evidence is missing for the target environment.
- Incident contacts or escalation path are unknown.
