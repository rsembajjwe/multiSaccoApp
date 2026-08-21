-- Seed default loan products so SACCOs (and their members) have loan options
-- available in the loan-application dropdown out of the box. Idempotent:
-- only inserts when the tenant has no loan-type product yet.

INSERT INTO financial_products (
    id, tenant_id, product_type, code, name,
    contribution_amount, minimum_balance, interest_rate, status,
    created_by_user_id, created_at, updated_at
)
SELECT
    'product_green_loan_development', 'tenant_green', 'loan', 'GVS-LN-DEV', 'Development Loan',
    0.00, 0.00, 12.0000, 'active',
    'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 08:15:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 08:15:00+00'
WHERE NOT EXISTS (
    SELECT 1 FROM financial_products WHERE tenant_id = 'tenant_green' AND product_type = 'loan'
);

INSERT INTO financial_products (
    id, tenant_id, product_type, code, name,
    contribution_amount, minimum_balance, interest_rate, status,
    created_by_user_id, created_at, updated_at
)
SELECT
    'product_green_loan_emergency', 'tenant_green', 'loan', 'GVS-LN-EMG', 'Emergency Loan',
    0.00, 0.00, 10.0000, 'active',
    'user_green_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 08:16:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 08:16:00+00'
WHERE NOT EXISTS (
    SELECT 1 FROM financial_products
    WHERE tenant_id = 'tenant_green' AND product_type = 'loan' AND code = 'GVS-LN-EMG'
);

INSERT INTO financial_products (
    id, tenant_id, product_type, code, name,
    contribution_amount, minimum_balance, interest_rate, status,
    created_by_user_id, created_at, updated_at
)
SELECT
    'product_lake_loan_development', 'tenant_lake', 'loan', 'LFS-LN-DEV', 'Development Loan',
    0.00, 0.00, 12.0000, 'active',
    'user_platform_admin', TIMESTAMP WITH TIME ZONE '2026-07-01 08:15:00+00', TIMESTAMP WITH TIME ZONE '2026-07-01 08:15:00+00'
WHERE NOT EXISTS (
    SELECT 1 FROM financial_products WHERE tenant_id = 'tenant_lake' AND product_type = 'loan'
);
