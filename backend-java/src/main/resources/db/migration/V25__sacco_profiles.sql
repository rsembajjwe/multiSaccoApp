CREATE TABLE sacco_profiles (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    legal_name VARCHAR(180) NOT NULL,
    tin VARCHAR(40),
    umra_license_no VARCHAR(80),
    cooperative_registration_no VARCHAR(100),
    address VARCHAR(240),
    email VARCHAR(160),
    phone VARCHAR(40),
    website VARCHAR(160),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sacco_profiles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT uk_sacco_profiles_tenant UNIQUE (tenant_id)
);

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
    website
) VALUES
    (
        'profile_green',
        'tenant_green',
        'Green Valley Savings and Credit Cooperative Society Limited',
        '1002456789',
        'UMRA/GVS/2018/014',
        'COOP/GVS/2018/014',
        'Plot 14 Cooperative Road, Kampala',
        'info@greenvalley.example.local',
        '+256700000200',
        'https://greenvalley.example.local'
    ),
    (
        'profile_lake',
        'tenant_lake',
        'Lake Farmers Savings and Credit Cooperative Society Limited',
        '1007788990',
        'UMRA/LFS/2020/082',
        'COOP/LFS/2020/082',
        'Lake Road, Wakiso',
        'info@lakefarmers.example.local',
        '+256700000300',
        'https://lakefarmers.example.local'
    );
