INSERT INTO tenants (
    id,
    name,
    abbreviation,
    status,
    registration_no,
    district,
    license_expiry,
    package_id,
    onboarding_percent
) VALUES (
    'tenant_platform',
    'Platform Administration',
    'PLT',
    'active',
    'PLATFORM',
    'Kampala',
    DATE '2030-12-31',
    'platform',
    100
);

CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    full_name VARCHAR(160) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    password_hash VARCHAR(128) NOT NULL,
    password_salt VARCHAR(80) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_email ON users (email);

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
        'user_platform_admin',
        'tenant_platform',
        'Platform Administrator',
        'admin@platform.local',
        '+256700000001',
        'fe8df3a7f507431235bb253c08dd44aee3296c58443282d876683582968880ce',
        'platform_admin_seed_salt_2026',
        'active'
    ),
    (
        'user_green_admin',
        'tenant_green',
        'Green Valley SACCO Admin',
        'admin@greenvalley.local',
        '+256700000002',
        '0830d576480a906c4d8910cdac88c6c5b4b6f0b50f69c379417939f7610f97c2',
        'green_admin_seed_salt_2026',
        'active'
    );
