# Tereka Online — What "100% Complete" Requires

**Date:** 10 August 2026
**Starting point:** ~80% supervised-pilot / ~60% unattended-enterprise readiness (see the current
capabilities & gaps review).
**Definition:** "100%" = every open gap closed with objective acceptance criteria, across five
workstreams. Items marked **[code]** I can implement here; **[external]** depends on third parties
(telecoms, regulators, auditors) and has lead times outside the codebase.

---

## A. Engineering completion (build the remaining pieces)

1. **Frontend build (real, not bridged)** — [code]
   *Done when:* Vite is installed; modules use real ES `import`/`export`; `npm run build` emits a
   minified, hashed, tree-shaken bundle; `index.html`, the service worker, and `server.mjs`/Caddy serve
   the built output; the classic `<script>` list is gone.

2. **Type safety** — [code]
   *Done when:* the SPA is TypeScript (or JSDoc-typed with `tsc --checkJs`) and a type check runs in CI
   with zero errors.
   *Current progress:* classic SPA `checkJs`, contract-marker checks, and a strict
   `src/types/domain.ts` source boundary now pass and run through `npm run check` / `npm run
   type:evidence`. Remaining work is migrating runtime modules from global classic scripts into typed
   ES modules and reducing broad compatibility index signatures. The first runtime migration slice is
   started with `src/tables/tableModel.ts` plus the classic `app.table-model.js` bridge for shared
   table/search/pagination state, row filtering, and table-state keys, followed by `src/formatting/formatters.ts` plus
   `app.formatters.js` for shared money/date formatting, labels, sums, status badges, escaping, and
   table value formatting. Member statement normalization and monthly performance aggregation now
   follow the same pattern through `src/member/performance.ts` plus `app.member-performance.js`,
   including payment lifecycle rows, route labels, payment status, receipt status, guarantor rows,
   SACCO-admin message rows, mobile-money rows, provider filtering, payment request rows, and offline
   draft rows. SACCO admin member-document rows, retention summaries, statement totals, and
   receipt-ready statement summaries now follow the same pattern through `src/member/admin.ts` plus
   `app.member-admin-model.js`. Transaction row shaping, approval readiness, payment route/status,
   receipting queue rows, receipt register rows, and receipt summaries now follow the same pattern
   through `src/transactions/transactions.ts` plus `app.transactions-model.js`. Loan row shaping,
   guarantor readiness, approval readiness, servicing status, portfolio risk counts, outstanding
   principal, and arrears-aging totals now follow the same pattern through `src/loans/loans.ts` plus
   `app.loans-model.js`.

3. **Bank collection — real integration** — [code + external]
   *Done when:* a real bank/aggregator API (or a defined file/host-to-host settlement) replaces the
   current reference/draft + statement-import flow, with automated reconciliation. (Bank onboarding is
   external.)

4. **Mobile money — production-live** — [code + external]
   *Done when:* MTN/Airtel **merchant/KYC onboarding** is complete; production credentials + signed
   callbacks are configured; a real payment to a live number completes and reconciles; optionally
   per-SACCO settlement credentials.

5. **Retire the legacy Node prototype** — [code]
   *Done when:* `backend/*.mjs` is removed or clearly quarantined; only the Java backend + SPA host
   remain; docs updated.

---

## B. Quality & verification (prove it works)

6. **Frontend test framework + suite** — [code]
   *Done when:* a real runner (Vitest) with component/DOM tests covers the high-risk renderers and
   flows; runs in CI; a coverage floor is enforced.

7. **Backend test-pyramid depth** — [code]
   *Done when:* focused service/domain unit tests exist for every money path and permission rule (not
   just the big integration suite); coverage floor enforced in CI.

8. **Performance & load/soak testing** — [code]
   *Done when:* load and soak runs hit defined throughput/latency targets; DB indexes/N+1 hotspots
   fixed; connection pool tuned; results captured as evidence.

9. **HA / failover rehearsal** — [code]
   *Done when:* a two-instance deployment behind a load balancer, sharing Redis, survives an instance
   kill with no lost rate-limit/idempotency state; documented RTO/RPO; failover evidence recorded.

10. **DR / backup-restore** — [code]
    *Done when:* backup + point-in-time restore is rehearsed on production-like data against target
    RPO/RTO, with signed-off evidence.

11. **Security penetration test** — [external]
    *Done when:* an independent pen test / code audit is passed and findings remediated.

12. **Accessibility (WCAG)** — [code + external]
    *Done when:* keyboard navigation, ARIA, contrast, and screen-reader support meet WCAG 2.1 AA, with
    an audit report.

13. **User Acceptance Testing (UAT)** — [external]
    *Done when:* real SACCO staff and members complete scripted UAT and sign off.

---

## C. Operations readiness (run it unattended)

14. **Managed secrets** — [code + external]
    *Done when:* production secrets live in a managed store (Vault/cloud KMS) with rotation and audit —
    no secrets in env files.

15. **Monitoring, alerting & on-call** — [code + external]
    *Done when:* Prometheus metrics feed dashboards (Grafana) and alerts (error rate, latency, callback
    failures, queue depth) route to an on-call channel; SLO/SLA defined.

16. **Centralized logging & tracing** — [code]
    *Done when:* structured logs (with the existing correlation IDs) are shipped to a central store;
    optional distributed tracing for cross-service flows.

17. **Production deployment + runbooks** — [code + external]
    *Done when:* a repeatable prod deploy (CI/CD to real infra) exists with rollback, plus runbooks for
    common incidents.

---

## D. Compliance & inclusion (allowed to operate)

18. **Data protection (Uganda DPA 2019)** — [code + external]
    *Done when:* the existing evidence (privacy requests, consent, masking, retention) is completed into
    policy, encryption at rest is enabled for PII, and registration/DPO obligations are met.

19. **Sector regulation (Bank of Uganda / UMRA)** — [external]
    *Done when:* licensing/supervision requirements and regulator-facing reporting are satisfied.

20. **Internationalization depth** — [code + external]
    *Done when:* the catalog is fully populated and translated (English + French now; Luganda/Swahili as
    targeted) and QA'd in-app.

21. **Legal** — [external]
    *Done when:* Terms of Service, Privacy Policy, and data-processing agreements are finalized.

---

## E. Go-live

22. **Documentation** — [code]
    *Done when:* admin/operator and member user guides, API docs (OpenAPI complete for admin endpoints
    too), and architecture/runbook docs are published.

23. **Commit & release hygiene** — [code]
    *Done when:* the working set is committed in focused commits; a tagged release + changelog exists.

24. **Pilot → production sign-off** — [external]
    *Done when:* a supervised pilot runs clean for an agreed period, then a formal go-live decision is
    recorded.

---

## What I can drive now (no external dependencies)

Ordered by leverage: **(1)** finish the Vite build + convert to ES modules, **(2)** add the Vitest
frontend suite, **(3)** run load/soak + a two-instance failover rehearsal and capture HA evidence,
**(4)** deepen backend unit tests to a coverage floor, **(5)** structured logging + alert rules,
**(6)** retire the Node prototype and complete OpenAPI, **(7)** commit the working set.

The items that **cannot** be finished purely in code — and therefore cap "100%" on external timelines —
are: MTN/Airtel and bank **merchant onboarding**, **regulatory licensing** (BoU/UMRA), an independent
**penetration test/audit**, real-user **UAT sign-off**, and **legal** documents.
