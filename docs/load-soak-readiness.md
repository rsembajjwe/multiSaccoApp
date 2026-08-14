# Load And Soak Readiness Checklist

Use this checklist before moving from local verification to hosted staging load testing, and again
before production launch.

## Test Environment

Record:

- Environment URL and API base URL.
- Git commit SHA or release candidate tag.
- Database engine, Flyway version count, and data snapshot date.
- Backend instance count.
- Redis/shared-state mode.
- PostgreSQL pool size and `max_connections`.
- Load tester machine location and network.
- Whether provider calls are live, sandboxed, or stubbed.

## Required Commands

Run or attach equivalent hosted evidence:

- `npm.cmd run release:evidence`
- `npm.cmd run db:evidence`
- `npm.cmd run ha:evidence`
- `npm.cmd run load:evidence`
- `npm.cmd run postgres:check` or hosted PostgreSQL/Flyway migration artifact

## Load Scenarios

The load evidence must cover:

- Health checks.
- Operations status.
- SACCO account listing.
- Subscriptions.
- Platform users.
- Audit events.
- Regulatory reports.
- Provider operational evidence.
- Member search and paginated member lists.
- Transaction lists and payment queues.
- Loan queues and repayment review.

## Targets

Starter staging target:

- 100 total requests minimum.
- 10 concurrent users minimum.
- 0 request failures.
- p95 latency less than or equal to 1,500 ms.
- p99 latency less than or equal to 2,000 ms.
- Throughput at least 1 request/second.

Enterprise rehearsal target before multi-SACCO production:

- 2,000 total requests minimum.
- 50 concurrent users minimum.
- 0 critical-path failures.
- p95 latency less than or equal to 1,500 ms.
- p99 latency less than or equal to 3,000 ms.
- No sustained database pool pressure.
- No unreconciled provider callback backlog caused by the test.

Soak target:

- Run for at least 2 hours on hosted staging.
- Capture error rate, p95/p99 latency, CPU, memory, database pool usage, Redis errors, disk space,
  callback exceptions, and notification delivery exceptions.
- Confirm the system remains healthy after the run.

## Evidence To Record

| Field | Value |
| --- | --- |
| Environment |  |
| Commit SHA |  |
| Request count |  |
| Concurrency |  |
| Duration |  |
| p95 latency |  |
| p99 latency |  |
| Failure count |  |
| Database pool pending count |  |
| CPU/memory observation |  |
| Redis/shared-state observation |  |
| Provider exception count |  |
| Operator |  |
| Decision | Pass / Blocked / Accepted with follow-up |

## Blockers

Do not approve production readiness when:

- Any critical-path request fails without an accepted root cause.
- p95/p99 latency exceeds the agreed target.
- Database pool pending connections remain above zero.
- Redis shared-state evidence is missing for multi-instance mode.
- Provider callback or delivery exceptions grow during the test and are not reconciled.
- The post-test health check fails.
