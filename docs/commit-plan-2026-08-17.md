# Commit plan — 2026-08-17 (current; supersedes earlier 08-15 / 08-17 drafts)

Covers all pending work: reconciliation → per-SACCO account attribution, the SACCO sources-of-funds
register, configurable fund types (+ seeding on tenant creation), financial statements (trial balance /
income statement / balance sheet), dependency-free reporting charts, typed frontend unit tests, serving
the Vite bundle, and the enterprise UI refresh (login, shared components, nav icons).

All in-sandbox gates pass (both `tsc` projects, UI/i18n/accessibility/type contracts, OpenAPI coverage,
frontend + member-portal tests, `node --check`, balanced CSS). Java compile + JUnit + vitest run on your
Windows/JDK 17 machine via `npm run check`.

## 0. IMPORTANT — status and one-time cleanup

**Commit 1 (`.gitattributes`) is already committed** as `eff62ab` on `main` (parent `732c0c9`). The
assistant made it through a private index; that environment can create git lock files but not delete
them, so several stale `.lock` files were left behind and no further commits could be made there.

On your Windows machine, first delete the stale locks and resync the index, then continue with commits
2–5 below:

```powershell
Remove-Item .git\HEAD.lock, .git\index.lock, .git\objects\maintenance.lock, .git\refs\heads\.probe_lock -ErrorAction SilentlyContinue
git reset --mixed HEAD   # resync the index to eff62ab (working-tree changes are preserved)
git status               # should show the remaining pending files as modified/untracked
```

The tree is LF-normalized and `.gitattributes` pins it. If any file you did not change still shows
modified (a CRLF artifact), settle once with `git add --renormalize .`.

Then run commits 2–5. (Commit 1 is done — skip it.)

## Recommended commits (4 easy passes)

`index.html` and `service-worker.js` accumulate cache-version bumps for every frontend change, so they
ride along in the final feature commit.

```powershell
# 1) Line-ending policy — ALREADY DONE (commit eff62ab). Skip.

# 2) Serve the Vite bundle (self-contained)
git add server.mjs deploy/Caddyfile
git commit -m "feat(deploy): serve dist-vite bundle when present, else source tree"

# 3) Typed frontend unit tests (self-contained new files)
git add src/loans/loans.test.ts src/transactions/transactions.test.ts ^
        src/accounting/accounting.test.ts src/sacco-finance/finance.test.ts src/settings/settings.test.ts
git commit -m "test(frontend): typed unit tests for loans, transactions, accounting, finance, settings"

# 4) SACCO finance features + enterprise UI (everything else)
git add backend-java/src/main/resources/db/migration/V62__reconciliation_collection_account.sql ^
        backend-java/src/main/resources/db/migration/V63__sacco_funding_sources.sql ^
        backend-java/src/main/resources/db/migration/V64__sacco_fund_types.sql ^
        backend-java/src/main/java/com/methaltech/sacco/accounting/StatementLine.java ^
        backend-java/src/main/java/com/methaltech/sacco/accounting/StatementLineResponse.java ^
        backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyCallback.java ^
        backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyCallbackResponse.java ^
        backend-java/src/main/java/com/methaltech/sacco/accounting/AccountingController.java ^
        backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyController.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundingSource.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundingSourceController.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundingSourceRepository.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundingSourceResponse.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundType.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeController.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeRepository.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeResponse.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FundTypeProvisioningService.java ^
        backend-java/src/main/java/com/methaltech/sacco/finance/FinancialProductController.java ^
        backend-java/src/main/java/com/methaltech/sacco/tenant/TenantController.java ^
        backend-java/src/test/java/com/methaltech/sacco/SaccoBackendApplicationTests.java ^
        openapi.yaml src/types/domain.ts src/accounting/accounting.ts src/sacco-finance/finance.ts ^
        app.accounting.js app.accounting-model.js app.sacco-finance.js app.sacco-finance-model.js ^
        app.member.js app.member-actions.js app.settings.js app.navigation.js app.session.js ^
        app.finance-actions.js app.interactions.js app.state.js app.charts.js ^
        app.shell.js styles.css index.html service-worker.js ^
        docs/roles-and-reporting-review-2026-08-17.md docs/system-capabilities-and-gaps-2026-08-15.md
git commit -m "feat: reconciliation attribution, configurable funds, financial statements, charts, enterprise UI"

# 5) Refresh the commit plans (housekeeping)
git add docs/commit-plan-2026-08-15.md docs/commit-plan-2026-08-17.md
git commit -m "docs: refresh pending-work commit plan"
```

## Verify, then push

```powershell
npm run check
git push
```

## Finer granularity (optional)

Commit 4 bundles several features that share files (`app.state.js`, `app.interactions.js`, `openapi.yaml`,
`SaccoBackendApplicationTests.java`, `src/types/domain.ts`, `app.accounting.js`, `index.html`,
`service-worker.js`), so a strict per-feature history needs `git add -p` on those. Feature file groups:

- Reconciliation attribution: V62; StatementLine/StatementLineResponse/MobileMoneyCallback/
  MobileMoneyCallbackResponse/AccountingController/MobileMoneyController.java; app.accounting.js (recon
  panels); app.member-actions.js.
- Sources-of-funds register: V63; FundingSource*.java; app.sacco-finance.js/-model.js; app.navigation.js.
- Configurable fund types: V64; FundType*.java + FundTypeProvisioningService; FinancialProductController;
  TenantController; app.settings.js.
- Financial statements: src/accounting/accounting.ts; app.accounting-model.js; app.accounting.js (tabs).
- Charts: app.charts.js; app.accounting.js (chart figures).
- Enterprise UI: styles.css; app.shell.js.
- Shared across the above: app.state.js, app.interactions.js, app.session.js, app.finance-actions.js,
  openapi.yaml, src/types/domain.ts, SaccoBackendApplicationTests.java, index.html, service-worker.js.
