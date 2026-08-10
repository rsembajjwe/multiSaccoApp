# Tereka Online — Enterprise Readiness Review

**Date:** 28 July 2026
**Reviewer:** Senior Architect / Security / QA (review mode)
**Scope:** Full repository — backend (`backend-java`, Spring Boot), frontend (`app.js` SPA), database (Flyway/H2/PostgreSQL), integrations, CI/CD, ops.

---

## 1. Executive summary

Tereka Online has grown into a genuinely capable multi-SACCO platform. The **domain and security foundations are strong**: multi-tenant isolation, RBAC, maker-checker controls, a double-entry ledger, hardened authentication, real mobile-money adapters, and a CI pipeline with a production-readiness gate. Recent work closed real integrity gaps — mobile-money **deposits and loan repayments now require treasurer approval before crediting**, and callbacks fail closed in production.

The platform is **not yet enterprise-grade in three areas that matter most**: (1) the frontend is a single 10,500-line JavaScript file with no build or tests, (2) test coverage is dominated by one 6,400-line integration file with thin unit-level and zero frontend coverage, and (3) operational maturity — metrics, tracing, resilience, rate limiting, and horizontal-scale readiness — is largely absent. None of these block a controlled pilot, but all three block "enterprise, multi-SACCO, at continental scale."

Overall readiness: **~70% for a supervised pilot; ~45% for unattended enterprise operation.**

---

## 2. What is solid today

**Security & identity (mature).** DB-backed opaque session tokens with hashing, expiry, and revocation; PBKDF2 (210k iterations); login lockout; MFA challenges; password reset; full audit trail; platform security policy; demo-seed sanitizer; bootstrap-admin provisioning. `ProductionSecretReadinessValidator` fails startup on weak/placeholder DB passwords and callback secrets. `SecurityHeadersFilter` is present.

**Financial integrity (strong).** Double-entry chart of accounts, journal and ledger lines; `BigDecimal` money handling; maker-checker on financial transactions, now extended to **mobile-money deposits and loan repayments**; immutable posted transactions with reversal semantics; per-reference idempotency on callbacks; reconciliation and a callback operations queue.

**Integrations (real, not mocked).** MTN MoMo, Airtel Money, and M-Pesa Daraja adapters; HMAC-signed callbacks that fail closed in prod; SMS (AfroSMS) and email (Gmail SMTP) providers with delivery logging, retry, and provider-status checks.

**Delivery pipeline.** Flyway (53 versioned migrations, no `ddl-auto` in prod), H2-for-dev / PostgreSQL-for-prod parity, GitHub Actions CI running `npm run check` plus a PostgreSQL + browser release gate, a backup-restore rehearsal, and a production-readiness script. Docker and dev/prod compose files exist. Config is fully environment-driven and disables demo logins in production.

---

## 3. Gaps by severity

### CRITICAL — architecture & test structure

**C-1. Monolithic frontend.** `app.js` is a single ~542 KB, 10,565-line vanilla-JS file rendering via string templates, with no module system, no build/bundle step, and no component tests. Every change risks wide regressions (the recurring service-worker cache-busting is a symptom). This is the single biggest liability for maintainability and team scaling.
*Remediation:* introduce a build toolchain (Vite) and incrementally extract feature modules (auth, member portal, approvals, chat, accounting) behind a thin router; add a linter and formatter; adopt a component framework or at minimum ES modules. Treat as a multi-sprint, incremental migration — not a rewrite.

**C-2. Test pyramid is inverted.** 18 test files for 225 main classes, dominated by a single 6,428-line `SaccoBackendApplicationTests`. Provider, security, and chat paths are covered, but domain/service logic lacks focused unit tests and the frontend has **none**. A giant end-to-end suite is slow, brittle, and hard to diagnose.
*Remediation:* add service-layer unit tests for financial posting, approval/maker-checker, loan appraisal, subscription billing; split the mega-suite by domain; add frontend tests once modularized; publish a coverage metric and set a floor in CI.

### HIGH — operations, resilience, scale

