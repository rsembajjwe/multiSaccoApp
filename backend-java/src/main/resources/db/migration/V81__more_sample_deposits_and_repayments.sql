-- Additional demo data: posted deposits across every fund source (savings, shares,
-- welfare) and every channel (cash, mobile money, bank), spread over several months,
-- plus more loan repayments. This enriches the member statement, the per-fund
-- drill-down, the month/method filters and the loan repayment history for demos.

INSERT INTO financial_transactions (
    id, tenant_id, branch_id, member_id, type, channel, amount, status, reference, narration,
    maker_user_id, checker_user_id, posted_at
) VALUES
    -- Amina — savings across channels and months
    ('txn_green_1001', 'tenant_green', 'branch_green_main', 'member_green_amina', 'savings_deposit', 'cash',         120000, 'posted', 'GVS-TX-1001', 'Monthly savings (Treasurer cash)',      'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-05-06 09:30:00+00'),
    ('txn_green_1002', 'tenant_green', 'branch_green_main', 'member_green_amina', 'savings_deposit', 'mobile_money', 150000, 'posted', 'GVS-TX-1002', 'Mobile money savings deposit',          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-06-04 14:10:00+00'),
    ('txn_green_1003', 'tenant_green', 'branch_green_main', 'member_green_amina', 'savings_deposit', 'bank',         200000, 'posted', 'GVS-TX-1003', 'Bank standing order savings',           'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-03 08:05:00+00'),
    ('txn_green_1004', 'tenant_green', 'branch_green_main', 'member_green_amina', 'savings_deposit', 'mobile_money', 180000, 'posted', 'GVS-TX-1004', 'Mobile money savings deposit',          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-08-05 16:40:00+00'),
    -- Amina — shares
    ('txn_green_1005', 'tenant_green', 'branch_green_main', 'member_green_amina', 'share_purchase',  'cash',          50000, 'posted', 'GVS-TX-1005', 'Share capital top-up',                  'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-05-20 10:15:00+00'),
    ('txn_green_1006', 'tenant_green', 'branch_green_main', 'member_green_amina', 'share_purchase',  'bank',         100000, 'posted', 'GVS-TX-1006', 'Share capital purchase (bank)',         'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-18 11:00:00+00'),
    -- Amina — welfare
    ('txn_green_1007', 'tenant_green', 'branch_green_main', 'member_green_amina', 'welfare_contribution', 'cash',     20000, 'posted', 'GVS-TX-1007', 'Welfare monthly contribution',          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-06-12 09:00:00+00'),
    ('txn_green_1008', 'tenant_green', 'branch_green_main', 'member_green_amina', 'welfare_contribution', 'mobile_money', 25000, 'posted', 'GVS-TX-1008', 'Welfare contribution (mobile money)', 'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-08-09 13:25:00+00'),
    -- Daniel — mixed deposits
    ('txn_green_1009', 'tenant_green', 'branch_green_seeta', 'member_green_daniel', 'savings_deposit', 'mobile_money', 90000, 'posted', 'GVS-TX-1009', 'Mobile money savings deposit',          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-06-22 15:45:00+00'),
    ('txn_green_1010', 'tenant_green', 'branch_green_seeta', 'member_green_daniel', 'welfare_contribution', 'cash',   15000, 'posted', 'GVS-TX-1010', 'Welfare monthly contribution',          'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-22 10:30:00+00'),
    ('txn_green_1011', 'tenant_green', 'branch_green_seeta', 'member_green_daniel', 'share_purchase',  'bank',        80000, 'posted', 'GVS-TX-1011', 'Share capital purchase (bank)',         'user_green_admin', 'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-08-14 12:05:00+00');

INSERT INTO loan_repayments (
    id, tenant_id, loan_id, member_id, amount, channel, reference, narration, received_by_user_id, received_at
) VALUES
    ('repayment_green_0002', 'tenant_green', 'loan_green_0001', 'member_green_amina', 300000, 'cash',         'LR-GVS-0001-002', 'Instalment 2 (Treasurer cash)',   'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-05-15 10:00:00+00'),
    ('repayment_green_0003', 'tenant_green', 'loan_green_0001', 'member_green_amina', 300000, 'mobile_money', 'LR-GVS-0001-003', 'Instalment 3 (mobile money)',     'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-06-15 09:20:00+00'),
    ('repayment_green_0004', 'tenant_green', 'loan_green_0001', 'member_green_amina', 300000, 'bank',         'LR-GVS-0001-004', 'Instalment 4 (bank transfer)',    'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-15 08:45:00+00'),
    ('repayment_green_0005', 'tenant_green', 'loan_green_0001', 'member_green_amina', 300000, 'mobile_money', 'LR-GVS-0001-005', 'Instalment 5 (mobile money)',     'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-08-15 17:10:00+00');
