# Database Performance and Connection Pooling

Tereka Online uses PostgreSQL in production and HikariCP inside the Spring Boot backend.

## Production Defaults

The production profile sets explicit pool values instead of relying on library defaults:

- `SACCO_DB_POOL_MAX_SIZE=20`
- `SACCO_DB_POOL_MIN_IDLE=5`
- `SACCO_DB_POOL_CONNECTION_TIMEOUT_MS=30000`
- `SACCO_DB_POOL_IDLE_TIMEOUT_MS=600000`
- `SACCO_DB_POOL_MAX_LIFETIME_MS=1800000`
- `SACCO_DB_POOL_VALIDATION_TIMEOUT_MS=5000`
- `SACCO_DB_POOL_LEAK_DETECTION_MS=60000`

These defaults are conservative for a small single-node deployment and can be tuned by environment.

## Small-Server Starting Point

For a Hetzner CX22-style starter deployment:

- Start with one backend instance and `SACCO_DB_POOL_MAX_SIZE=10` to `20`.
- Keep PostgreSQL `max_connections` high enough for backend pool size plus admin/backup sessions.
- Avoid setting the pool higher than the database can serve; a larger pool can make latency worse.
- Watch Hikari active/idle/pending metrics through Actuator/Prometheus.

## Scale-Up Rule

When running multiple backend instances:

```text
total_backend_pool = instance_count * SACCO_DB_POOL_MAX_SIZE
```

Keep `total_backend_pool` safely below PostgreSQL `max_connections` after reserving connections for migrations, backups, monitoring, and manual administration.

## N+1 / Query Review

Before increasing pool size, review slow screens and high-volume endpoints:

- members
- financial transactions
- loans and repayments
- notifications
- audit logs

Use PostgreSQL slow-query logs, Actuator metrics, and the load-test script to confirm whether the bottleneck is query shape, missing indexes, or connection saturation.

## Verification

`npm.cmd run check` includes `scripts/check-db-tuning.mjs`, which verifies that production pool settings and this runbook remain present.

For release evidence, run:

```powershell
npm.cmd run db:evidence
```

This records the DB tuning contract and HA recovery-target references under `reports/db-evidence/`.
