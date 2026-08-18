# Commit plan — 2026-08-15

Prepared review of the pending work. Run these on Windows (git writes are currently blocked
in the assistant sandbox by a stale `.git/index.lock`, which you can remove locally).

## 0. Before anything: clear the stale lock and refresh git's cache

A leftover zero-byte `.git\index.lock` from an interrupted git process is blocking all index
writes. Remove it, then let git refresh:

```powershell
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
git status
```

### Line-ending note (important)

The working tree had been flipped to CRLF while the repo blobs are LF, which made ~25 otherwise
untouched `app.*.js` files show as fully modified (whole-file churn). Those files were normalized
back to LF, so they now match `HEAD` and should drop off `git status` after the lock is cleared.
A new `.gitattributes` pins everything to LF so this cannot recur. If any pure-churn file still
shows as modified after clearing the lock, settle it once with:

```powershell
git add --renormalize .
git status
```

Only the 18 tracked + 5 new files below contain real changes.

## 1. Line-ending policy (commit first)

```powershell
git add .gitattributes
git commit -m "chore: pin text files to LF via .gitattributes"
```

## 2. Serve the Vite-bundled build

```powershell
git add server.mjs deploy/Caddyfile
git commit -m "feat(deploy): serve dist-vite bundle when present, else the source module tree"
```

## 3. Route member collection-account rendering through the typed model

```powershell
git add app.member.js src/settings/settings.test.ts
git commit -m "refactor(member): render collection accounts via typed buildCollectionAccountDisplayRows + tests"
```

## 4. Reconciliation → per-SACCO collection-account attribution

Suggest (statement lines by account number; callbacks by network), plus staff confirm/override
that persists the destination account on the line/callback (V62, tenant-isolated, audited), with
responses, reconciliation UI, OpenAPI docs, tests, and the dated capabilities review.

```powershell
git add ^
  backend-java/src/main/resources/db/migration/V62__reconciliation_collection_account.sql ^
  backend-java/src/main/java/com/methaltech/sacco/accounting/StatementLine.java ^
  backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyCallback.java ^
  backend-java/src/main/java/com/methaltech/sacco/accounting/StatementLineResponse.java ^
  backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyCallbackResponse.java ^
  backend-java/src/main/java/com/methaltech/sacco/accounting/AccountingController.java ^
  backend-java/src/main/java/com/methaltech/sacco/accounting/MobileMoneyController.java ^
  backend-java/src/test/java/com/methaltech/sacco/SaccoBackendApplicationTests.java ^
  app.accounting.js app.member-actions.js app.state.js app.interactions.js ^
  index.html service-worker.js ^
  src/types/domain.ts src/accounting/accounting.test.ts ^
  openapi.yaml docs/system-capabilities-and-gaps-2026-08-15.md
git commit -m "feat(reconciliation): attribute statement lines and callbacks to per-SACCO collection accounts"
```

## 5. Verify, then push

```powershell
npm run check        # runs frontend gates + mvnw test on JDK 17
git push
```

## Notes
- The collection-accounts backend (Tenant, SaccoPaymentAccount, V54/V61) and `src/settings/settings.ts`
  are already committed; they are not part of this batch.
- Commit 4 intentionally groups suggest + confirm/override together: they share the same files
  (e.g. `AccountingController.java`, `SaccoBackendApplicationTests.java`) and cannot be split cleanly
  by file boundary.
