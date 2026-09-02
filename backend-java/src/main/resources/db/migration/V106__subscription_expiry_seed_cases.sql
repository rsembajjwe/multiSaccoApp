-- Demo SACCO subscription lifecycle cases for platform dashboard renewal monitoring.
-- These rows make the renewal watchlist and Jan-Dec subscription chart visible with
-- expired, near-expiry, partially-paid and healthy subscriptions.

INSERT INTO tenants (
    id,
    name,
    abbreviation,
    status,
    registration_no,
    district,
    license_expiry,
    package_id,
    onboarding_percent,
    created_at,
    updated_at
) VALUES
    ('tenant_kigezi', 'Kabale Traders SACCO', 'KABA', 'suspended', 'COOP/KABA/2026/031', 'Kabale', DATE '2026-10-30', 'starter', 66, TIMESTAMP WITH TIME ZONE '2026-01-12 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-01-12 08:00:00+00'),
    ('tenant_masaka', 'Masaka Market SACCO', 'MASA', 'active', 'COOP/MASA/2026/044', 'Masaka', DATE '2026-09-30', 'starter', 81, TIMESTAMP WITH TIME ZONE '2026-02-18 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-02-18 08:00:00+00'),
    ('tenant_gulu', 'Gulu Teachers SACCO', 'GULU', 'active', 'COOP/GULU/2026/052', 'Gulu', DATE '2026-11-30', 'growth', 74, TIMESTAMP WITH TIME ZONE '2026-03-21 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-03-21 08:00:00+00'),
    ('tenant_mbale', 'Mbale Women SACCO', 'MBAL', 'active', 'COOP/MBAL/2026/066', 'Mbale', DATE '2026-12-31', 'growth', 88, TIMESTAMP WITH TIME ZONE '2026-04-09 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-04-09 08:00:00+00'),
    ('tenant_hoima', 'Hoima Oil Workers SACCO', 'HOIM', 'active', 'COOP/HOIM/2026/075', 'Hoima', DATE '2027-05-31', 'enterprise', 93, TIMESTAMP WITH TIME ZONE '2026-05-16 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-05-16 08:00:00+00');

INSERT INTO sacco_profiles (
    id,
    tenant_id,
    legal_name,
    tin,
    umra_license_no,
    cooperative_registration_no,
    address,
    email,
    phone,
    website,
    created_at,
    updated_at
) VALUES
    ('profile_kigezi', 'tenant_kigezi', 'Kabale Traders Savings and Credit Cooperative Society Limited', '1009001001', 'UMRA/KABA/2026/031', 'COOP/KABA/2026/031', 'Kabale Main Street', 'info@kabaletraders.example.local', '+256704222001', '', TIMESTAMP WITH TIME ZONE '2026-01-12 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-01-12 08:00:00+00'),
    ('profile_masaka', 'tenant_masaka', 'Masaka Market Savings and Credit Cooperative Society Limited', '1009001002', 'UMRA/MASA/2026/044', 'COOP/MASA/2026/044', 'Masaka Central Market', 'info@masakamarket.example.local', '+256704222002', '', TIMESTAMP WITH TIME ZONE '2026-02-18 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-02-18 08:00:00+00'),
    ('profile_gulu', 'tenant_gulu', 'Gulu Teachers Savings and Credit Cooperative Society Limited', '1009001003', 'UMRA/GULU/2026/052', 'COOP/GULU/2026/052', 'Gulu Education Centre', 'info@guluteachers.example.local', '+256704222003', '', TIMESTAMP WITH TIME ZONE '2026-03-21 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-03-21 08:00:00+00'),
    ('profile_mbale', 'tenant_mbale', 'Mbale Women Savings and Credit Cooperative Society Limited', '1009001004', 'UMRA/MBAL/2026/066', 'COOP/MBAL/2026/066', 'Republic Street, Mbale', 'info@mbalewomen.example.local', '+256704222004', '', TIMESTAMP WITH TIME ZONE '2026-04-09 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-04-09 08:00:00+00'),
    ('profile_hoima', 'tenant_hoima', 'Hoima Oil Workers Savings and Credit Cooperative Society Limited', '1009001005', 'UMRA/HOIM/2026/075', 'COOP/HOIM/2026/075', 'Hoima Industrial Road', 'info@hoimaworkers.example.local', '+256704222005', '', TIMESTAMP WITH TIME ZONE '2026-05-16 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-05-16 08:00:00+00');

INSERT INTO subscriptions (
    id,
    tenant_id,
    package_id,
    status,
    invoice,
    amount,
    paid,
    member_count,
    billable_members,
    unit_price,
    tier_id,
    tier_label,
    billing_description,
    expiry,
    created_at,
    updated_at
) VALUES
    ('subscription_kigezi_starter', 'tenant_kigezi', 'starter', 'expired', 'INV-2026-003', 690000.00, 690000.00, 138, 138, 5000.00, 'per_member', '100-250 members', 'UGX 5,000 per member annually, minimum 100 members', DATE '2026-06-30', TIMESTAMP WITH TIME ZONE '2026-01-12 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-01-12 08:00:00+00'),
    ('subscription_masaka_starter', 'tenant_masaka', 'starter', 'active', 'INV-2026-004', 1050000.00, 1050000.00, 210, 210, 5000.00, 'per_member', '100-250 members', 'UGX 5,000 per member annually, minimum 100 members', DATE '2026-08-31', TIMESTAMP WITH TIME ZONE '2026-02-18 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-02-18 08:00:00+00'),
    ('subscription_gulu_growth', 'tenant_gulu', 'growth', 'active', 'INV-2026-005', 3600000.00, 2600000.00, 680, 680, NULL, 'growth_fixed', '501-2,500 members', 'Fixed annual tier for 501-2,500 members', DATE '2026-09-20', TIMESTAMP WITH TIME ZONE '2026-03-21 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-03-21 08:00:00+00'),
    ('subscription_mbale_growth', 'tenant_mbale', 'growth', 'active', 'INV-2026-006', 3600000.00, 3600000.00, 920, 920, NULL, 'growth_fixed', '501-2,500 members', 'Fixed annual tier for 501-2,500 members', DATE '2026-11-15', TIMESTAMP WITH TIME ZONE '2026-04-09 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-04-09 08:00:00+00'),
    ('subscription_hoima_enterprise', 'tenant_hoima', 'enterprise', 'active', 'INV-2026-007', 9000000.00, 9000000.00, 4200, 4200, NULL, 'enterprise_fixed', '2,501-10,000 members', 'Fixed annual tier for 2,501-10,000 members', DATE '2027-04-30', TIMESTAMP WITH TIME ZONE '2026-05-16 08:00:00+00', TIMESTAMP WITH TIME ZONE '2026-05-16 08:00:00+00');
