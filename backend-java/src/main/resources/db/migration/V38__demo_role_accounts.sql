INSERT INTO users (
    id,
    tenant_id,
    full_name,
    email,
    phone,
    password_hash,
    password_salt,
    status
) VALUES
    (
        'user_green_treasurer',
        'tenant_green',
        'Green Valley Treasurer',
        'treasurer@greenvalley.local',
        '+256700000003',
        '5e2c2a513ef3bd5783afa9798bd08bc077f684eaa87e4652a262c43d6ea773d8',
        'green_treasurer_seed_salt_2026',
        'active'
    ),
    (
        'user_green_secretary',
        'tenant_green',
        'Green Valley Secretary',
        'secretary@greenvalley.local',
        '+256700000004',
        '32183fa589a943acea8722aa9bf8321a668f8d0d3e5b67e321a169e81a88363b',
        'green_secretary_seed_salt_2026',
        'active'
    ),
    (
        'user_green_chairperson',
        'tenant_green',
        'Green Valley Chairperson',
        'chairperson@greenvalley.local',
        '+256700000005',
        'b1a3514a8ad3b674c992e8a6aa9d7da906e2bebd4b4f5d681915891f34b0ed01',
        'green_chair_seed_salt_2026',
        'active'
    );

INSERT INTO roles (id, tenant_id, name, protected_role, created_by_user_id) VALUES
    ('role_green_treasurer', 'tenant_green', 'Treasurer', TRUE, 'user_green_admin'),
    ('role_green_secretary', 'tenant_green', 'Secretary', TRUE, 'user_green_admin'),
    ('role_green_chairperson', 'tenant_green', 'Chairperson', TRUE, 'user_green_admin');

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_green_treasurer', 'transactions:view'),
    ('role_green_treasurer', 'transactions:create'),
    ('role_green_treasurer', 'transactions:approve'),
    ('role_green_treasurer', 'accounting:view'),
    ('role_green_treasurer', 'accounting:post'),
    ('role_green_treasurer', 'reports:view'),
    ('role_green_treasurer', 'approvals:view'),
    ('role_green_treasurer', 'operations:view'),
    ('role_green_secretary', 'members:view'),
    ('role_green_secretary', 'members:create'),
    ('role_green_secretary', 'members:approve'),
    ('role_green_secretary', 'reports:view'),
    ('role_green_secretary', 'approvals:view'),
    ('role_green_secretary', 'governance:view'),
    ('role_green_secretary', 'governance:manage'),
    ('role_green_secretary', 'complaints:view'),
    ('role_green_secretary', 'complaints:manage'),
    ('role_green_chairperson', 'loans:view'),
    ('role_green_chairperson', 'loans:approve'),
    ('role_green_chairperson', 'approvals:view'),
    ('role_green_chairperson', 'approvals:decide'),
    ('role_green_chairperson', 'reports:view'),
    ('role_green_chairperson', 'operations:view'),
    ('role_green_chairperson', 'governance:view');

INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
    ('user_green_treasurer', 'role_green_treasurer', 'tenant_green'),
    ('user_green_secretary', 'role_green_secretary', 'tenant_green'),
    ('user_green_chairperson', 'role_green_chairperson', 'tenant_green');
