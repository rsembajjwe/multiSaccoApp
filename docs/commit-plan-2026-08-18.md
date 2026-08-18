# Commit & Verify Plan — 2026-08-18

This lands the full uncommitted batch (112 changed paths, migrations **V62–V68**) that accumulated while
the sandbox could not run Maven, the frontend build, or `git commit`. Run everything below **on the
Windows machine**. Branch: `main`. Last commit: `eff62ab` (`.gitattributes` LF pin).

> Key idea: verification runs against the **whole working tree at once** (`mvn test` / `npm run check`
> don't care about commit boundaries). So: **verify the whole tree green first, then commit in groups.**
> The grouping below is organizational, not a per-commit build guarantee.

---

## Step 0 — Repair the git index (required first)

The earlier partial commit left the index inconsistent: `.gitattributes` is staged for deletion while the
file exists untracked. Clear stale locks and reset the index (this does **not** touch your files):

```powershell
cd C:\Users\Methaltech\Documents\saccoApp

# Remove any stale lock files (ignore "not found")
del /f /q .git\index.lock 2>$null
del /f /q .git\HEAD.lock 2>$null
del /f /q .git\objects\maintenance.lock 2>$null
del /f /q .git\refs\heads\.probe_lock 2>$null

# Un-stage everything, keep working files intact
git reset --mixed HEAD

git status --short        # .gitattributes should now show as untracked (??) only
```

---

## Step 1 — Verify the whole tree BEFORE committing

Do not commit until all three are green.

```powershell
# 1. Backend build + tests (H2)
cd backend-java
mvn -q clean test
cd ..

# 2. Frontend build + typed tests (esbuild + vitest + tsc)
npm run check

# 3. Static contract checks (fast, already green in review)
node scripts/check-ui-panel-contracts.mjs
node scripts/check-type-contracts.mjs
node scripts/test-frontend-helpers.mjs
node scripts/check-openapi-coverage.mjs
```

New tests that must pass (all added this cycle):
`adminConfiguresCustomFundTypeAndCanCreateAProductOfThatFund`,
`newTenantIsSeededWithTheThreeBuiltInFundTypes`,
`memberHoldsAndSeesAPerFundBalanceForACustomFund`,
`platformBillingComposesBaseSubscriptionWithAddOnRevenueAvenues`,
`saccoBroadcastFansOutAcrossChannelsAndAppearsInRepositoryAndWhatsAppIsBilled`,
`saccoAndMemberControlNotificationChannelsAndFanOutRespectsThem`,
`subscriptionLifecycleExpiresLapsedRemindsBeforeExpiryAndExposesState`,
`memberDuesAssignPayAndLifecycle`.

Migrations now run through **V70**. The test class sets `sacco.notifications.broadcast-async=false` so broadcast
fan-out is synchronous under test.

If anything fails, fix before proceeding — do not commit a red tree.

---

## Step 2 — Commit in feature groups

Re-add the LF pin first, then commit each group. Each block is copy-paste ready.

### Commit 1 — .gitattributes
```powershell
git add .gitattributes
git commit -m "chore: restore .gitattributes LF pin"
```

### Commit 2 — Reconciliation per-SACCO attribution (V62)
```powershell
git add backend-java/src/main/resources/db/migration/V62__reconciliation_collection_account.sql `
  backend-java/src/main/java/com/methaltech/sacco/accounting/AccountingController.java `
  backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyCallback.java `
  backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyCallbackResponse.java `
  backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyController.java `
  backend-java/src/main/java/com/methaltech/sacco/accounting/StatementLine.java `
  backend-java/src/main/java/com/methaltech/sacco/accounting/StatementLineResponse.java `
  app.accounting.js app.accounting-model.js `
  src/accounting/accounting.ts src/accounting/accounting.test.ts
git commit -m "feat(reconciliation): persist per-SACCO account attribution for statement lines and callbacks"
```

### Commit 3 — Sources-of-funds register (V63)
```powershell
git add backend-java/src/main/resources/db/migration/V63__sacco_funding_sources.sql `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundingSource.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundingSourceController.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundingSourceRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundingSourceResponse.java `
  app.sacco-finance.js app.sacco-finance-model.js `
  src/sacco-finance/finance.ts src/sacco-finance/finance.test.ts
git commit -m "feat(finance): SACCO sources-of-funds register (view/manage, tenant-scoped, audited)"
```

### Commit 4 — Configurable fund types + new-tenant seeding (V64)
```powershell
git add backend-java/src/main/resources/db/migration/V64__sacco_fund_types.sql `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundType.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeController.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeProvisioningService.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeResponse.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FinancialProductController.java `
  backend-java/src/main/java/com/methaltech/sacco/tenant/TenantController.java `
  app.settings.js src/settings/settings.test.ts
git commit -m "feat(finance): configurable fund-type registry with baseline seeding on new tenants"
```

### Commit 5 — Member per-fund balances (V65)
```powershell
git add backend-java/src/main/resources/db/migration/V65__member_fund_balances.sql `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberFundBalance.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberFundBalanceRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberFundBalanceService.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/FinancialTransactionController.java `
  backend-java/src/main/java/com/methaltech/sacco/finance/WelfareClaimController.java
git commit -m "feat(member): per-fund member balance ledger wired into posting and welfare payouts"
```

### Commit 6 — Financial statements, charts & enterprise UI refresh
```powershell
git add app.charts.js app.sacco.js app.shell.js styles.css `
  app.approvals.js app.complaints.js app.governance.js app.loans.js `
  app.member-admin.js app.navigation.js app.operations.js app.platform.js `
  app.reporting.js app.transactions.js app.ui.js app.users.js app.js `
  src/loans/loans.test.ts src/transactions/transactions.test.ts src/types/domain.ts
git commit -m "feat(ui): financial statements, dependency-free SVG charts, enterprise component refresh"
```

### Commit 7 — Revenue avenues / platform billing (V66)
```powershell
git add backend-java/src/main/resources/db/migration/V66__platform_billing_addons.sql `
  backend-java/src/main/java/com/methaltech/sacco/subscription/BillingCatalogItem.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/BillingCatalogRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/BillingResponses.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/PlatformBillingController.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/PlatformBillingService.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/TenantBillingItem.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/TenantBillingItemRepository.java `
  app.billing.js app.platform-actions.js
git commit -m "feat(billing): add-on modules, metered SMS/WhatsApp, seat/branch overage, setup+support"
```

### Commit 8 — Notification channels, message repository & preferences (V67, V68)
```powershell
git add backend-java/src/main/resources/db/migration/V67__whatsapp_billing_rate.sql `
  backend-java/src/main/resources/db/migration/V68__notification_channel_preferences.sql `
  backend-java/src/main/java/com/methaltech/sacco/notification/WhatsAppNotificationProvider.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/PushNotificationProvider.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationChannelController.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationChannelPreference.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationChannelPreferenceRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationChannelPreferenceService.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationAsyncConfig.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationBroadcastDispatcher.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationController.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationService.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationResponse.java `
  backend-java/src/main/java/com/methaltech/sacco/notification/NotificationRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberAuthController.java `
  backend-java/src/main/resources/application.properties `
  backend-java/src/main/resources/application-prod.properties `
  app.notifications.js app.member.js app.member-actions.js
git commit -m "feat(notifications): WhatsApp+push channels, message repository, per-SACCO/member channel preferences"
```

### Commit 9 — Cross-cutting wiring, tests, docs & tooling
```powershell
git add backend-java/src/test/java/com/methaltech/sacco/SaccoBackendApplicationTests.java `
  index.html service-worker.js app.interactions.js app.session.js app.state.js app.core.js `
  app.finance-actions.js app.member-admin-actions.js app.sacco-actions.js `
  openapi.yaml package.json server.mjs deploy/Caddyfile scripts/build-frontend.mjs `
  scripts/test-frontend-helpers.mjs scripts/seed-scale-data.sql `
  docs/
git commit -m "chore: wire new modules, integration tests, docs and build/deploy tooling"
```

### Commit 10 — SACCO subscription expiry, enforcement, renewal & reminders (V69)
```powershell
git add backend-java/src/main/resources/db/migration/V69__subscription_reminder.sql `
  backend-java/src/main/java/com/methaltech/sacco/subscription/SubscriptionLifecycleService.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/SubscriptionExpiryJob.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/Subscription.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/SubscriptionRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/SubscriptionController.java `
  backend-java/src/main/java/com/methaltech/sacco/subscription/SubscriptionResponse.java `
  backend-java/src/main/java/com/methaltech/sacco/config/SubscriptionEnforcementFilter.java
git commit -m "feat(subscription): automated expiry + grace, read-only enforcement, period-aware renewal, reminders"
```

### Commit 11 — Member membership dues & expiry (V70)
```powershell
git add backend-java/src/main/resources/db/migration/V70__member_subscriptions.sql `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberSubscription.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberSubscriptionRepository.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberSubscriptionResponse.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberSubscriptionService.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberSubscriptionController.java `
  backend-java/src/main/java/com/methaltech/sacco/member/MemberSubscriptionExpiryJob.java `
  app.member-admin.js app.member-admin-actions.js
git commit -m "feat(member): membership dues with payment, expiry job and renewal reminders"
```

> Note: shared files touched by commits 10–11 that are already staged in earlier commits
> (`MemberAuthController.java`, `NotificationService.java`, `application*.properties`, `app.member.js`,
> `app.navigation.js`, `app.shell.js`, `app.session.js`, `app.state.js`, `app.core.js`,
> `app.interactions.js`, `SaccoBackendApplicationTests.java`, `index.html`, `service-worker.js`) carry
> subscription/member-dues changes too — they land wherever you first `git add` them. The verify-first
> workflow means grouping is organizational; the sweep below guarantees nothing is left behind.

### Sweep — anything missed
```powershell
git status --short        # should be empty; if not, add the stragglers:
git add -A
git commit -m "chore: remaining batch files"
```

---

## Step 3 — Push

```powershell
git push origin main
```

---

## Simpler alternative (one commit)

If you'd rather not split, after Step 0 and a green Step 1:

```powershell
git add -A
git commit -m "feat: reconciliation attribution, fund types & balances, revenue avenues, notification channels + preferences + message repository, subscription lifecycle + enforcement, member dues, enterprise UI"
git push origin main
```

---

## Notes & risks

- **Migrations are additive V62→V70**; apply cleanly on top of the current schema. No destructive changes.
- **H2/PostgreSQL parity**: no CHECK constraints on string columns; values validated in the app layer.
- **No-float preserved**: billing and notifications never touch member funds — no BoU licensing impact.
- If `mvn test` reports a Flyway checksum mismatch on a dev DB, it's because a migration was edited after a
  prior run — reset the local dev H2/Postgres schema (drop `flyway_schema_history` or use a fresh DB).
- Supersedes `docs/commit-plan-2026-08-15.md` and `docs/commit-plan-2026-08-17.md`.
