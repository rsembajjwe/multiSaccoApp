-- Give the V142 regional-SACCO officials working staff logins with their office role (Chairperson,
-- Secretary, Treasurer), mirroring what "Grant staff access" does in the UI and the permission sets in
-- DefaultSaccoRoleProvisioningService. Each member is linked to their staff account so the officials panel
-- shows "Member and staff account linked". Demo password is Sacco@12345 (reused hash/salt).

-- 1. Office roles per SACCO (deterministic ids; names match the app's ensureOfficialRole output).
INSERT INTO roles (id, tenant_id, name, protected_role, created_by_user_id) VALUES
    ('role_kigezi_chairperson', 'tenant_kigezi', 'Chairperson', TRUE, 'user_platform_admin'),
    ('role_kigezi_secretary',   'tenant_kigezi', 'Secretary',   TRUE, 'user_platform_admin'),
    ('role_kigezi_treasurer',   'tenant_kigezi', 'Treasurer',   TRUE, 'user_platform_admin'),
    ('role_masaka_chairperson', 'tenant_masaka', 'Chairperson', TRUE, 'user_platform_admin'),
    ('role_masaka_secretary',   'tenant_masaka', 'Secretary',   TRUE, 'user_platform_admin'),
    ('role_masaka_treasurer',   'tenant_masaka', 'Treasurer',   TRUE, 'user_platform_admin'),
    ('role_gulu_chairperson',   'tenant_gulu',   'Chairperson', TRUE, 'user_platform_admin'),
    ('role_gulu_secretary',     'tenant_gulu',   'Secretary',   TRUE, 'user_platform_admin'),
    ('role_gulu_treasurer',     'tenant_gulu',   'Treasurer',   TRUE, 'user_platform_admin'),
    ('role_mbale_chairperson',  'tenant_mbale',  'Chairperson', TRUE, 'user_platform_admin'),
    ('role_mbale_secretary',    'tenant_mbale',  'Secretary',   TRUE, 'user_platform_admin'),
    ('role_mbale_treasurer',    'tenant_mbale',  'Treasurer',   TRUE, 'user_platform_admin'),
    ('role_hoima_chairperson',  'tenant_hoima',  'Chairperson', TRUE, 'user_platform_admin'),
    ('role_hoima_secretary',    'tenant_hoima',  'Secretary',   TRUE, 'user_platform_admin'),
    ('role_hoima_treasurer',    'tenant_hoima',  'Treasurer',   TRUE, 'user_platform_admin');

-- 2. Grant office permissions. CROSS JOIN the five office roles with only the permissions that exist,
--    so a missing permission can never break the migration.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.id
FROM (VALUES
    ('role_kigezi_chairperson'), ('role_masaka_chairperson'), ('role_gulu_chairperson'),
    ('role_mbale_chairperson'), ('role_hoima_chairperson')
) AS r(role_id)
CROSS JOIN permissions p
WHERE p.id IN (
    'dashboard:view', 'members:view', 'transactions:view', 'loans:view', 'loans:create', 'loans:approve',
    'reports:view', 'approvals:view', 'approvals:decide', 'operations:view', 'governance:view',
    'complaints:view', 'notifications:view', 'subscriptions:view', 'sacco-profile:manage',
    'finance-source:view', 'finance-source:manage', 'fund-types:view', 'fund-types:manage',
    'savings-transfer:view', 'savings-transfer:approve', 'welfare:approve'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.id
FROM (VALUES
    ('role_kigezi_secretary'), ('role_masaka_secretary'), ('role_gulu_secretary'),
    ('role_mbale_secretary'), ('role_hoima_secretary')
) AS r(role_id)
CROSS JOIN permissions p
WHERE p.id IN (
    'dashboard:view', 'members:view', 'members:create', 'members:approve', 'loans:create', 'reports:view',
    'approvals:view', 'governance:view', 'governance:manage', 'complaints:view', 'complaints:manage',
    'complaints:route', 'welfare:view', 'welfare:manage', 'member-subscription:view',
    'member-subscription:manage', 'savings-transfer:view', 'savings-transfer:approve', 'finance-source:view'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.id
FROM (VALUES
    ('role_kigezi_treasurer'), ('role_masaka_treasurer'), ('role_gulu_treasurer'),
    ('role_mbale_treasurer'), ('role_hoima_treasurer')
) AS r(role_id)
CROSS JOIN permissions p
WHERE p.id IN (
    'dashboard:view', 'transactions:view', 'transactions:create', 'transactions:approve', 'accounting:view',
    'accounting:post', 'reports:view', 'approvals:view', 'operations:view', 'loans:view', 'loans:create',
    'loans:disburse', 'finance-source:view', 'finance-source:manage', 'fund-types:view',
    'savings-transfer:view', 'savings-transfer:manage', 'savings-transfer:create', 'savings-transfer:approve',
    'welfare:view', 'member-subscription:view', 'member-subscription:manage'
);

-- 3. Staff user per official (password Sacco@12345 via reused demo hash/salt).
INSERT INTO users (id, tenant_id, full_name, email, phone, password_hash, password_salt, status) VALUES
    ('user_kigezi_chairperson', 'tenant_kigezi', 'Robert Ssentongo',  'chairperson.kaba@example.local', '+256705100001', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_kigezi_secretary',   'tenant_kigezi', 'Janet Kembabazi',   'secretary.kaba@example.local',   '+256705100002', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_kigezi_treasurer',   'tenant_kigezi', 'Patrick Tumusiime', 'treasurer.kaba@example.local',   '+256705100003', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_masaka_chairperson', 'tenant_masaka', 'David Ssekitto',    'chairperson.masa@example.local', '+256705100011', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_masaka_secretary',   'tenant_masaka', 'Betty Nakato',      'secretary.masa@example.local',   '+256705100012', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_masaka_treasurer',   'tenant_masaka', 'Ronald Lubega',     'treasurer.masa@example.local',   '+256705100013', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_gulu_chairperson',   'tenant_gulu',   'Denis Ocen',        'chairperson.gulu@example.local', '+256705100021', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_gulu_secretary',     'tenant_gulu',   'Christine Aber',    'secretary.gulu@example.local',   '+256705100022', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_gulu_treasurer',     'tenant_gulu',   'Samuel Komakech',   'treasurer.gulu@example.local',   '+256705100023', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_mbale_chairperson',  'tenant_mbale',  'Florence Nabwire',  'chairperson.mbal@example.local', '+256705100031', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_mbale_secretary',    'tenant_mbale',  'Isaac Wanyama',     'secretary.mbal@example.local',   '+256705100032', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_mbale_treasurer',    'tenant_mbale',  'Agnes Namataka',    'treasurer.mbal@example.local',   '+256705100033', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_hoima_chairperson',  'tenant_hoima',  'George Byaruhanga', 'chairperson.hoim@example.local', '+256705100041', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_hoima_secretary',    'tenant_hoima',  'Prossy Kabahweza',  'secretary.hoim@example.local',   '+256705100042', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active'),
    ('user_hoima_treasurer',    'tenant_hoima',  'Julius Katusiime',  'treasurer.hoim@example.local',   '+256705100043', '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2', 'green_admin_seed_salt_2026', 'active');

-- 4. Assign each staff user their office role.
INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
    ('user_kigezi_chairperson', 'role_kigezi_chairperson', 'tenant_kigezi'),
    ('user_kigezi_secretary',   'role_kigezi_secretary',   'tenant_kigezi'),
    ('user_kigezi_treasurer',   'role_kigezi_treasurer',   'tenant_kigezi'),
    ('user_masaka_chairperson', 'role_masaka_chairperson', 'tenant_masaka'),
    ('user_masaka_secretary',   'role_masaka_secretary',   'tenant_masaka'),
    ('user_masaka_treasurer',   'role_masaka_treasurer',   'tenant_masaka'),
    ('user_gulu_chairperson',   'role_gulu_chairperson',   'tenant_gulu'),
    ('user_gulu_secretary',     'role_gulu_secretary',     'tenant_gulu'),
    ('user_gulu_treasurer',     'role_gulu_treasurer',     'tenant_gulu'),
    ('user_mbale_chairperson',  'role_mbale_chairperson',  'tenant_mbale'),
    ('user_mbale_secretary',    'role_mbale_secretary',    'tenant_mbale'),
    ('user_mbale_treasurer',    'role_mbale_treasurer',    'tenant_mbale'),
    ('user_hoima_chairperson',  'role_hoima_chairperson',  'tenant_hoima'),
    ('user_hoima_secretary',    'role_hoima_secretary',    'tenant_hoima'),
    ('user_hoima_treasurer',    'role_hoima_treasurer',    'tenant_hoima');

-- 5. Link each official member to their staff account.
UPDATE members
SET linked_user_id = CASE id
    WHEN 'member_kaba_chair'  THEN 'user_kigezi_chairperson'
    WHEN 'member_kaba_sec'    THEN 'user_kigezi_secretary'
    WHEN 'member_kaba_treas'  THEN 'user_kigezi_treasurer'
    WHEN 'member_masa_chair'  THEN 'user_masaka_chairperson'
    WHEN 'member_masa_sec'    THEN 'user_masaka_secretary'
    WHEN 'member_masa_treas'  THEN 'user_masaka_treasurer'
    WHEN 'member_gulu_chair'  THEN 'user_gulu_chairperson'
    WHEN 'member_gulu_sec'    THEN 'user_gulu_secretary'
    WHEN 'member_gulu_treas'  THEN 'user_gulu_treasurer'
    WHEN 'member_mbal_chair'  THEN 'user_mbale_chairperson'
    WHEN 'member_mbal_sec'    THEN 'user_mbale_secretary'
    WHEN 'member_mbal_treas'  THEN 'user_mbale_treasurer'
    WHEN 'member_hoim_chair'  THEN 'user_hoima_chairperson'
    WHEN 'member_hoim_sec'    THEN 'user_hoima_secretary'
    WHEN 'member_hoim_treas'  THEN 'user_hoima_treasurer'
END,
updated_at = CURRENT_TIMESTAMP
WHERE id IN (
    'member_kaba_chair', 'member_kaba_sec', 'member_kaba_treas',
    'member_masa_chair', 'member_masa_sec', 'member_masa_treas',
    'member_gulu_chair', 'member_gulu_sec', 'member_gulu_treas',
    'member_mbal_chair', 'member_mbal_sec', 'member_mbal_treas',
    'member_hoim_chair', 'member_hoim_sec', 'member_hoim_treas'
);
