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
        'user_platform_operations',
        'tenant_platform',
        'Platform Operations Officer',
        'operations@platform.local',
        '+256700000006',
        '78a7d3f69c48404d1e91387ee190097121e4bd37b7d985c473bef3637308e189',
        'platform_operations_seed_salt_2026',
        'active'
    ),
    (
        'user_platform_billing',
        'tenant_platform',
        'Platform Billing Officer',
        'billing@platform.local',
        '+256700000007',
        '70fe608d94562a16f5f6e494e32f612a41d2e674833fd08adfe4a15d8eed882d',
        'platform_billing_seed_salt_2026',
        'active'
    ),
    (
        'user_platform_compliance',
        'tenant_platform',
        'Platform Compliance Officer',
        'compliance@platform.local',
        '+256700000008',
        '99bb43a2716808081d0647838398afe4604b5d36f96a7ec90d09c676f3471a73',
        'platform_compliance_seed_salt_2026',
        'active'
    ),
    (
        'user_platform_support',
        'tenant_platform',
        'Platform Support Officer',
        'support@platform.local',
        '+256700000009',
        'be2665177112c2917caa3c070022b66f46108308a649e50fede3957195260d29',
        'platform_support_seed_salt_2026',
        'active'
    );

INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
    ('user_platform_operations', 'role_platform_operations_officer', 'tenant_platform'),
    ('user_platform_billing', 'role_platform_billing_officer', 'tenant_platform'),
    ('user_platform_compliance', 'role_platform_compliance_officer', 'tenant_platform'),
    ('user_platform_support', 'role_platform_support_officer', 'tenant_platform');
