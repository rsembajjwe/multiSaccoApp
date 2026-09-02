-- Additional Green Valley SACCO demo cases for loan/guarantor review:
-- 1) Members with loan obligations greater than their own savings.
-- 2) Accepted and pending guarantor workflows.
-- 3) A self-secured loan where available savings cover principal + interest/charges, so no guarantor is required.

INSERT INTO members (
    id, tenant_id, branch_id, membership_no, full_name, member_type, phone, email, national_id,
    password_hash, password_salt, status, kyc_status, joining_date,
    savings_balance, shares_balance, welfare_balance, savings_hold
) VALUES
    ('member_green_rose',    'tenant_green', 'branch_green_main',  'GREE-0009', 'Rose Namugga',    'individual', '+256700000107', 'rose.namugga@example.local',    'CM9000009K3AG', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2025-01-16',  180000,  40000, 10000,       0),
    ('member_green_paul',    'tenant_green', 'branch_green_seeta', 'GREE-0010', 'Paul Kiggundu',   'individual', '+256700000108', 'paul.kiggundu@example.local',   'CM9000010K3AH', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2025-02-03',  250000,  70000, 25000,       0),
    ('member_green_harriet', 'tenant_green', 'branch_green_main',  'GREE-0011', 'Harriet Mbabazi', 'individual', '+256700000109', 'harriet.mbabazi@example.local', 'CM9000011K3AJ', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2025-02-24', 1800000, 350000, 80000, 1296000),
    ('member_green_joseph',  'tenant_green', 'branch_green_seeta', 'GREE-0012', 'Joseph Lutaaya',  'individual', '+256700000110', 'joseph.lutaaya@example.local',  'CM9000012K3AK', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2025-03-11',   95000,  20000,  5000,       0);

INSERT INTO member_fund_balances (id, tenant_id, member_id, fund_code, balance)
SELECT 'mfb_' || m.id || '_savings', m.tenant_id, m.id, 'savings', m.savings_balance
    FROM members m WHERE m.id IN ('member_green_rose','member_green_paul','member_green_harriet','member_green_joseph')
UNION ALL
SELECT 'mfb_' || m.id || '_shares', m.tenant_id, m.id, 'shares', m.shares_balance
    FROM members m WHERE m.id IN ('member_green_rose','member_green_paul','member_green_harriet','member_green_joseph')
UNION ALL
SELECT 'mfb_' || m.id || '_welfare', m.tenant_id, m.id, 'welfare', m.welfare_balance
    FROM members m WHERE m.id IN ('member_green_rose','member_green_paul','member_green_harriet','member_green_joseph');

INSERT INTO financial_transactions (
    id, tenant_id, branch_id, member_id, type, channel, amount, status, reference, narration,
    maker_user_id, checker_user_id, posted_at
) VALUES
    ('txn_green_seed_2001', 'tenant_green', 'branch_green_main',  'member_green_rose',    'savings_deposit',      'cash', 180000,  'posted', 'GREE-TX-2001', 'Opening savings for loan guarantee demo', 'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-10 09:00:00+00'),
    ('txn_green_seed_2002', 'tenant_green', 'branch_green_main',  'member_green_rose',    'share_purchase',       'cash',  40000,  'posted', 'GREE-TX-2002', 'Opening shares',                          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-10 09:05:00+00'),
    ('txn_green_seed_2003', 'tenant_green', 'branch_green_main',  'member_green_rose',    'welfare_contribution', 'cash',  10000,  'posted', 'GREE-TX-2003', 'Opening welfare',                         'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-10 09:10:00+00'),
    ('txn_green_seed_2004', 'tenant_green', 'branch_green_seeta', 'member_green_paul',    'savings_deposit',      'bank', 250000,  'posted', 'GREE-TX-2004', 'Opening savings for loan review demo',    'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-11 09:00:00+00'),
    ('txn_green_seed_2005', 'tenant_green', 'branch_green_seeta', 'member_green_paul',    'share_purchase',       'bank',  70000,  'posted', 'GREE-TX-2005', 'Opening shares',                          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-11 09:05:00+00'),
    ('txn_green_seed_2006', 'tenant_green', 'branch_green_seeta', 'member_green_paul',    'welfare_contribution', 'bank',  25000,  'posted', 'GREE-TX-2006', 'Opening welfare',                         'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-11 09:10:00+00'),
    ('txn_green_seed_2007', 'tenant_green', 'branch_green_main',  'member_green_harriet', 'savings_deposit',      'bank', 1800000, 'posted', 'GREE-TX-2007', 'Opening savings for self-secured loan',   'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-12 09:00:00+00'),
    ('txn_green_seed_2008', 'tenant_green', 'branch_green_main',  'member_green_harriet', 'share_purchase',       'bank',  350000, 'posted', 'GREE-TX-2008', 'Opening shares',                          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-12 09:05:00+00'),
    ('txn_green_seed_2009', 'tenant_green', 'branch_green_main',  'member_green_harriet', 'welfare_contribution', 'bank',   80000, 'posted', 'GREE-TX-2009', 'Opening welfare',                         'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-12 09:10:00+00'),
    ('txn_green_seed_2010', 'tenant_green', 'branch_green_seeta', 'member_green_joseph',  'savings_deposit',      'cash',  95000,  'posted', 'GREE-TX-2010', 'Opening savings',                         'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-13 09:00:00+00'),
    ('txn_green_seed_2011', 'tenant_green', 'branch_green_seeta', 'member_green_joseph',  'share_purchase',       'cash',  20000,  'posted', 'GREE-TX-2011', 'Opening shares',                          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-13 09:05:00+00'),
    ('txn_green_seed_2012', 'tenant_green', 'branch_green_seeta', 'member_green_joseph',  'welfare_contribution', 'cash',   5000,  'posted', 'GREE-TX-2012', 'Opening welfare',                         'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-01-13 09:10:00+00');

INSERT INTO loans (
    id, tenant_id, member_id, product, amount, balance, status, stage, guarantors, dsr,
    repayment_months, purpose, channel, approved_by_user_id, approved_at,
    disbursed_by_user_id, disbursed_at, interest_rate, interest_amount, total_payable,
    monthly_installment, secured_hold_amount
) VALUES
    ('loan_green_0003', 'tenant_green', 'member_green_rose',    'Development Loan', 1500000, 1470000, 'active',       'Disbursed',        2, 65, 12, 'Retail shop stock purchase',       'staff', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-02-01 09:30:00+00', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-02-01 10:00:00+00', 1.5000, 270000, 1770000, 147500,       0),
    ('loan_green_0004', 'tenant_green', 'member_green_paul',    'Agriculture Loan', 2000000, 2250000, 'submitted',    'Guarantor Review', 0, 65, 10, 'Irrigation pump and seedlings',   'staff', NULL,               NULL,                                      NULL,               NULL,                                      1.2500, 250000, 2250000, 225000,       0),
    ('loan_green_0005', 'tenant_green', 'member_green_harriet', 'School Fees Loan', 1200000, 1296000, 'active',       'Disbursed',        0, 23,  8, 'School fees self-secured loan',   'staff', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-03-01 09:30:00+00', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-03-01 10:00:00+00', 1.0000,  96000, 1296000, 162000, 1296000);

INSERT INTO loan_guarantors (
    id, tenant_id, loan_id, member_id, guaranteed_amount, status, requested_by_user_id, decided_at
) VALUES
    ('guarantor_green_0002', 'tenant_green', 'loan_green_0003', 'member_green_grace',  1500000, 'accepted', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-02-01 09:40:00+00'),
    ('guarantor_green_0003', 'tenant_green', 'loan_green_0003', 'member_green_esther', 1500000, 'accepted', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-02-01 09:45:00+00'),
    ('guarantor_green_0004', 'tenant_green', 'loan_green_0004', 'member_green_sarah',  2000000, 'pending',  'user_green_admin', NULL),
    ('guarantor_green_0005', 'tenant_green', 'loan_green_0004', 'member_green_daniel', 2000000, 'pending',  'user_green_admin', NULL);

INSERT INTO loan_repayments (
    id, tenant_id, loan_id, member_id, amount, channel, reference, narration,
    received_by_user_id, status, approved_by_user_id, approved_at, received_at
) VALUES
    ('repayment_green_0006', 'tenant_green', 'loan_green_0003', 'member_green_rose', 300000, 'cash', 'LR-GREE-0003-001', 'Opening repayment on guaranteed loan', 'user_green_admin', 'posted', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-04-15 10:05:00+00', TIMESTAMP WITH TIME ZONE '2026-04-15 10:00:00+00');

INSERT INTO loan_repayment_schedules (
    id, tenant_id, loan_id, installment_no, due_date, principal_due, interest_due, total_due
) VALUES
    ('schedule_green_0003_01', 'tenant_green', 'loan_green_0003', 1, DATE '2026-03-01', 125000, 22500, 147500),
    ('schedule_green_0003_02', 'tenant_green', 'loan_green_0003', 2, DATE '2026-04-01', 125000, 22500, 147500),
    ('schedule_green_0004_01', 'tenant_green', 'loan_green_0004', 1, DATE '2026-04-10', 200000, 25000, 225000),
    ('schedule_green_0005_01', 'tenant_green', 'loan_green_0005', 1, DATE '2026-04-01', 150000, 12000, 162000);
