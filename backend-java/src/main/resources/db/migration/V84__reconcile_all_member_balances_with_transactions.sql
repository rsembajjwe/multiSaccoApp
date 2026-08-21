-- Reconcile EVERY seeded member (all SACCOs) the way Amina is reconciled: back each
-- member's displayed savings / shares / welfare balance with posted transactions so the
-- member statement and per-fund drill-down sum exactly to the Account Balances headline.
--
-- Strategy: for each member and each fund, post ONE opening reconciliation deposit equal to
-- the shortfall between the stored balance and whatever posted activity already exists. Members
-- who are already fully backed (e.g. Amina) get a zero shortfall and therefore no extra row, so
-- their existing statements are unchanged. Stored balances themselves are never modified.
--
-- The maker/checker is any staff user in the member's tenant, falling back to the platform admin
-- for tenants that have no staff users yet (keeps this generic for every current and future SACCO).

-- Savings: net of deposits minus withdrawals.
INSERT INTO financial_transactions (
    id, tenant_id, branch_id, member_id, type, channel, amount, status, reference,
    narration, maker_user_id, checker_user_id, posted_at)
SELECT 'txn_recon_sav_' || m.id, m.tenant_id, m.branch_id, m.id, 'savings_deposit', 'cash',
       m.savings_balance - COALESCE((
           SELECT SUM(CASE WHEN t.type = 'savings_deposit' THEN t.amount
                           WHEN t.type = 'withdrawal' THEN -t.amount ELSE 0 END)
           FROM financial_transactions t
           WHERE t.member_id = m.id AND t.status = 'posted'), 0),
       'posted', 'RECON-SAV-' || m.membership_no,
       'Opening savings balance (reconciliation)',
       COALESCE((SELECT MIN(u.id) FROM users u WHERE u.tenant_id = m.tenant_id), 'user_platform_admin'),
       COALESCE((SELECT MIN(u.id) FROM users u WHERE u.tenant_id = m.tenant_id), 'user_platform_admin'),
       TIMESTAMP WITH TIME ZONE '2024-01-02 09:00:00+00'
FROM members m
WHERE m.savings_balance - COALESCE((
        SELECT SUM(CASE WHEN t.type = 'savings_deposit' THEN t.amount
                        WHEN t.type = 'withdrawal' THEN -t.amount ELSE 0 END)
        FROM financial_transactions t
        WHERE t.member_id = m.id AND t.status = 'posted'), 0) > 0;

-- Shares: cumulative share purchases.
INSERT INTO financial_transactions (
    id, tenant_id, branch_id, member_id, type, channel, amount, status, reference,
    narration, maker_user_id, checker_user_id, posted_at)
SELECT 'txn_recon_shr_' || m.id, m.tenant_id, m.branch_id, m.id, 'share_purchase', 'cash',
       m.shares_balance - COALESCE((
           SELECT SUM(t.amount) FROM financial_transactions t
           WHERE t.member_id = m.id AND t.status = 'posted' AND t.type = 'share_purchase'), 0),
       'posted', 'RECON-SHR-' || m.membership_no,
       'Opening share capital (reconciliation)',
       COALESCE((SELECT MIN(u.id) FROM users u WHERE u.tenant_id = m.tenant_id), 'user_platform_admin'),
       COALESCE((SELECT MIN(u.id) FROM users u WHERE u.tenant_id = m.tenant_id), 'user_platform_admin'),
       TIMESTAMP WITH TIME ZONE '2024-01-02 09:05:00+00'
FROM members m
WHERE m.shares_balance - COALESCE((
        SELECT SUM(t.amount) FROM financial_transactions t
        WHERE t.member_id = m.id AND t.status = 'posted' AND t.type = 'share_purchase'), 0) > 0;

-- Welfare: cumulative welfare contributions.
INSERT INTO financial_transactions (
    id, tenant_id, branch_id, member_id, type, channel, amount, status, reference,
    narration, maker_user_id, checker_user_id, posted_at)
SELECT 'txn_recon_wel_' || m.id, m.tenant_id, m.branch_id, m.id, 'welfare_contribution', 'cash',
       m.welfare_balance - COALESCE((
           SELECT SUM(t.amount) FROM financial_transactions t
           WHERE t.member_id = m.id AND t.status = 'posted' AND t.type = 'welfare_contribution'), 0),
       'posted', 'RECON-WEL-' || m.membership_no,
       'Opening welfare balance (reconciliation)',
       COALESCE((SELECT MIN(u.id) FROM users u WHERE u.tenant_id = m.tenant_id), 'user_platform_admin'),
       COALESCE((SELECT MIN(u.id) FROM users u WHERE u.tenant_id = m.tenant_id), 'user_platform_admin'),
       TIMESTAMP WITH TIME ZONE '2024-01-02 09:10:00+00'
FROM members m
WHERE m.welfare_balance - COALESCE((
        SELECT SUM(t.amount) FROM financial_transactions t
        WHERE t.member_id = m.id AND t.status = 'posted' AND t.type = 'welfare_contribution'), 0) > 0;
