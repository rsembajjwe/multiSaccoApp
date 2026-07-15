CREATE TABLE tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    abbreviation VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    registration_no VARCHAR(80) NOT NULL,
    district VARCHAR(80) NOT NULL,
    license_expiry DATE NOT NULL,
    package_id VARCHAR(64) NOT NULL,
    onboarding_percent INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_status ON tenants (status);

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
) VALUES
    ('tenant_green', 'Green Valley SACCO', 'GVS', 'active', 'COOP/GVS/2018/014', 'Kampala', DATE '2027-09-30', 'starter', 92),
    ('tenant_lake', 'Lake Farmers SACCO', 'LFS', 'active', 'COOP/LFS/2020/082', 'Wakiso', DATE '2026-12-15', 'growth', 76),
    ('tenant_pending', 'Kigezi Traders SACCO', 'KTS', 'pending_review', 'COOP/KTS/2026/011', 'Kabale', DATE '2027-04-10', 'starter', 38);
