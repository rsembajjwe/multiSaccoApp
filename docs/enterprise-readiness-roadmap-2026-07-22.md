# Tereka Online — Enterprise Readiness Assessment & Roadmap

**Date:** 2026-07-22
**Purpose:** Assess the whole application against what "a functional enterprise application" requires (for a multi-SACCO, multi-country African deployment) and lay out concretely what must be built to get there.
**Companion reviews:** [`code-review-2026-07-22.md`](code-review-2026-07-22.md) (backend/security/financial), [`ui-review-africa-2026-07-22.md`](ui-review-africa-2026-07-22.md) (frontend for Africa). This document is the higher-level synthesis and plan.

---

## 1. Executive summary

Tereka Online is a **broad, well-organized prototype** with a genuine production spine: a Spring Boot backend with tenant-scoped schema, maker-checker approvals, immutable/reversal ledger semantics, PBKDF2 auth, MFA, audit logging, and Flyway migrations. Recent hardening (callback signing, transactional integrity, optimistic locking, money normalisation, server-side login codes) closed the most dangerous financial and security gaps.

But "broad prototype" is not the same as "functional enterprise application." The distance to enterprise-grade is concentrated in a handful of areas: **the real-world integrations that make a SACCO run (mobile money, SMS, email) are still stubs; the front-ends are a monolithic English/UGX-only web console and a placeholder mobile app; and the operational spine (horizontal scalability, observability, HA, secrets, data-protection compliance) is single-server prototype-grade.** The financial engine is also missing a core domain rule — loan interest.

The good news: almost nothing needs to be thrown away. What remains is **additive** — real adapters, a service layer, i18n/multi-currency, a real mobile app, and production-grade operations — sequenced so money-integrity and security lead, then core functionality, then scale and reach.

**Current maturity: advanced pilot / MVP. Target: enterprise SaaS.** Realistic effort is measured in months of focused work, not weeks, and benefits from a small dedicated team.

---

## 1b. Progress update — verified 2026-07-23

Since the first assessment, a large batch of commits closed or substantially advanced many items. Verified in code:

- **H-1 (seeded credentials in prod) — resolved.** `DemoSeedDataSanitizer` suspends demo accounts outside dev, a `PlatformAdminBootstrapper` provisions a real platform admin from env, and `ProductionSecretReadinessValidator` + `IntegrationProviderReadinessValidator` make production **fail fast** if secrets or real providers are missing. Each has tests.
- **M-3 (global error handling) — resolved.** `GlobalApiExceptionHandler` now covers optimistic-lock, data-integrity, validation, malformed body, and a **sanitized catch-all** (`Exception`) that logs server-side (slf4j) without leaking details.
- **M-6 / U-7 (headers/CSP) — resolved.** `SecurityHeadersFilter` now sets a strict **Content-Security-Policy** (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'self'`…), **HSTS**, and COOP.
- **U-2 (multi-currency/locale) — largely resolved.** Tenants now carry `country/locale_code/currency_code/currency_digits` (V46); a `TenantMoneyFormatter` formats per-tenant currency (threaded into receipts/notifications/registration); the frontend maps ~16 African countries to currency+locale (KES, TZS, RWF, NGN, GHS, ZAR, ETB, MZN, AOA, XOF, XAF, EGP, SDG, MAD).
- **U-3 (PWA/offline) — foundation in place.** A registered `service-worker.js` caches the app shell with an offline navigation fallback, plus a `manifest.webmanifest`, a network-status indicator, and offline write/refresh guards.
- **U-1 (i18n) — foundation in place, partial.** Real translation catalog + `t()` + persisted locale switcher (login and shell). **But UI languages are only English + French today, and RTL (`direction: "rtl"`) is defined per-country yet not actually applied to the document** — so Arabic markets get correct currency but an LTR English/French UI.

Combined with the earlier round (C-1, C-2, H-2, H-4, M-4, M-7), the **critical and most high/medium security and financial-integrity items are now addressed.**

**Further progress verified 2026-07-23 (round 2):**

- **M-1 (loan interest) — largely resolved.** `Loan` now carries `interest_rate`/`interest_amount`/`total_payable` (product-based flat rate), and a real **`LoanRepaymentSchedule`** (entity, repository, `V48` migration) with the controller generating a per-installment **amortisation schedule** splitting principal and interest. Remaining: reducing-balance option, arrears/penalty aging, and DSR enforcement at approval.
- **Real mobile-money integration — started for real.** `MtnMomoMobileMoneyProvider` is a genuine adapter using Spring `RestClient` against the **MTN MoMo Collections API** (`/collection/token/`, `/collection/v1_0/requesttopay`, status polling) with subscription key, target-environment, `MobileMoneyProviderException` handling, and a unit test. A **payment-request lifecycle** (member request → persisted entity → provider status tracking) is in place. Remaining: Airtel Money + M-Pesa/Daraja adapters, **disbursements** (payouts, not just collections), async status polling, and real **SMS/email** gateways (still stubs, but production fails fast without them).

The remaining gaps below are what still separate this from a *functional* enterprise product, now dominated by **finishing the real integrations (Airtel, M-Pesa, disbursements, SMS/email), scale/observability/HA, the real mobile app, and i18n breadth** rather than security holes or missing core domain logic.

---

## 2. What exists today (honest snapshot)

| Area | State |
|---|---|
| Backend REST API (Java/Spring Boot) | Real, broad, feature-rich (~16.5k lines). Production spine. |
| Database (PostgreSQL + Flyway V1–V45) | Real, tenant-scoped, FKs/indexes/constraints, optimistic locking. |
| Auth (tokens, MFA, reset, lockout) | Real, hand-rolled (no Spring Security). Lockout state is in-memory. |
| Financial txns / approvals / reversals | Real and now transactional; maker-checker enforced. |
| Loans | Real workflow, but **no interest/amortisation model**. |
| Mobile-money callback | Now **signed & verified**; posting logic real. |
| SMS / Email / Mobile-money **sending** | **Demo stubs** — no real gateways (Africa's Talking, MTN MoMo, Airtel, M-Pesa, Twilio, SES…). |
| Web frontend | Real but monolithic 8.2k-line `app.js`; **English + UGX only**; no offline/PWA. |
| Mobile app (Flutter) | **Static mock** — hardcoded data, empty handlers, no networking. |
| Node backend | Full parallel implementation kept as a proxy/prototype (divergence risk). |
| Tests | Large integration suite + new unit tests; strong for a prototype. |
| CI | Real (checks + Postgres/browser gate + backup rehearsal). No CD/image build/security scans. |
| Deployment | Single-VM Docker + Caddy (TLS) + Hetzner path. No HA/scale/managed DB. |
| Observability | Actuator health/info only. No metrics/tracing/structured logs/alerting. |

---

## 3. Enterprise-readiness by pillar

### 3.1 Functional completeness — **biggest gap**
An enterprise SACCO platform in Africa lives or dies on **mobile money and SMS**. Today those are simulated. To be *functional* (not just demonstrable) it must integrate real adapters behind the existing `MobileMoneyProvider`/`NotificationProvider` interfaces:
- **Mobile money**: MTN MoMo, Airtel Money, and M-Pesa (Daraja) — collections, disbursements, callbacks with retries, reconciliation, and status polling.
- **SMS**: Africa's Talking / Infobip / Twilio, with delivery receipts and per-country sender IDs.
- **Email**: SES/SendGrid with real templates.
Also missing at the domain level: **loan interest, amortisation schedules, arrears/penalty handling, and DSR enforcement** (see code review M-1). Without interest, the loan module is not a real lending system.

### 3.2 Architecture & code quality
- **Service layer**: business logic lives in 700–1,300-line controllers (code review H-3). Extract domain services so logic is reusable, testable, and transaction boundaries are explicit. This is the single most valuable structural investment.
- **One frontend monolith** (8.2k-line `app.js`, global mutable state, 123 `innerHTML` sites) needs componentization + a build pipeline (UI review U-5).
- **Two backends** (Java + Node) must converge to one source of truth (M-5).

### 3.3 Security & compliance
- Move **rate-limiting/lockout out of memory** into a shared store (Redis/DB) — today it is per-instance and resets on restart, so it neither scales nor holds under HA.
- **Remove demo/seed accounts (with committed password hashes) from the production migration chain** (H-1, still open) — highest-severity open item.
- Add **CSP + HSTS**, move tokens off `localStorage` or add strict CSP (UI review U-7); complete the **global exception handler** with a sanitized catch-all (M-3).
- Add **secrets management** (Vault/cloud secrets), key rotation, and dependency/container **CVE scanning** in CI.
- **Data-protection compliance** per country (Kenya DPA, Nigeria NDPR, South Africa POPIA, Uganda DPPA): consent, data residency, retention, subject-access/erasure. Multi-country makes this mandatory, not optional.

### 3.4 Financial integrity
Largely addressed by recent commits (transactional posting, optimistic locking, signed callbacks, money scaling). Remaining: **interest/GL rigor**, a **generic optimistic-lock/data-integrity** posture already in place, and a formal **double-entry general ledger** verification (balanced journals are derived — add invariants/tests that assert debits==credits and that posted rows are immutable at the DB layer via triggers if regulators require).

### 3.5 Reliability, scalability & HA
- Today: **single VM, single Postgres, single backend** — every component is a single point of failure.
- Enterprise target: stateless backend behind a load balancer (2+ instances), **managed/replicated PostgreSQL** with PITR, shared cache (Redis) for rate-limits/idempotency, health/readiness probes wired to the orchestrator, and defined **RPO/RTO** with tested restore (backup rehearsal already exists — good foundation).

### 3.6 Observability & operations
- Add **Micrometer + Prometheus metrics**, **OpenTelemetry tracing**, **structured JSON logging with tenant/correlation IDs**, dashboards, and alerting (error rate, callback failures, queue depth, DB health). Actuator alone is insufficient for SLA operations.
- Add a **background job/queue** for notifications, callbacks, reconciliation, and billing runs (currently synchronous inline).

### 3.7 Frontend / UX / Africa reach
From the UI review: **internationalization (French/Portuguese/Arabic/Swahili + RTL), multi-currency/locale, PWA/offline, data-cost caching, WCAG AA accessibility, mobile-first, per-tenant white-label.** These are what make the product usable continent-wide rather than in one country.

### 3.8 Mobile
The Flutter app must be **actually built** (auth, secure token storage, real API integration, offline-first sync, mobile-money in-app flows). For most African members, the phone *is* the product; a static mock is not shippable.

### 3.9 Testing & QA
Good integration coverage exists. Add: **fast unit tests** around the new service layer, **concurrency tests** (optimistic-lock/idempotency races), **contract tests** for provider adapters, **load/performance tests** (a harness exists), and **security tests** (authz/tenant-isolation regression is partly present — extend it).

---

## 4. Roadmap (sequenced; integrity & security first, then function, then scale, then reach)

### Phase 0 — Close remaining criticals/highs (stabilise)
1. **H-1**: remove demo seed accounts from the prod migration chain (profile-gated seeding). *(quick, high value)*
2. Move **rate-limiting/idempotency to a shared store** (Redis) so security holds under scale.
3. Complete **M-3** (sanitized catch-all exception handler) and add **CSP + HSTS**.
4. Decide the **Node-vs-Java** convergence and freeze one as source of truth.

### Phase 1 — Enterprise foundations (make it real)
5. **Real integrations**: mobile money (MTN/Airtel/M-Pesa), SMS, email — behind existing provider interfaces, with retries/reconciliation.
6. **Loan interest & amortisation** (M-1) + DSR enforcement.
7. **Service-layer refactor** (H-3), starting with finance/loans/mobile-money — enables everything else to be tested and evolved.
8. **Observability**: metrics, tracing, structured logs, alerting; move notifications/callbacks to a **background queue**.

### Phase 2 — Scale, resilience & operations
9. Stateless backend + load balancer + **managed/replicated PostgreSQL** with PITR; readiness/liveness probes; defined RPO/RTO.
10. **Secrets management**, key rotation, dependency/image **CVE scanning**, and **CD** (image build/publish + automated deploy) added to CI.
11. **Data-protection compliance** framework (consent, residency, retention, erasure) per target country.

### Phase 3 — Continental reach (frontend & mobile)
12. **i18n + RTL**, **multi-currency/locale**, **PWA/offline**, **WCAG AA**, mobile-first, per-tenant white-label (UI review U-1..U-9).
13. **Real Flutter mobile app**: auth, secure storage, offline-first, in-app mobile-money.
14. Front-end **build pipeline** + componentization (retire the monolith incrementally).

---

## 5. Definition of "functional enterprise application"

The platform can claim enterprise-grade when, at minimum:
- A SACCO in any target country can transact **real money** (mobile money in/out) and notify members by **real SMS/email**.
- Members use a **real mobile app** in **their language and currency**, including offline.
- The system runs **multi-instance with no single point of failure**, a replicated database, tested backup/restore, and defined RPO/RTO.
- **Security & compliance**: no seeded credentials in prod, shared-state rate limiting, CSP/HSTS, secrets management, CVE scanning, and per-country data-protection controls.
- **Operations**: metrics, tracing, structured logs, alerting, and CD with automated, auditable releases.
- **Financial correctness**: interest-bearing loans, balanced double-entry GL with immutability, and concurrency-safe posting — all covered by automated tests.

Everything above is reachable from the current codebase without a rewrite; it is a matter of sequencing real integrations, a service layer, production operations, and continental localisation on top of the existing spine.
