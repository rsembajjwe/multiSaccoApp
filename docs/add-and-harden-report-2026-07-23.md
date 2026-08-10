# Tereka Online — What to Add & Harden (Comprehensive Report)

**Date:** 2026-07-23
**Audience:** Engineering, security, and delivery leads.
**Purpose:** A single, actionable catalogue of everything that still needs to be **added** (net-new capability) or **hardened** (strengthen what exists) to reach a functional, secure, enterprise-grade, pan-African platform.
**Companion docs:** `code-review-2026-07-22.md`, `ui-review-africa-2026-07-22.md`, `enterprise-readiness-roadmap-2026-07-22.md`.

---

## 0. Where the system stands

The critical and most high/medium findings from earlier reviews are **already fixed**: signed mobile-money callbacks, transactional posting, optimistic locking, money normalisation, server-side login codes, a strict CSP/HSTS, a full global exception handler, removal of seeded credentials from production, secret/provider fail-fast, per-tenant multi-currency, a PWA/offline shell, an i18n framework (English + French), loan interest + amortisation schedules, and a **real MTN MoMo collections adapter**.

What remains is not security holes or missing core logic — it is **finishing the real-world capabilities** (more payment rails, disbursements, SMS/email, mobile app), and **the operational spine** (scale, HA, observability, compliance) that separates a working product from an enterprise service. This report lists those items concretely.

Legend — Priority: **P1** (blocks enterprise launch) · **P2** (needed for scale/compliance) · **P3** (quality/reach). Type: **ADD** / **HARDEN**.

---

## 1. Integrations & payments

**P1 · ADD — Additional mobile-money rails.** MTN MoMo (collections) is real; add **Airtel Money** and **M-Pesa (Safaricom Daraja)** adapters behind the existing `MobileMoneyProvider` interface, selectable per tenant/country. *Done when:* a tenant in Kenya can collect via M-Pesa and a tenant in Uganda via MTN/Airtel, all through one interface, with contract tests against each sandbox.

**P1 · ADD — Disbursements (payouts), not just collections.** Loan disbursement and savings withdrawal must actually move money out via provider transfer/disbursement APIs (MTN Disbursements, M-Pesa B2C, Airtel payouts), with maker-checker, idempotency keys, and reconciliation. *Done when:* an approved loan disburses to the member's wallet and the ledger + callback reconcile.

