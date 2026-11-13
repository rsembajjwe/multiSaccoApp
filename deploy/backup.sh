#!/bin/sh
# Automated PostgreSQL backup sidecar for Tereka Online.
#
# Runs inside a postgres:16-alpine container next to the database service. On a fixed interval it
# takes a compressed logical dump (pg_dump | gzip) into /backups, prunes dumps older than the
# retention window, and logs success/failure. Restore steps live in deploy/RESTORE.md.
#
# Everything is driven by environment variables (see docker-compose.prod.yml):
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE   - connection (standard libpq vars)
#   BACKUP_INTERVAL_SECONDS                  - seconds between dumps (default 86400 = daily)
#   BACKUP_RETENTION_DAYS                    - delete dumps older than this (default 14)
#   BACKUP_DIR                               - output directory (default /backups)
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

log() {
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) [pg-backup] $*"
}

log "started (interval=${BACKUP_INTERVAL_SECONDS}s retention=${BACKUP_RETENTION_DAYS}d dir=${BACKUP_DIR} db=${PGDATABASE:-?} host=${PGHOST:-?})"

while true; do
    stamp="$(date -u +%Y%m%d-%H%M%S)"
    target="${BACKUP_DIR}/sacco-${PGDATABASE:-db}-${stamp}.sql.gz"
    tmp="${target}.partial"

    # --no-owner/--no-privileges keep the dump portable across environments; a clean, consistent
    # logical snapshot is sufficient for this workload's recovery-point objective.
    if pg_dump --no-owner --no-privileges | gzip -9 > "$tmp"; then
        mv "$tmp" "$target"
        size="$(wc -c < "$target" 2>/dev/null || echo '?')"
        log "backup ok: ${target} (${size} bytes)"
    else
        rm -f "$tmp"
        log "backup FAILED for ${PGDATABASE:-db} at ${stamp}" >&2
    fi

    # Retention: remove dumps older than the window. Never fail the loop on a prune error.
    find "$BACKUP_DIR" -name "sacco-*.sql.gz" -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true

    sleep "$BACKUP_INTERVAL_SECONDS"
done