**H-1. Observability.** Actuator exposes only `health`/`info`. No Micrometer/Prometheus metrics, no structured (JSON) logging, no request correlation IDs, no distributed tracing, no alerting. You cannot run an SLO or diagnose production incidents.
*Remediation:* add Micrometer + Prometheus registry, expose `metrics`/`prometheus`, ship structured logging with a correlation-ID filter, wire a dashboard (Grafana) and basic alerts (error rate, latency, callback failures, queue depth).

**H-2. External-call resilience.** No timeouts, retries, or circuit breakers around MTN/Airtel/M-Pesa/SMS/SMTP calls (no Resilience4j). A slow provider can exhaust request threads and cascade.
*Remediation:* add Resilience4j circuit breakers + bounded timeouts + retry-with-backoff on every outbound integration; make callbacks/queues the source of truth so a provider outage degrades gracefully.

**H-3. No API rate limiting / throttling.** Only login lockout exists. Public callback and member endpoints are exposed to abuse and accidental floods.
*Remediation:* add per-IP and per-principal rate limiting (Bucket4j or gateway-level); stricter limits on auth, callbacks, and member-initiated payment requests.

**H-4. Horizontal scale & HA unproven.** Single-node assumptions, no distributed cache/session store (Redis), no load or soak testing, no documented RTO/RPO or failover.
*Remediation:* verify statelessness (sessions are DB-backed — good), add Redis for cache/rate-limit state, run load tests to find DB/index hotspots, define and rehearse DR targets.

**H-5. No API documentation.** No OpenAPI/springdoc. Integrators and the mobile app work blind.
*Remediation:* add springdoc-openapi, publish a versioned spec, and generate a client for the mobile app.

### MEDIUM

**M-1. Data protection & regulatory compliance.** No evidenced encryption at rest, PII data-retention/consent handling, or explicit alignment with Uganda's Data Protection & Privacy Act (2019) and BoU/UMRA SACCO supervision requirements.
*Remediation:* classify PII, enable column/disk encryption for sensitive fields, define retention/erasure, and produce a regulator-facing compliance note.

**M-2. Secrets management.** Secrets are environment-driven (good) but there is no managed store or rotation (Vault/cloud KMS).
*Remediation:* move production secrets to a managed secret store with rotation and audit.

**M-3. Idempotency breadth.** Callbacks are idempotent per reference, but member-initiated write endpoints lack idempotency keys.
*Remediation:* accept an `Idempotency-Key` on mutating member APIs and dedupe.

**M-4. Performance/query review.** JPA N+1 and missing composite indexes are likely under load and have not been profiled.
*Remediation:* profile hot endpoints, add indexes, and add query-count assertions to critical tests.

**M-5. CORS posture.** No explicit CORS configuration found; safe only while the SPA is served same-origin. An enterprise split of API and web host will need a deliberate policy.

### LOW — hygiene

**L-1. Dual stacks.** The legacy Node prototype (`backend/`, `server.mjs`) still ships alongside the Java backend, adding confusion. Decide the bridge's fate and document or remove it.

**L-2. Repo noise.** `tmp-*.log`, `logs/`, `.idea/`, and a large uncommitted working set are present. Tighten `.gitignore` and commit the current session's work in focused commits.

---

## 4. Recommended sequence

1. **Stabilise (now):** commit the current approval-gating work; add service-layer unit tests for the money paths you just changed; publish a coverage number.
2. **Operate (next):** observability (H-1), resilience (H-2), rate limiting (H-3) — the fastest path to safe unattended running.
3. **Document & scale:** OpenAPI (H-5), load testing and Redis (H-4), then the frontend modularization (C-1) as a sustained track.
4. **Comply & harden:** data-protection and secrets management (M-1, M-2) ahead of any regulator engagement.

---

## 5. Definition of "enterprise-ready" for Tereka

A SACCO can be onboarded and run unattended when: financial postings are provably correct and audited (**largely met**); the service emits metrics/traces/alerts and survives provider outages (**not met**); it is documented, rate-limited, and load-tested for many tenants (**not met**); the frontend and tests can be safely evolved by a team (**not met**); and data handling satisfies Ugandan regulation (**partially met**). The domain is there; the operational and engineering-scale envelope is the remaining work.
