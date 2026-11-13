CREATE TABLE sacco_official_assignments (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    office VARCHAR(32) NOT NULL,
    member_id VARCHAR(64) NOT NULL REFERENCES members(id),
    assigned_by_user_id VARCHAR(64) REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_sacco_official_office UNIQUE (tenant_id, office),
    CONSTRAINT uk_sacco_official_member UNIQUE (tenant_id, member_id),
    CONSTRAINT ck_sacco_official_office CHECK (office IN ('chairperson', 'secretary', 'treasurer'))
);

CREATE INDEX idx_sacco_officials_tenant ON sacco_official_assignments (tenant_id);

INSERT INTO sacco_official_assignments (id, tenant_id, office, member_id, assigned_by_user_id)
SELECT 'official_seed_' || tenant_id || '_' || office, tenant_id, office, member_id, NULL
FROM (
    SELECT
        m.tenant_id,
        m.id AS member_id,
        CASE ROW_NUMBER() OVER (PARTITION BY m.tenant_id ORDER BY m.membership_no)
            WHEN 1 THEN 'chairperson'
            WHEN 2 THEN 'secretary'
            WHEN 3 THEN 'treasurer'
        END AS office,
        COUNT(*) OVER (PARTITION BY m.tenant_id) AS member_count,
        ROW_NUMBER() OVER (PARTITION BY m.tenant_id ORDER BY m.membership_no) AS member_rank
    FROM members m
    WHERE m.tenant_id <> 'tenant_platform'
) seeded
WHERE member_count >= 3
  AND member_rank <= 3;