**P1 · ADD — Real SMS & email gateways.** Replace the demo `SmsNotificationProvider`/`EmailNotificationProvider` with real adapters (SMS: Africa's Talking / Infobip / Twilio with per-country sender IDs and delivery receipts; email: SES / SendGrid). *Done when:* OTPs, receipts, and alerts are delivered to real handsets/inboxes and delivery status is recorded.

**P2 · HARDEN — Payment reconciliation & lifecycle.** Move provider **status polling to an async scheduled job** (see §7), reconcile the payment-request lifecycle with signed callbacks, handle timeouts/partial failures, and expose a reconciliation report of provider vs ledger. *Done when:* every provider transaction resolves to a terminal, reconciled state with no orphaned requests.

**P2 · HARDEN — Idempotency & retries end-to-end.** Ensure every outbound provider call carries an idempotency key and safe retry/backoff; ensure duplicate inbound callbacks (already idempotent by reference) and duplicate outbound requests cannot double-move money.

---

## 2. Lending domain

**P1 · ADD — Interest model completeness.** Flat-rate interest + schedule now exist; add a **reducing-balance** option, configurable per product, and make rates tenant/product-configurable (not hard-coded in the entity `switch`). *Done when:* a SACCO can define products with either method and correct schedules are generated.

**P1 · ADD — Arrears, penalties & aging.** Track missed installments, compute penalty interest, and age the portfolio (PAR/portfolio-at-risk buckets). *Done when:* overdue loans surface in reports with penalties applied per policy.

**P2 · HARDEN — DSR / exposure limits enforced at approval.** The debt-service ratio is computed but not enforced; block or flag approvals that breach configured limits, and enforce guarantor exposure ceilings. *Done when:* an over-limit application cannot be approved without an explicit override that is audited.

**P3 · ADD — Restructuring & write-off.** Support reschedule, top-up, and write-off with audit and reversal-safe accounting.

---

## 3. Security & authentication

**P1 · HARDEN — MFA verification throttling.** `verifyMfa` has no attempt limit or lockout on the 6-digit code within its 5-minute window. Add per-challenge attempt counting, invalidate the challenge after N failures, and rate-limit by IP/user. *Done when:* brute-forcing an MFA challenge is infeasible and locked challenges are audited.

**P1 · HARDEN — Distributed rate-limiting / lockout.** `LoginAttemptService` (and callback rate-limiting) uses an in-memory `ConcurrentHashMap`, so it is per-instance and lost on restart — ineffective under HA. Move to a shared store (Redis). *Done when:* lockouts hold across all instances and survive restarts. (This is a prerequisite for §6 horizontal scaling.)

**P2 · ADD — Secrets management & key rotation.** Replace `.env` files with a secrets manager (Vault / cloud secret store); rotate the mobile-money callback secret, provider keys, and DB credentials on a schedule; never keep long-lived secrets in images or compose files. *Done when:* no plaintext secret lives in the repo or image and rotation is documented and tested.

**P2 · HARDEN — Session & token posture.** Consider shortening staff session lifetime, adding refresh/rotation, and moving tokens off `localStorage` (or keep the strict CSP as the compensating control and document the risk acceptance). Add constant-time comparison already used for callbacks to the password hash compare (`equalsIgnoreCase` → `MessageDigest.isEqual`).

**P2 · ADD — Dependency & container CVE scanning.** Add SCA (e.g. OWASP Dependency-Check / Trivy) and image scanning to CI, failing on high-severity CVEs. *Done when:* every build reports and gates on known vulnerabilities.

**P3 · HARDEN — Authorization test coverage.** Extend the tenant-isolation/permission regression suite to cover every new endpoint (payment requests, schedules, disbursements) with cross-tenant negative tests.

---

## 4. Multi-tenancy & data isolation

**P2 · HARDEN — Centralise tenant scoping.** Tenant/permission checks are repeated by hand in every controller method — one omission is a data leak. As part of the service-layer refactor (§11), move authN/authZ/tenant-scope into a filter/interceptor or a shared guard, and add a defense-in-depth check (e.g. a tenant-aware repository base or Hibernate filter) so a missing manual check cannot leak data. *Done when:* tenant scoping is enforced in one place and covered by tests.

**P3 · HARDEN — Row-level safety.** Consider PostgreSQL row-level security or a mandatory `tenant_id` predicate helper as a backstop for the application-level checks.

---

## 5. Financial integrity & accounting

**P2 · HARDEN — Double-entry general-ledger rigor.** Journals are currently derived on read. Add explicit invariants and tests asserting **debits == credits** per entry, and enforce **immutability of posted rows** at the database layer (triggers preventing UPDATE/DELETE on posted transactions/journal lines) if the regulator requires it. *Done when:* the ledger is provably balanced and posted rows cannot be mutated.

**P2 · ADD — Period-close & trial-balance controls.** Ensure period close blocks all money movement (largely present) and produce a trial balance / balance-sheet that ties to member and GL balances. *Done when:* a closed period reconciles and reopening is controlled and audited.

**P3 · HARDEN — Reference generation.** Transaction references are now random suffixes (race-safe) but non-sequential; if regulators/members expect sequential receipt numbers, back them with a per-tenant DB sequence.

---

## 6. Scalability & high availability

**P1 · ADD — Stateless, horizontally scalable backend.** Remove in-memory state (§3 rate-limits), run 2+ backend instances behind a load balancer, and wire liveness/readiness probes to the orchestrator. *Done when:* instances can be added/removed with no loss of correctness.

**P1 · ADD — Resilient database.** Move from single-VM Postgres to a **managed/replicated PostgreSQL** with automated backups, point-in-time recovery, and a read replica for reporting. Define and test **RPO/RTO**. (Backup-restore rehearsal already exists — build on it.) *Done when:* a node loss does not lose data and restore meets the agreed RTO.

**P2 · ADD — Caching layer.** Introduce Redis for rate-limits, idempotency keys, session/permission caching, and hot reads. *Done when:* repeated permission/tenant lookups no longer hit the DB on every request.

---

## 7. Resilience & background processing

**P1 · ADD — Asynchronous job/queue infrastructure.** Notifications, provider status polling, callbacks, reconciliation, and subscription billing runs are synchronous inline today. Introduce a durable queue/scheduler (Spring `@Scheduled` + a job table, or a broker) so slow/failed external calls don't block requests and can retry with backoff and a dead-letter path. *Done when:* an unreachable provider degrades gracefully and retries without user-facing failures.

**P2 · HARDEN — Timeouts & circuit breakers.** Wrap all outbound provider calls (MTN, future Airtel/M-Pesa, SMS) with connect/read timeouts and a circuit breaker (Resilience4j) so one slow provider can't exhaust threads. *Done when:* provider outages are contained and observable.

---

## 8. Observability & operations

**P1 · ADD — Metrics, tracing, structured logs.** Add Micrometer + Prometheus metrics, OpenTelemetry tracing, and structured JSON logging with **tenant/correlation IDs** (the global handler already logs server-side — extend this everywhere). *Done when:* per-endpoint latency/error dashboards and end-to-end traces exist.

**P1 · ADD — Alerting & runbooks.** Alert on error-rate, callback failures, queue depth, DB health, disbursement failures, and login-lockout spikes; link alerts to the existing runbooks. *Done when:* an on-call is paged before customers notice.

**P2 · ADD — Audit log durability & export.** Ensure the audit trail is tamper-evident and exportable for supervisory review; consider append-only storage for financial/audit events.

---

## 9. Data protection & regulatory compliance

**P1 · ADD — Per-country data-protection framework.** For each target market implement consent capture, data-residency handling, retention/erasure, and subject-access — Kenya DPA, Nigeria NDPR, South Africa POPIA, Uganda DPPA, and equivalents. *Done when:* a member can exercise data rights and residency requirements are met per country.

**P2 · ADD — Regulatory reporting per jurisdiction.** UMRA-style filings exist for Uganda; generalise the regulatory-report module so each country's SACCO/microfinance regulator format is configurable.

**P2 · HARDEN — PII handling.** Encrypt sensitive PII at rest (national ID, phone), mask it in logs and UI where not needed, and scope who can view it by permission.

---

## 10. Frontend, UX, i18n & accessibility

**P1 · ADD — i18n breadth + RTL application.** UI languages are English + French only, and `direction: "rtl"` is defined per country but **not applied to the document**. Add Portuguese, Arabic, Swahili, and Amharic string catalogues and actually set `dir=rtl` (and mirror layout) for Arabic markets. *Done when:* an Egyptian SACCO sees a fully translated, right-to-left UI.

**P2 · HARDEN — Accessibility to WCAG 2.1 AA.** Fix borderline contrast (muted grey ~4:1), small fonts (11–13px), sub-44px touch targets; add ARIA/labels, visible focus, keyboard nav, and `prefers-reduced-motion`. *Done when:* an automated a11y audit and manual screen-reader pass meet AA.

**P2 · HARDEN — Data-cost & caching.** Minify + content-hash `app.js`/`styles.css`, serve versioned assets `immutable, max-age=31536000`, and code-split the member portal from the staff console. *Done when:* repeat visits transfer near-zero bytes and first load is minimised on 2G/3G.

**P3 · HARDEN — Mobile-first & white-label.** Rebase CSS mobile-first (down to 320px) and allow per-tenant branding (logo/colors/name).

---

## 11. Architecture & maintainability

**P2 · HARDEN — Extract the service layer.** Business logic lives in 700–1,300-line controllers. Extract domain services (finance, loans, mobile-money, accounting) that own validation and `@Transactional` boundaries; keep controllers thin. This unblocks testing, tenant-scope centralisation (§4), and safe evolution. *Done when:* controllers delegate and services are unit-tested.

**P2 · HARDEN — Converge the two backends.** The Node backend duplicates the domain; freeze one source of truth (Java) and reduce Node to a static/proxy role, or retire it. *Done when:* business rules exist in exactly one place.

**P3 · HARDEN — Front-end build pipeline.** Introduce a build/bundler and componentise the 8.2k-line `app.js` incrementally; replace hand-edited `?v=` cache-busting with content hashing.

---

## 12. Testing & QA

**P2 · ADD — Unit tests around the new service layer** (fast, no Spring context) and **concurrency tests** for optimistic-lock/idempotency races (double-post, duplicate callback, simultaneous approval).

**P2 · ADD — Provider contract tests** against MTN/Airtel/M-Pesa/SMS sandboxes, and **load/performance tests** (harness exists) to establish capacity and latency baselines.

**P3 · HARDEN — Extend browser/UAT coverage** to the new payment-request, schedule, disbursement, and localisation flows.

---

## 13. CI/CD & release

**P2 · ADD — Continuous delivery.** CI runs checks and a release gate; add container image build/publish, signed images, and automated, auditable deploys (staging → prod) with rollback. *Done when:* a merge to main can be promoted to production through an automated, gated pipeline.

**P2 · ADD — Security & quality gates in CI:** SCA/CVE scanning (§3), SAST, and coverage thresholds.

---

## 14. Suggested execution order (condensed)

1. **P1 launch-blockers:** finish payment rails (Airtel, M-Pesa) + **disbursements**; real **SMS/email**; **MFA throttling**; **distributed rate-limiting (Redis)**; **async job queue**; **observability** (metrics/tracing/logs/alerts); **HA database**.
2. **P1 domain/reach:** interest reducing-balance + arrears + DSR enforcement; **i18n breadth + RTL**; **real Flutter app**.
3. **P2 hardening:** service-layer refactor + centralised tenant scoping; GL rigor + immutability; secrets management + CVE scanning + CD; data-protection framework; accessibility; caching/data-cost.
4. **P3 polish:** reference sequences, white-label, front-end build pipeline, extended tests, mobile-first CSS.

Each item above is independently shippable and testable, consistent with the one-issue-at-a-time, backward-compatible working style. Nothing here requires a rewrite — it is finishing the integrations, adding the operational spine, and extending reach on top of a now-solid, secured core.

---

## 15. Role-based operational requirements (requested)

These are concrete, role-specific workflows the SACCO needs. Each is mapped to current state — **Supported**, **Partial**, or **Gap** — with the work required.

| # | Requirement | State | Work required |
|---|---|---|---|
| R1 | **Treasurer records members' cash savings, loan payments, etc.** | **Supported** | Confirm & polish |
| R2a | **Member deposits by mobile money → system records automatically** | **Partial** | Finish rails |
| R2b | **Money paid into the SACCO's bank account → system records automatically** | **Gap** | Bank feed/auto-reconciliation |
| R3 | **Chairman can view members' accounts** | **Gap** | RBAC + view |
| R4 | **Treasurer/Chairman subscribes via mobile money → recorded & system updated** | **Gap** | Authz + MoMo-linked billing |

### R1 — Treasurer cash recording (Supported → polish)
**P3 · HARDEN.** The treasurer role already holds `transactions:create/approve` and `accounting:post`, and the transaction API supports `savings_deposit`, `loan_repayment`, `share_purchase`, `welfare_contribution`, and `withdrawal` on the `cash` channel; loan repayments post through the loan module. So a treasurer can already record cash savings and loan payments. Remaining work is UX and control, not capability: build a streamlined **cash-desk / teller capture screen** (member lookup → type → amount → receipt), and confirm the **maker-checker** expectation for cash (the maker cannot approve their own posting, so a second officer must confirm — decide whether small cash deposits may auto-post or always require a checker). *Done when:* a treasurer can capture a member's cash saving or loan payment in a few taps and print/SMS a receipt, with the approval policy explicit.

### R2a — Member mobile-money deposit, auto-recorded (Partial → finish)
**P1 · ADD.** The MTN MoMo collection flow (member payment request → provider `requesttopay` → signed callback → posted transaction) already delivers this for MTN. Finish it by adding **Airtel Money and M-Pesa** adapters (see §1), covering savings, shares, welfare, and loan repayment purposes, and surfacing clear pending/failed/confirmed states to the member. *Done when:* a member on any supported network deposits from their phone and sees their balance update automatically after provider confirmation.

### R2b — Bank-account deposits, auto-recorded (Gap)
**P1 · ADD.** Today bank deposits are only captured via **manual statement-line import and reconciliation**; there is no automatic recording. Add automated bank ingestion so a member paying into the SACCO's bank account is recorded without manual entry:
- Ingest bank transactions automatically via a **bank API/Open-Banking feed** where available, or scheduled **bank-statement import** (file/email/SFTP) as a fallback.
- **Auto-match** each credit to a member using a deposit reference (member number / virtual account) and amount; post a savings deposit on match, and route unmatched credits to a **suspense/exceptions queue** for a treasurer to resolve.
- Enforce idempotency by bank reference (like mobile-money `externalReference`) and reconcile against the ledger.
*Done when:* a member's bank deposit appears as a posted, reconciled savings transaction automatically, and unmatched deposits land in an exceptions queue. *Note:* per-member **virtual account numbers** (from the SACCO's bank) dramatically improve match accuracy and are the recommended approach.

