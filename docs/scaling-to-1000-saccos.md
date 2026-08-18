# Scaling Tereka Online to 1,000 SACCOs — Capacity Plan

**Date:** 2026-08-17
**Question:** Can the platform support 1,000 SACCOs?
**Verdict:** Yes by architecture, on shared multi-tenant infrastructure — but not yet *proven or tuned*
at that scale. This plan sets out the data-volume math, the bottlenecks, and the concrete steps to be
confident at 1,000 SACCOs.

## 1. Why the architecture supports it

- **Multi-tenant by design.** Every table carries `tenant_id`; there are 41 tenant-scoped indexes and
  service-layer tenant/branch isolation. Thousands of SACCOs coexist in one shared PostgreSQL schema with
  no cross-tenant access.
- **Horizontally scalable app tier.** The Spring Boot app is effectively stateless (DB-backed sessions,
  Redis-backed shared state for HA), so capacity grows by adding app instances behind a load balancer.
- **Operational guards already present:** HikariCP connection pooling (env-tunable), per-IP rate limiting,
  opt-in pagination on large lists, idempotency on money paths, correlation IDs + Prometheus metrics,
  Resilience4j timeouts/retries, and scheduled purge of expired data.

## 2. The scale in numbers

Assume 1,000 SACCOs with a spread of sizes (median ~300 members, some up to a few thousand):

| Entity | Rough volume at 1,000 SACCOs |
|---|---|
| Members | 300k – 1M rows |
| Member fund balances (V65 ledger) | ~3–5 rows per member → ~1–5M rows |
| Financial transactions | tens of millions per year (members × monthly activity × 12) |
| Journal entries / lines, notifications, audit events | millions – tens of millions per year |

This is comfortably within a single well-tuned PostgreSQL instance's capacity. The work is **operational
tuning**, not an architectural rewrite.

## 3. Bottlenecks and the fix for each

1. **Database connections.** HikariCP defaults to `SACCO_DB_POOL_MAX_SIZE=20` per app instance. With N
   instances that is N×20 connections against Postgres `max_connections`. **Put PgBouncer (transaction
   pooling) in front of Postgres** and size the Hikari pool per instance so N×pool stays within PgBouncer's
   server pool. Rule of thumb: total server-side connections ≈ 2–4 × CPU cores of the DB, not hundreds.

2. **Heavy read/aggregate paths.** Dashboards, member statements, reconciliation, and the trial-balance /
   income-statement / balance-sheet views aggregate over the transaction table. Fine at moderate size with
   the tenant indexes; at tens of millions of rows: **add a read replica and route reporting/statement
   reads to it**, and review the aggregate queries for index coverage (`tenant_id` + date/status).

3. **Large append-only tables.** `financial_transactions` (and journal lines, audit events, notifications)
   grow without bound. **Partition `financial_transactions` (by month, or by tenant hash)** and set a
   retention/archival policy for audit/notification history. No partitioning exists today.

4. **No captured load/soak at scale.** The bundled load test is a smoke test (100 requests, concurrency
   10). A `load:scale` profile has been added (20k requests, concurrency 100 — see §5). Run it against a
   database seeded with representative volume and watch p95/p99 and DB CPU/IO.

5. **HA proven in primitives, not in practice.** Redis-backed shared state exists, but there is no captured
   two-instance failover with RTO/RPO. **Run a failover rehearsal** (kill one app instance, one Redis
   failover) and record recovery times.

6. **Background jobs scale with data.** Scheduled reconciliation and the expired-data purge iterate over
   growing tables — confirm they are batched/indexed and, ideally, run on a dedicated worker profile so
   they do not compete with request traffic.

## 4. Reference target topology for 1,000 SACCOs

```
             Load balancer (TLS, Caddy)
                     |
     ┌───────────────┼───────────────┐
   app-1           app-2           app-3        (stateless; scale out)
     └───────────────┼───────────────┘
                     |                └── Redis (HA: sessions/shared state, failover-tested)
                 PgBouncer  (transaction pooling)
                     |
        ┌────────────┴────────────┐
   Postgres primary          Postgres read replica
   (writes; partitioned       (reporting/statement reads)
    financial_transactions)
```

Start with 3 app instances + primary/replica + PgBouncer + HA Redis; scale app instances horizontally on
load. This comfortably targets 1,000 SACCOs; the primary DB is the component to watch and tune first.

## 5. How to validate (run on the host / staging)

1. **Seed representative volume** into staging with the bundled seeder (PostgreSQL only), which generates
   tenants → branches → members → posted transactions → fund balances, all prefixed `scale_` for easy
   removal:

   ```bash
   # defaults: 1,000 tenants x 300 members x 20 txns = 300k members, 6M transactions
   psql "$DATABASE_URL" -f scripts/seed-scale-data.sql
   # validate small first, then scale up:
   psql "$DATABASE_URL" -v num_tenants=100 -v members_per_tenant=100 -v txns_per_member=10 -f scripts/seed-scale-data.sql
   ```

   (A commented CLEANUP block at the bottom of the script removes everything it created, in FK order.)
2. **Run the scale load profile:**

   ```powershell
   npm run load:scale
   ```

   (20,000 requests, concurrency 100, p95 ≤ 800ms, p99 ≤ 1500ms, min throughput ≥ 150 req/s — all
   overridable via `LOAD_REQUESTS`, `LOAD_CONCURRENCY`, `LOAD_P95_MS`, `LOAD_P99_MS`, `LOAD_MIN_RPS`,
   `LOAD_BASE_URL`, and `LOAD_LOGIN_*`.) Then capture evidence with `npm run load:evidence`.
3. **DB tuning pass:** `node scripts/check-db-tuning.mjs`, review slow queries
   (`pg_stat_statements`), confirm index coverage on the hot aggregate paths, and size PgBouncer/Hikari.
4. **HA failover rehearsal** with `npm run ha:evidence` plus a manual two-instance/Redis failover; record
   RTO/RPO.

## 6. Bottom line

Capable by design; not yet validated at 1,000. The path is concrete and mostly ops-side — **PgBouncer +
read replica, partition the transaction table, run the scale load/soak with realistic data, and capture HA
failover evidence.** None of it requires re-architecting the multi-tenant model.
