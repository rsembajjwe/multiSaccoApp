-- ============================================================================
-- Scale test data seeder — Tereka Online
-- ----------------------------------------------------------------------------
-- Generates representative volume (tenants -> branches -> members -> posted
-- financial transactions -> fund balances) so `npm run load:scale` hits realistic
-- table sizes. PostgreSQL only (uses generate_series / interval); run against a
-- STAGING database, never production.
--
-- Every row id is prefixed `scale_` (and `mfb_scale_`) so the whole data set is
-- removable with the CLEANUP block at the bottom.
--
-- Usage (defaults: 1,000 tenants x 300 members x 20 txns = 300k members, 6M txns):
--   psql "$DATABASE_URL" -f scripts/seed-scale-data.sql
-- Tune volume (validate small first, then scale up):
--   psql "$DATABASE_URL" -v num_tenants=100 -v members_per_tenant=100 -v txns_per_member=10 -f scripts/seed-scale-data.sql
-- ============================================================================

\set ON_ERROR_STOP on
\if :{?num_tenants}
\else
  \set num_tenants 1000
\endif
\if :{?members_per_tenant}
\else
  \set members_per_tenant 300
\endif
\if :{?txns_per_member}
\else
  \set txns_per_member 20
\endif

\echo Seeding :num_tenants tenants x :members_per_tenant members x :txns_per_member transactions ...

BEGIN;

-- 1) Tenants
INSERT INTO tenants (id, name, abbreviation, status, registration_no, district, license_expiry, package_id, onboarding_percent)
SELECT 'scale_tenant_' || g, 'Scale SACCO ' || g, 'SC' || g, 'active', 'REG-SCALE-' || g, 'Kampala', DATE '2027-12-31', 'starter', 100
FROM generate_series(1, :num_tenants) AS g;

-- 2) One branch per tenant
INSERT INTO branches (id, tenant_id, code, name, status)
SELECT 'scale_branch_' || g, 'scale_tenant_' || g, 'MAIN', 'Main Branch', 'active'
FROM generate_series(1, :num_tenants) AS g;

-- 3) The three built-in fund types per tenant (so fund/product reads stay consistent)
INSERT INTO sacco_fund_types (id, tenant_id, code, name, basis, is_system, active, display_order, created_by_user_id)
SELECT 'fundtype_scale_tenant_' || g || '_' || f.code, 'scale_tenant_' || g, f.code, f.name, f.code, TRUE, TRUE, f.ord, 'user_platform_admin'
FROM generate_series(1, :num_tenants) AS g
CROSS JOIN (VALUES ('savings','Savings',1), ('shares','Shares',2), ('welfare','Welfare',3)) AS f(code, name, ord);

-- 4) Members
INSERT INTO members (id, tenant_id, branch_id, membership_no, full_name, member_type, phone,
                     password_hash, password_salt, status, kyc_status, joining_date,
                     savings_balance, shares_balance, welfare_balance)
SELECT 'scale_mem_' || t || '_' || m,
       'scale_tenant_' || t,
       'scale_branch_' || t,
       'SC' || t || '-' || lpad(m::text, 5, '0'),
       'Member ' || t || '-' || m,
       'individual',
       '+2567' || lpad(((t * 1000 + m) % 100000000)::text, 8, '0'),
       'scale-seed-hash', 'scale-seed-salt',
       'active', 'verified',
       DATE '2025-01-01',
       round((random() * 1000000)::numeric, 2),
       round((random() * 200000)::numeric, 2),
       round((random() * 50000)::numeric, 2)
FROM generate_series(1, :num_tenants) AS t
CROSS JOIN generate_series(1, :members_per_tenant) AS m;

-- 5) Posted financial transactions (the hot, high-volume table)
INSERT INTO financial_transactions (id, tenant_id, branch_id, member_id, type, channel, amount, status, reference,
                                    maker_user_id, checker_user_id, posted_at)
SELECT 'scale_txn_' || t || '_' || m || '_' || k,
       'scale_tenant_' || t,
       'scale_branch_' || t,
       'scale_mem_' || t || '_' || m,
       'savings_deposit', 'cash',
       round((random() * 100000 + 1000)::numeric, 2),
       'posted',
       'SC' || t || '-TX-' || m || '-' || k,
       'user_platform_admin', 'user_platform_admin',
       now() - ((floor(random() * 365))::text || ' days')::interval
FROM generate_series(1, :num_tenants) AS t
CROSS JOIN generate_series(1, :members_per_tenant) AS m
CROSS JOIN generate_series(1, :txns_per_member) AS k;

-- 6) Per-fund balance ledger for the seeded members (base funds)
INSERT INTO member_fund_balances (id, tenant_id, member_id, fund_code, balance)
SELECT 'mfb_' || id || '_savings', tenant_id, id, 'savings', savings_balance FROM members WHERE id LIKE 'scale_mem_%'
UNION ALL
SELECT 'mfb_' || id || '_shares', tenant_id, id, 'shares', shares_balance FROM members WHERE id LIKE 'scale_mem_%'
UNION ALL
SELECT 'mfb_' || id || '_welfare', tenant_id, id, 'welfare', welfare_balance FROM members WHERE id LIKE 'scale_mem_%';

COMMIT;

-- Refresh planner statistics so query plans reflect the new volume before load testing.
ANALYZE tenants;
ANALYZE branches;
ANALYZE members;
ANALYZE financial_transactions;
ANALYZE member_fund_balances;
ANALYZE sacco_fund_types;

\echo Done. Run `npm run load:scale` against this database, then inspect pg_stat_statements.

-- ============================================================================
-- CLEANUP (run to remove everything this script created; delete in FK order):
-- ============================================================================
-- BEGIN;
-- DELETE FROM member_fund_balances WHERE member_id LIKE 'scale_mem_%';
-- DELETE FROM financial_transactions WHERE tenant_id LIKE 'scale_tenant_%';
-- DELETE FROM members WHERE tenant_id LIKE 'scale_tenant_%';
-- DELETE FROM sacco_fund_types WHERE tenant_id LIKE 'scale_tenant_%';
-- DELETE FROM branches WHERE tenant_id LIKE 'scale_tenant_%';
-- DELETE FROM tenants WHERE id LIKE 'scale_tenant_%';
-- COMMIT;