### R3 — Chairman views members' accounts (Gap)
**P2 · HARDEN.** The **chairperson role currently lacks `members:view`** (it has `reports:view`, `loans:*`, `approvals:*`, `governance:view`, `operations:view`). Grant the chairperson **read-only** access to member accounts:
- Add `members:view` (and, if needed, a member **statement/balance** read permission) to the chairperson role via a new Flyway migration, keeping it **read-only** (no `members:create/approve`).
- Ensure the member-account/statement screens render for a viewer without write actions.
*Done when:* a chairman can open any member in their SACCO and see balances, transactions, and loan status, but cannot edit them, and the access is tenant-scoped and audited.

### R4 — Treasurer/Chairman subscribes via mobile money (Gap)
**P1 · ADD.** Subscription payments are currently **platform-admin only** (`recordPayment` returns `PLATFORM_ADMIN_REQUIRED`), and the `mobile_money` channel is only a label — it does **not** trigger an actual MoMo collection. Enable SACCO-side, mobile-money subscription payment:
- Introduce a **`subscriptions:pay`** permission and grant it to treasurer/chairperson (or SACCO admin); allow a SACCO officer to initiate a subscription payment **for their own tenant only** (keep cross-tenant and package management platform-only).
- **Wire the payment to the mobile-money collection flow**: initiate a MoMo `requesttopay` for the invoice amount; on the confirmed signed callback, record the `SubscriptionPayment`, update paid/outstanding, and **activate/renew** the subscription — all in one transaction, idempotent by provider reference.
- Show the officer the pending → confirmed state and a receipt.
*Done when:* a treasurer or chairman pays the SACCO's subscription from their phone via mobile money, the payment is recorded automatically on confirmation, and the subscription status updates without any platform-admin action.

**Priority summary for this section:** R2a, R2b, R4 are **P1** (they define how money actually enters the system); R3 is a quick **P2** RBAC change; R1 is a **P3** UX polish on an existing capability. R2b (bank auto-recording) and R4 (MoMo-linked subscription) are the two genuinely new build-outs here.
