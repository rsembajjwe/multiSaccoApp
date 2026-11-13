-- The regional demo SACCOs seeded in V106 (Kabale/Masaka/Gulu/Mbale/Hoima) were created as subscription
-- billing-state fixtures with no members, so V139 could not assign their officials. Give each three members
-- and pin their chairperson, secretary and treasurer so the SACCO officials panel opens fully populated,
-- matching the behaviour of Green Valley. Column set mirrors V82; columns added later carry defaults.
INSERT INTO members (
    id, tenant_id, branch_id, membership_no, full_name, member_type, phone, email, national_id,
    password_hash, password_salt, status, kyc_status, joining_date,
    savings_balance, shares_balance, welfare_balance
) VALUES
    ('member_kaba_chair', 'tenant_kigezi', 'branch_default_tenant_kigezi', 'KABA-0001', 'Robert Ssentongo',  'individual', '+256705000001', 'robert.ssentongo@example.local', 'CM91KABA0001', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-01-15', 420000, 110000, 35000),
    ('member_kaba_sec',   'tenant_kigezi', 'branch_default_tenant_kigezi', 'KABA-0002', 'Janet Kembabazi',   'individual', '+256705000002', 'janet.kembabazi@example.local',  'CM91KABA0002', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-01-18', 260000, 70000, 20000),
    ('member_kaba_treas', 'tenant_kigezi', 'branch_default_tenant_kigezi', 'KABA-0003', 'Patrick Tumusiime', 'individual', '+256705000003', 'patrick.tumusiime@example.local','CM91KABA0003', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-01-20', 610000, 150000, 45000),

    ('member_masa_chair', 'tenant_masaka', 'branch_default_tenant_masaka', 'MASA-0001', 'David Ssekitto',    'individual', '+256705000011', 'david.ssekitto@example.local',   'CM91MASA0001', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-02-20', 380000, 95000, 30000),
    ('member_masa_sec',   'tenant_masaka', 'branch_default_tenant_masaka', 'MASA-0002', 'Betty Nakato',      'individual', '+256705000012', 'betty.nakato@example.local',     'CM91MASA0002', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-02-22', 240000, 60000, 18000),
    ('member_masa_treas', 'tenant_masaka', 'branch_default_tenant_masaka', 'MASA-0003', 'Ronald Lubega',     'individual', '+256705000013', 'ronald.lubega@example.local',    'CM91MASA0003', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-02-25', 720000, 175000, 52000),

    ('member_gulu_chair', 'tenant_gulu', 'branch_default_tenant_gulu', 'GULU-0001', 'Denis Ocen',        'individual', '+256705000021', 'denis.ocen@example.local',       'CM91GULU0001', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-03-22', 450000, 120000, 38000),
    ('member_gulu_sec',   'tenant_gulu', 'branch_default_tenant_gulu', 'GULU-0002', 'Christine Aber',    'individual', '+256705000022', 'christine.aber@example.local',   'CM91GULU0002', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-03-24', 300000, 80000, 25000),
    ('member_gulu_treas', 'tenant_gulu', 'branch_default_tenant_gulu', 'GULU-0003', 'Samuel Komakech',   'individual', '+256705000023', 'samuel.komakech@example.local',  'CM91GULU0003', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-03-26', 880000, 210000, 60000),

    ('member_mbal_chair', 'tenant_mbale', 'branch_default_tenant_mbale', 'MBAL-0001', 'Florence Nabwire',  'individual', '+256705000031', 'florence.nabwire@example.local', 'CM91MBAL0001', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-04-10', 410000, 105000, 33000),
    ('member_mbal_sec',   'tenant_mbale', 'branch_default_tenant_mbale', 'MBAL-0002', 'Isaac Wanyama',     'individual', '+256705000032', 'isaac.wanyama@example.local',    'CM91MBAL0002', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-04-12', 275000, 68000, 21000),
    ('member_mbal_treas', 'tenant_mbale', 'branch_default_tenant_mbale', 'MBAL-0003', 'Agnes Namataka',    'individual', '+256705000033', 'agnes.namataka@example.local',   'CM91MBAL0003', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-04-14', 640000, 160000, 48000),

    ('member_hoim_chair', 'tenant_hoima', 'branch_default_tenant_hoima', 'HOIM-0001', 'George Byaruhanga', 'individual', '+256705000041', 'george.byaruhanga@example.local','CM91HOIM0001', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-05-16', 520000, 130000, 40000),
    ('member_hoim_sec',   'tenant_hoima', 'branch_default_tenant_hoima', 'HOIM-0002', 'Prossy Kabahweza',  'individual', '+256705000042', 'prossy.kabahweza@example.local', 'CM91HOIM0002', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-05-18', 330000, 85000, 26000),
    ('member_hoim_treas', 'tenant_hoima', 'branch_default_tenant_hoima', 'HOIM-0003', 'Julius Katusiime',  'individual', '+256705000043', 'julius.katusiime@example.local', 'CM91HOIM0003', '89def4a688018e9e421fac43bf3af66d63fff4a953279a1a37518f888c7c1ea9', 'member_seed_salt_2026', 'active', 'verified', DATE '2026-05-20', 910000, 220000, 65000);

-- Mirror base fund balances into the per-fund ledger, matching how V82 seeds members.
INSERT INTO member_fund_balances (id, tenant_id, member_id, fund_code, balance)
SELECT 'mfb_' || m.id || '_savings', m.tenant_id, m.id, 'savings', m.savings_balance
    FROM members m WHERE m.tenant_id IN ('tenant_kigezi','tenant_masaka','tenant_gulu','tenant_mbale','tenant_hoima')
UNION ALL
SELECT 'mfb_' || m.id || '_shares', m.tenant_id, m.id, 'shares', m.shares_balance
    FROM members m WHERE m.tenant_id IN ('tenant_kigezi','tenant_masaka','tenant_gulu','tenant_mbale','tenant_hoima')
UNION ALL
SELECT 'mfb_' || m.id || '_welfare', m.tenant_id, m.id, 'welfare', m.welfare_balance
    FROM members m WHERE m.tenant_id IN ('tenant_kigezi','tenant_masaka','tenant_gulu','tenant_mbale','tenant_hoima');

-- Assign the three offices for each SACCO so the officials panel opens fully populated.
INSERT INTO sacco_official_assignments (id, tenant_id, office, member_id, assigned_by_user_id) VALUES
    ('official_v142_tenant_kigezi_chairperson', 'tenant_kigezi', 'chairperson', 'member_kaba_chair', NULL),
    ('official_v142_tenant_kigezi_secretary',   'tenant_kigezi', 'secretary',   'member_kaba_sec',   NULL),
    ('official_v142_tenant_kigezi_treasurer',   'tenant_kigezi', 'treasurer',   'member_kaba_treas', NULL),
    ('official_v142_tenant_masaka_chairperson', 'tenant_masaka', 'chairperson', 'member_masa_chair', NULL),
    ('official_v142_tenant_masaka_secretary',   'tenant_masaka', 'secretary',   'member_masa_sec',   NULL),
    ('official_v142_tenant_masaka_treasurer',   'tenant_masaka', 'treasurer',   'member_masa_treas', NULL),
    ('official_v142_tenant_gulu_chairperson',   'tenant_gulu',   'chairperson', 'member_gulu_chair', NULL),
    ('official_v142_tenant_gulu_secretary',     'tenant_gulu',   'secretary',   'member_gulu_sec',   NULL),
    ('official_v142_tenant_gulu_treasurer',     'tenant_gulu',   'treasurer',   'member_gulu_treas', NULL),
    ('official_v142_tenant_mbale_chairperson',  'tenant_mbale',  'chairperson', 'member_mbal_chair', NULL),
    ('official_v142_tenant_mbale_secretary',    'tenant_mbale',  'secretary',   'member_mbal_sec',   NULL),
    ('official_v142_tenant_mbale_treasurer',    'tenant_mbale',  'treasurer',   'member_mbal_treas', NULL),
    ('official_v142_tenant_hoima_chairperson',  'tenant_hoima',  'chairperson', 'member_hoim_chair', NULL),
    ('official_v142_tenant_hoima_secretary',    'tenant_hoima',  'secretary',   'member_hoim_sec',   NULL),
    ('official_v142_tenant_hoima_treasurer',    'tenant_hoima',  'treasurer',   'member_hoim_treas', NULL);
