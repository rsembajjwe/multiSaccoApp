-- 1) Reconcile the demo balances so the displayed savings/shares/welfare and loan
--    balance reflect the extra deposits and repayments seeded in V81.

-- Amina's balances are set to the sum of her posted transactions so the Account Balances,
-- the Total Balance and the per-fund statement all reconcile:
--   savings 900,000 (250,000 seed + 650,000 in V81), shares 150,000, welfare 45,000.
UPDATE members SET savings_balance = 900000, shares_balance = 150000, welfare_balance = 45000
    WHERE id = 'member_green_amina';
UPDATE members SET savings_balance = 1210000, shares_balance = 500000, welfare_balance = 110000
    WHERE id = 'member_green_daniel';

UPDATE member_fund_balances SET balance = 900000 WHERE member_id = 'member_green_amina' AND fund_code = 'savings';
UPDATE member_fund_balances SET balance = 150000 WHERE member_id = 'member_green_amina' AND fund_code = 'shares';
UPDATE member_fund_balances SET balance = 45000  WHERE member_id = 'member_green_amina' AND fund_code = 'welfare';
UPDATE member_fund_balances SET balance = 1210000 WHERE member_id = 'member_green_daniel' AND fund_code = 'savings';
UPDATE member_fund_balances SET balance = 500000  WHERE member_id = 'member_green_daniel' AND fund_code = 'shares';
UPDATE member_fund_balances SET balance = 110000  WHERE member_id = 'member_green_daniel' AND fund_code = 'welfare';

-- Development Loan (loan_green_0001) after four extra 300,000 repayments (2,150,000 -> 950,000).
UPDATE loans SET balance = 950000 WHERE id = 'loan_green_0001';

-- 2) Seed more members for Green Valley SACCO (password is Member@12345, same hash/salt as the
--    demo members). Spread across the two branches with varied balances.

INSERT INTO members (
    id, tenant_id, branch_id, membership_no, full_name, member_type, phone, email, national_id,
    password_hash, password_salt, status, kyc_status, joining_date,
    savings_balance, shares_balance, welfare_balance
) VALUES
    ('member_green_sarah',  'tenant_green', 'branch_green_main',  'GVS-0003', 'Sarah Namuli',   'individual', '+256700000101', 'sarah@example.local',       'CM9000003K3AA', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified',             DATE '2024-05-10',  480000, 120000, 40000),
    ('member_green_john',   'tenant_green', 'branch_green_seeta', 'GVS-0004', 'John Okello',    'individual', '+256700000102', 'john.okello@example.local', 'CM9000004K3AB', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified',             DATE '2024-06-15',  260000,  60000, 20000),
    ('member_green_grace',  'tenant_green', 'branch_green_main',  'GVS-0005', 'Grace Achieng',  'individual', '+256700000103', 'grace@example.local',       'CM9000005K3AC', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified',             DATE '2024-07-01', 1350000, 300000, 75000),
    ('member_green_moses',  'tenant_green', 'branch_green_seeta', 'GVS-0006', 'Moses Kato',     'individual', '+256700000104', 'moses@example.local',       'CM9000006K3AD', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'pending_verification', DATE '2024-08-20',   90000,  25000, 10000),
    ('member_green_esther', 'tenant_green', 'branch_green_main',  'GVS-0007', 'Esther Nabirye', 'individual', '+256700000105', 'esther@example.local',      'CM9000007K3AE', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified',             DATE '2024-09-05',  720000, 180000, 55000),
    ('member_green_peter',  'tenant_green', 'branch_green_seeta', 'GVS-0008', 'Peter Wanyama',  'individual', '+256700000106', 'peter.w@example.local',     'CM9000008K3AF', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified',             DATE '2024-10-12',  305000,  90000, 30000);

-- Mirror the base funds into the per-fund ledger for the new members.
INSERT INTO member_fund_balances (id, tenant_id, member_id, fund_code, balance)
SELECT 'mfb_' || m.id || '_savings', m.tenant_id, m.id, 'savings', m.savings_balance
    FROM members m WHERE m.id IN ('member_green_sarah','member_green_john','member_green_grace','member_green_moses','member_green_esther','member_green_peter')
UNION ALL
SELECT 'mfb_' || m.id || '_shares', m.tenant_id, m.id, 'shares', m.shares_balance
    FROM members m WHERE m.id IN ('member_green_sarah','member_green_john','member_green_grace','member_green_moses','member_green_esther','member_green_peter')
UNION ALL
SELECT 'mfb_' || m.id || '_welfare', m.tenant_id, m.id, 'welfare', m.welfare_balance
    FROM members m WHERE m.id IN ('member_green_sarah','member_green_john','member_green_grace','member_green_moses','member_green_esther','member_green_peter');
