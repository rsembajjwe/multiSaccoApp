# Code Review — Notification Channels, Message Repository & Preferences (2026-08-18)

Review Mode pass over this session's work (WhatsApp/push channels, metered WhatsApp billing, message
repository + SACCO broadcast, SACCO/member channel preferences). Scope: correctness, multi-tenant
isolation, security, and performance at the 1000-SACCO target. Severity per project convention.

Overall: functionally sound and tenant-safe. Two scaling defects matter before broadcasts run on real SACCO
sizes; one is fixed in this pass. None touch member funds — no Bank of Uganda licensing impact.

---

## Critical
None.

## High

### H-1 — Fan-out issued a preference query per channel per member  ✅ FIXED in this pass
`NotificationService.createDeliveries` called `channelAllowed(tenant, member, channel)` once per provider,
and each call ran up to two queries. A broadcast to a 300-member SACCO produced ~300 × 4 × 2 ≈ 2,400
preference queries synchronously. **Fix applied:** added `NotificationChannelPreferenceService.allowedChannels(tenant, member)`
that resolves the full allowed set in exactly two queries; fan-out now filters the provider stream against
that set. Reduces preference queries to 2 per member.

### H-2 — Message repository endpoint was unbounded  ✅ FIXED in this pass
`GET /notifications/messages` loaded all of a tenant's notifications and filtered in Java — a memory/latency
and DoS risk as transaction notifications accumulate. **Fix applied:** added opt-in `PageParams` pagination
(`findByTenantId(tenantId, Pageable)` / `findAll(Pageable)`, `createdAt DESC`, clamped to max 200) returning a
`PagedResponse`, and registered `messages` in the frontend `HIGH_VOLUME_ENDPOINTS` set so the session loader
requests a bounded page and the existing envelope-unwrap path applies. Category/search still filter within the
loaded page; the panel copy now says so. **Residual (Low):** category filtering is client-side over the loaded
page, so a category can appear empty if none of its rows fall in the latest page — push the category filter into
the query (`eventType IN (...)`) with a reload-on-chip if full-history category views are needed.

### H-3 — Broadcast was synchronous over all members  ✅ FIXED in this pass
`POST /notifications/messages/broadcast` iterated every member inline (saving notifications + fan-out
deliveries + provider calls) on the request thread — a timeout and provider-burst risk for large SACCOs.
**Fix applied:** the controller now resolves recipients, audits, returns **202 Accepted** with the recipient
count, and hands the fan-out to `NotificationBroadcastDispatcher.dispatch(...)`, an `@Async` method running on
a bounded `notificationExecutor` (core 2 / max 4 / queue 500 / caller-runs). Config flag
`sacco.notifications.broadcast-async` (default true) switches to a synchronous executor — used by the test so
side effects stay observable without racing. Frontend copy now says the message is *queued* and delivery is in
progress. **Residual (Low):** no per-broadcast job/progress record yet; failures surface only in
`notification_deliveries`. Add a broadcast job row if operators need progress/So.

## Medium

### M-1 — Billing counts only `status = 'sent'`
`PlatformBillingService.channelCount` meters deliveries where `status = 'sent'`. The demo providers write
`sent`, but a real WhatsApp delivery webhook would transition rows to `delivered`. Those would then be
excluded from billing. **Recommend:** count terminal success states (`status IN ('sent','delivered')`), and
decide the billing trigger (accepted vs delivered) explicitly when the real providers land.

### M-2 — WhatsApp (charged) defaults to ON
Channel preferences use an opt-out model, so once a SACCO is switched to a real WhatsApp provider, every
member receives WhatsApp on every notification until someone disables it — an unexpected-cost risk.
**Recommend:** seed the SACCO-level WhatsApp toggle to OFF (explicit enable), or gate enablement behind the
billing add-on. Behavioural choice, not a bug.

## Low

### L-1 — Preference upsert is not atomic
`setSaccoChannel`/`setMemberChannel` do find-then-save; two concurrent toggles for the same
(tenant, member, channel) could race the unique index. Low likelihood (single admin/member editing).
**Optional:** catch the constraint violation and retry, or use a DB upsert.

### L-2 — `channelAllowed(...)` now unused externally
After H-1's batching fix, the single-channel `channelAllowed` helper has no remaining caller. Harmless;
keep as a public convenience or remove to satisfy the no-dead-code standard.

---

## Verified good
- **Tenant isolation**: message repository and broadcast both resolve tenant via scope helpers — non-platform
  users are confined to their own tenant; platform must name a tenant to broadcast. Member preference reads/writes
  are keyed to the authenticated member.
- **Preference semantics**: in-app messages always delivered; a member cannot enable a channel the SACCO
  disabled; absence of a row = enabled (behaviour preserved).
- **Security**: no member PINs collected or stored; provider secrets are config/env-driven and log-excluded.
- **Money safety**: nothing in this batch moves or pools member funds.

---

## Suggested follow-up order
1. ~~H-2 (paginate the message repository)~~ — done this pass.
2. ~~H-3 (async broadcast)~~ — done this pass.
3. M-1 (billing status alignment) — do it when wiring the real WhatsApp webhook (see the go-live guide).
4. M-2 (default WhatsApp off) — one seed row + a line in the go-live checklist.

H-1, H-2 and H-3 fixes fold into the existing uncommitted batch. New backend files this pass
(`NotificationAsyncConfig`, `NotificationBroadcastDispatcher`) belong with commit 8 of
`docs/commit-plan-2026-08-18.md`; `app.api.js`/`app.interactions.js` with commit 9. Remaining open items:
M-1, M-2, L-1.
