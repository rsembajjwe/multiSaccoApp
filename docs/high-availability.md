# Tereka Online High Availability Runbook

This runbook defines the difference between a small single-node deployment and an enterprise
multi-instance deployment.

## Current deployment modes

### Small production mode

Use this for a low-budget pilot or one SACCO cluster on a single server:

- One Java backend instance.
- One PostgreSQL database with automated backups.
- Caddy or another reverse proxy terminates HTTPS.
- DB-backed staff and member sessions.
- In-memory request rate limiting is acceptable because there is only one backend instance.

Required scale settings:

```properties
SACCO_EXPECTED_BACKEND_INSTANCES=1
SACCO_RATE_LIMIT_STORE=memory
SACCO_IDEMPOTENCY_STORE=memory
```

### Enterprise multi-instance mode

Use this when Tereka Online runs more than one backend instance:

- At least two stateless Java backend instances behind a load balancer.
- PostgreSQL with automated backups, point-in-time recovery, and a tested restore process.
- Redis or equivalent shared state for rate limits, lockout counters, idempotency hot keys, and cache
  entries that must be consistent across instances.
- Health and readiness checks wired to the load balancer or orchestrator.
- Metrics and alerts for HTTP latency, error rate, database pool usage, provider failures, and queue
  backlogs.

Required scale settings:

```properties
SACCO_EXPECTED_BACKEND_INSTANCES=2
SACCO_RATE_LIMIT_STORE=redis
SACCO_IDEMPOTENCY_STORE=redis
SACCO_REDIS_URL=redis://redis.internal:6379
```

`ScaleReadinessValidator` fails production startup if more than one backend instance is declared
without Redis scale configuration for rate limits, idempotency/shared hot keys, and Redis
connectivity. This prevents an accidental unsafe HA deployment.

## Recovery targets

Pilot target:

- RPO: 24 hours, backed by daily database backup.
- RTO: 4 hours, backed by documented restore rehearsal.

Enterprise target:

- RPO: 15 minutes or better, backed by PostgreSQL point-in-time recovery.
- RTO: 60 minutes or better, backed by rehearsed failover and restore steps.

## Failover rehearsal

Run a failover rehearsal before production launch and every quarter after launch:

1. Confirm the latest backup and WAL/PITR position.
2. Restore into an isolated PostgreSQL instance.
3. Start the backend against the restored database.
4. Run login, SACCO registration, member lookup, transactions, loans, reports, notifications, and
   payment callback smoke tests.
5. Run `npm.cmd run ha:evidence` to confirm Redis-backed rate-limit and idempotency state is shared
   and to write a timestamped evidence report.
6. Record restore start time, healthy time, data cutoff time, RPO, RTO, and operator.

## Load and soak test evidence

Before moving from pilot to enterprise mode:

- Run `npm.cmd run load:test` against a staging system.
- Run `npm.cmd run ha:evidence` before the load test so Redis shared-state wiring is proven and
  recorded.
- Test with SACCO-sized data sets, including member search, transaction lists, loan queues, reports,
  mobile-money callbacks, and chat threads.
- Capture p95/p99 latency, HTTP errors, DB pool pressure, CPU, memory, and provider timeout rates.
- Tune `SACCO_DB_POOL_MAX_SIZE`, PostgreSQL `max_connections`, indexes, and Redis sizing from the
  observed data.

## Known remaining work

The application now has Redis-backed rate-limit and idempotency adapters plus production guards for
shared scale configuration, but the hosted enterprise deployment still needs a live Redis service,
load balancer wiring, and a rehearsed multi-instance load/failover report before it should be called
fully HA.
