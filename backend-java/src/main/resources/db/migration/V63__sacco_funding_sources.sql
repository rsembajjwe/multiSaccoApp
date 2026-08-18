-- SACCO sources-of-funds register: a governance-level record of where the SACCO's capital comes from
-- (member share capital, savings mobilised, grants, donations, external borrowings, retained earnings,
-- investment income, other). The Chairperson (and SACCO admin/treasurer) review and maintain it.
--
-- No CHECK constraints on the string columns: H2 (PostgreSQL mode) rejects Hibernate parameterized writes
-- against string IN(...) CHECK constraints, so allowed values (source_type/status) are enforced in the
-- application layer, consistent with the other SACCO tables.

CREATE TABLE sacco_funding_sources (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    source_type VARCHAR(40) NOT NULL,        -- share_capital | member_savings | grant | donation | external_borrowing | retained_earnings | investment_income | other
    provider VARCHAR(160),                   -- donor / lender / origin (optional)
    amount DECIMAL(18, 2) NOT NULL,
    currency_code VARCHAR(8) NOT NULL DEFAULT 'UGX',
    reference VARCHAR(96),                    -- cheque no / agreement ref (optional)
    date_received DATE,
    status VARCHAR(16) NOT NULL DEFAULT 'active',  -- active | closed
    notes VARCHAR(500),
    recorded_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sacco_funding_sources_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_sacco_funding_sources_user FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_sacco_funding_sources_tenant ON sacco_funding_sources (tenant_id, status);
CREATE INDEX idx_sacco_funding_sources_tenant_date ON sacco_funding_sources (tenant_id, date_received DESC);

-- Permissions catalog.
INSERT INTO permissions (id, module, action, description) VALUES
    ('finance-source:view', 'finance-source', 'view', 'View the SACCO sources-of-funds register.'),
    ('finance-source:manage', 'finance-source', 'manage', 'Add and edit SACCO funding sources.');

-- Grant to the governance/finance roles: Chairperson, SACCO Administrator and Treasurer review and
-- maintain the register. (Secretary keeps view-only for minutes/reporting.)
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_green_chairperson', 'finance-source:view'),
    ('role_green_chairperson', 'finance-source:manage'),
    ('role_green_admin', 'finance-source:view'),
    ('role_green_admin', 'finance-source:manage'),
    ('role_green_treasurer', 'finance-source:view'),
    ('role_green_treasurer', 'finance-source:manage'),
    ('role_green_secretary', 'finance-source:view');
