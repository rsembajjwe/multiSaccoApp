-- Align roles with the documented role/function matrix.
--
-- 1) Platform Support Officer must be able to REPLY to SACCO admin support chats (not just view),
--    which requires complaints:manage (chat send is gated on complaints:manage).
-- 2) Platform Compliance Officer reviews SACCO governance and reporting readiness (governance:view).
-- 3) Add demo login accounts for the remaining SACCO roles (Accountant, Teller, Auditor,
--    Loans Officer) so every role can be exercised. These follow the existing demo convention
--    (email @greenvalley.local + *_seed_salt_2026), so DemoSeedDataSanitizer suspends them in
--    production automatically.

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_platform_support_officer', 'complaints:manage'),
    ('role_platform_compliance_officer', 'governance:view'),
    ('role_green_chairperson', 'complaints:view');

INSERT INTO users (id, tenant_id, full_name, email, phone, password_hash, password_salt, status) VALUES
    (
        'user_green_accountant',
        'tenant_green',
        'Green Valley Accountant',
        'accountant@greenvalley.local',
        '+256700000006',
        '5b43dfd65251b10143b8d177afd9d49b789f87ce2ef26820f3b41bba77555cd7',
        'green_accountant_seed_salt_2026',
        'active'
    ),
    (
        'user_green_teller',
        'tenant_green',
        'Green Valley Teller',
        'teller@greenvalley.local',
        '+256700000007',
        'cc131aada7259cd10a14c0767206e5ed61a76764b334f41722ba14b5264911ba',
        'green_teller_seed_salt_2026',
        'active'
    ),
    (
        'user_green_auditor',
        'tenant_green',
        'Green Valley Auditor',
        'auditor@greenvalley.local',
        '+256700000008',
        'dd9075aa9b381bbdc36e82a899b78239017f5c6f61b66187608f47383092c10f',
        'green_auditor_seed_salt_2026',
        'active'
    ),
    (
        'user_green_loans',
        'tenant_green',
        'Green Valley Loans Officer',
        'loans@greenvalley.local',
        '+256700000009',
        '230a79e2c8a8cc6f73b5ef05e18a60628053b2423313fe9aa4046b10e59097ed',
        'green_loans_seed_salt_2026',
        'active'
    );

INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
    ('user_green_accountant', 'role_green_accountant', 'tenant_green'),
    ('user_green_teller', 'role_green_teller', 'tenant_green'),
    ('user_green_auditor', 'role_green_auditor', 'tenant_green'),
    ('user_green_loans', 'role_green_loans_officer', 'tenant_green');
