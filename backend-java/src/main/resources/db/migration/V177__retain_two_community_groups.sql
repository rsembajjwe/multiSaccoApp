CREATE TABLE system_reseed_events (
    id VARCHAR(80) PRIMARY KEY,
    status VARCHAR(24) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    details VARCHAR(500)
);

INSERT INTO system_reseed_events (id, status, details)
VALUES ('retain_two_community_groups_2026', 'pending', 'Retain A-Z Community Group and Mutwe Community Group only');

UPDATE tenants
SET name = 'A-Z Community Group',
    district = 'Kampala',
    registration_no = 'COMMUNITY/AZ/KLA/2026',
    status = 'active',
    onboarding_percent = 100,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tenant_green';

UPDATE tenants
SET name = 'Mutwe Community Group',
    district = 'Wakiso',
    registration_no = 'COMMUNITY/MUTWE/WAK/2026',
    status = 'active',
    onboarding_percent = 100,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'tenant_lake';

UPDATE branches
SET name = 'Kampala Main', address = 'Kampala', status = 'active'
WHERE id = 'branch_green_main';

UPDATE branches
SET name = 'Lukwanga Main', address = 'Lukwanga, Wakiso District', status = 'active'
WHERE id = 'branch_lake_main';

UPDATE sacco_profiles
SET legal_name = 'A-Z Community Group',
    cooperative_registration_no = 'COMMUNITY/AZ/KLA/2026',
    address = 'Kampala, Uganda',
    email = 'rsembajjwe@gmail.com',
    website = '',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'tenant_green';

UPDATE sacco_profiles
SET legal_name = 'Mutwe Community Group',
    cooperative_registration_no = 'COMMUNITY/MUTWE/WAK/2026',
    address = 'Lukwanga, Wakiso District, Uganda',
    email = 'rsembajjwe@gmail.com',
    website = '',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'tenant_lake';

UPDATE users
SET full_name = CASE id
        WHEN 'user_green_chairperson' THEN 'A-Z Community Group Chairperson'
        WHEN 'user_green_treasurer' THEN 'A-Z Community Group Treasurer'
        WHEN 'user_green_secretary' THEN 'A-Z Community Group Secretary'
    END,
    email = CASE id
        WHEN 'user_green_chairperson' THEN 'rsembajjwe@gmail.com'
        WHEN 'user_green_treasurer' THEN 'rsembajjwe1@gmail.com'
        WHEN 'user_green_secretary' THEN 'rsembajjwe2@gmail.com'
    END
WHERE id IN ('user_green_chairperson', 'user_green_treasurer', 'user_green_secretary');

UPDATE subscriptions
SET status = 'active', expiry = DATE '2027-12-31', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id IN ('tenant_green', 'tenant_lake');

UPDATE members
SET full_name = 'Mutwe Community Group Chairperson',
    email = 'rsembajjwe@gmail.com',
    phone = '',
    status = 'active',
    kyc_status = 'verified',
    linked_user_id = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'member_lake_peter';

INSERT INTO members (
    id, tenant_id, branch_id, membership_no, full_name, member_type, phone, email, national_id,
    password_hash, password_salt, status, kyc_status, joining_date,
    savings_balance, shares_balance, welfare_balance
) VALUES
    ('member_lake_secretary', 'tenant_lake', 'branch_lake_main', 'LAKE-0002', 'Mutwe Community Group Secretary', 'individual', '', 'rsembajjwe2@gmail.com', NULL, 'disabled', 'disabled', 'active', 'verified', CURRENT_DATE, 0, 0, 0),
    ('member_lake_treasurer', 'tenant_lake', 'branch_lake_main', 'LAKE-0003', 'Mutwe Community Group Treasurer', 'individual', '', 'rsembajjwe1@gmail.com', NULL, 'disabled', 'disabled', 'active', 'verified', CURRENT_DATE, 0, 0, 0);

INSERT INTO roles (id, tenant_id, name, protected_role, created_by_user_id) VALUES
    ('role_lake_chairperson', 'tenant_lake', 'Chairperson', TRUE, 'user_platform_admin'),
    ('role_lake_secretary', 'tenant_lake', 'Secretary', TRUE, 'user_platform_admin'),
    ('role_lake_treasurer', 'tenant_lake', 'Treasurer', TRUE, 'user_platform_admin');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_lake_chairperson', permission_id FROM role_permissions WHERE role_id = 'role_green_chairperson';
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_lake_secretary', permission_id FROM role_permissions WHERE role_id = 'role_green_secretary';
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_lake_treasurer', permission_id FROM role_permissions WHERE role_id = 'role_green_treasurer';

INSERT INTO users (
    id, tenant_id, full_name, email, phone, password_hash, password_salt, status,
    password_reset_required, onboarding_channel, onboarding_delivery_status
) VALUES
    ('user_lake_chairperson', 'tenant_lake', 'Mutwe Community Group Chairperson', 'rsembajjwe@gmail.com', '', 'disabled_until_onboarding', 'disabled_until_onboarding', 'active', TRUE, 'email', 'pending'),
    ('user_lake_secretary', 'tenant_lake', 'Mutwe Community Group Secretary', 'rsembajjwe2@gmail.com', '', 'disabled_until_onboarding', 'disabled_until_onboarding', 'active', TRUE, 'email', 'pending'),
    ('user_lake_treasurer', 'tenant_lake', 'Mutwe Community Group Treasurer', 'rsembajjwe1@gmail.com', '', 'disabled_until_onboarding', 'disabled_until_onboarding', 'active', TRUE, 'email', 'pending');

INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
    ('user_lake_chairperson', 'role_lake_chairperson', 'tenant_lake'),
    ('user_lake_secretary', 'role_lake_secretary', 'tenant_lake'),
    ('user_lake_treasurer', 'role_lake_treasurer', 'tenant_lake');

INSERT INTO sacco_official_assignments (id, tenant_id, office, member_id, assigned_by_user_id) VALUES
    ('official_lake_chairperson', 'tenant_lake', 'chairperson', 'member_lake_peter', 'user_platform_admin'),
    ('official_lake_secretary', 'tenant_lake', 'secretary', 'member_lake_secretary', 'user_platform_admin'),
    ('official_lake_treasurer', 'tenant_lake', 'treasurer', 'member_lake_treasurer', 'user_platform_admin');

UPDATE members SET linked_user_id = 'user_lake_chairperson' WHERE id = 'member_lake_peter';
UPDATE members SET linked_user_id = 'user_lake_secretary' WHERE id = 'member_lake_secretary';
UPDATE members SET linked_user_id = 'user_lake_treasurer' WHERE id = 'member_lake_treasurer';
