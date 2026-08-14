# Tereka Online Disaster Recovery Runbook

Use this runbook for staging and production database recovery. It defines the minimum evidence needed before a SACCO environment is handed over for pilot or live operation.

## Recovery Targets

| Environment | Backup model | RPO target | RTO target | Minimum evidence |
| --- | --- | --- | --- | --- |
| Local rehearsal | Disposable PostgreSQL dump/restore | Marker row created during rehearsal | 30 minutes | `npm.cmd run backup:evidence` report |
| Staging | Daily encrypted dump plus release-candidate backup | 24 hours | 4 hours | Successful restore rehearsal before UAT handoff |
| Production small-start | Daily encrypted off-server dump plus pre-release backup | 24 hours | 4 hours | Monthly restore rehearsal and every release candidate |
| Production enterprise | Managed PostgreSQL PITR plus off-server logical dumps | 15 minutes or better | 60 minutes or better | PITR restore drill, failover drill, and backup evidence pack |

## Backup Controls

- Run `npm.cmd run backup:evidence` before every release candidate where Docker/PostgreSQL is available.
- Store production backups outside the application server, encrypted at rest, and access-controlled to the platform infrastructure owner.
- Keep at least 30 daily backups for small-start production unless the hosting budget or regulator requires a longer retention period.
- Keep release-candidate backups until the next successful production deployment plus one retention cycle.
- Never store backups in Git, public cloud buckets, chat attachments, or unencrypted workstation folders.

## Restore Rehearsal Evidence

Every restore rehearsal must record:

| Evidence field | Required value |
| --- | --- |
| Environment | Local, staging, or production rehearsal |
| Restore owner | Person or role accountable for the restore |
| Backup source | File path, object-store key, or managed database restore point; never include credentials |
| Backup created at | Timestamp |
| Restore started at | Timestamp |
| Restore verified at | Timestamp |
| Data cutoff | Timestamp or backup snapshot identifier |
| RPO measured | Difference between data cutoff and incident/rehearsal trigger time |
| RTO measured | Difference between restore start and verified healthy time |
| Validation command | Usually `npm.cmd run backup:evidence`, `npm.cmd run ready:check`, or a staging smoke suite |
| Result | PASS or FAIL |
| Follow-up action | Any issue, owner, and due date |

## Local Rehearsal Procedure

1. Start Docker Desktop.
2. From the project root, run:

   ```powershell
   npm.cmd run backup:evidence
   ```

3. Confirm the report under `reports/backup-evidence/` shows `PASS`.
4. Confirm the disposable Docker Compose project and PostgreSQL volume were removed.
5. Record the generated report path in the release evidence pack.

## Hosted Restore Procedure

1. Stop new traffic or put the application in maintenance mode.
2. Confirm the target environment and database name with a second operator.
3. Identify the approved backup or managed database restore point.
4. Restore into a new database or disposable clone first.
5. Run Flyway validation and health checks.
6. Run smoke checks for login, SACCO accounts, members, transactions, loans, reports, and provider configuration.
7. Switch traffic only after validation passes.
8. Record RPO/RTO evidence and any exceptions.

## Emergency Recovery

Use emergency recovery for database loss, corruption, ransomware, accidental deletion, or failed migration rollback.

1. Freeze writes if the database is still reachable.
2. Preserve backend, database, reverse-proxy, and provider callback logs.
3. Notify the platform owner and affected SACCO administrators.
4. Restore from the latest verified backup or PITR point.
5. Reconcile mobile-money, bank, and cash transactions posted during the outage window.
6. Record the incident, measured RPO/RTO, data exceptions, customer communications, and corrective action.

## Release Gate

Do not approve staging UAT or production release when:

- No restore owner is named.
- Backup evidence failed or is older than the release candidate.
- The latest restore rehearsal did not verify restored data.
- RPO/RTO evidence is missing for the target environment.
- Backups are stored only on the same server as the application database.
