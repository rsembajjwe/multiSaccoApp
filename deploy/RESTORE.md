# Database backup & restore — Tereka Online

Tereka Online stores members' savings, shares, welfare and loan records, so the database is the
system of record. Production runs an automated backup sidecar (`backup` service in
`docker-compose.prod.yml`, script `deploy/backup.sh`) that takes a compressed logical dump on a
fixed interval.

## What gets produced

- **Location:** `./backups/` on the host (bind-mounted into the sidecar at `/backups`).
- **Filename:** `sacco-<db>-<YYYYMMDD-HHMMSS>.sql.gz` (UTC timestamp).
- **Interval:** daily by default (`BACKUP_INTERVAL_SECONDS`, default `86400`).
- **Retention:** dumps older than `BACKUP_RETENTION_DAYS` (default `14`) are pruned automatically.
- **Recovery point objective (RPO):** up to one interval of data loss (≤24h by default). Shorten it
  by lowering `BACKUP_INTERVAL_SECONDS`, or move to continuous archiving (see "Beyond daily dumps").

## Configuration

Set these in the environment used by `docker compose -f docker-compose.yml -f docker-compose.prod.yml`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BACKUP_INTERVAL_SECONDS` | `86400` | Seconds between dumps |
| `BACKUP_RETENTION_DAYS` | `14` | Delete dumps older than this |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | — | Reused for the dump connection |

## Off-site copies (do this)

The local `./backups/` volume protects against DB corruption and bad migrations, **not** against
loss of the host. Ship dumps off the box on a schedule — e.g. a host cron:

```sh
# Sync new dumps to object storage every hour (rclone/aws/rsync as available).
0 * * * * rclone copy /srv/app/backups remote:tereka-backups --min-age 1m
```

## Restore

1. **Stop the backend** so nothing writes during the restore:
   ```sh
   docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend
   ```
2. **Pick the dump** to restore (newest good one):
   ```sh
   ls -1t backups/sacco-*.sql.gz | head
   ```
3. **Recreate the database** (drops all current data — be sure):
   ```sh
   docker compose exec postgres psql -U "$POSTGRES_USER" -d postgres \
     -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" -c "CREATE DATABASE $POSTGRES_DB;"
   ```
4. **Load the dump:**
   ```sh
   gunzip -c backups/sacco-<db>-<stamp>.sql.gz | \
     docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
   ```
5. **Start the backend** and confirm health:
   ```sh
   docker compose -f docker-compose.yml -f docker-compose.prod.yml start backend
   curl -fsS https://$DOMAIN/actuator/health/readiness
   ```
   Flyway will find the schema already at the dumped version and apply nothing new.

## Verify the backups (do this regularly)

A backup you have never restored is not a backup. At least monthly, restore the latest dump into a
throwaway database and spot-check row counts:

```sh
gunzip -c backups/<latest>.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres \
  -c "CREATE DATABASE restore_test;" && \
gunzip -c backups/<latest>.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d restore_test
docker compose exec postgres psql -U "$POSTGRES_USER" -d restore_test -c "SELECT count(*) FROM members;"
docker compose exec postgres psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE restore_test;"
```

## Beyond daily dumps (lower RPO)

For a near-zero RPO, move to continuous WAL archiving / point-in-time recovery — either a managed
Postgres with PITR, or `pgBackRest` / WAL-G shipping WAL to object storage. The logical dumps here
remain a good, portable belt-and-braces layer alongside PITR.
