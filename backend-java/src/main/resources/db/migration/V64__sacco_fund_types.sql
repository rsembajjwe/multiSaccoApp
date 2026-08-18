-- Configurable fund sources: every SACCO starts with Savings, Shares and Welfare, and the SACCO
-- Administrator can add SACCO-specific contribution funds (Burial, Education, Development, Emergency...).
-- Each fund type is a member-contribution fund; per-member balances are held via financial_accounts.
--
-- `basis` maps a custom fund to the mechanics of one of the three base funds (savings = interest-bearing
-- balance, shares = share capital, welfare = contribution pool). `is_system` marks the three built-in
-- funds, which cannot be deleted or have their code/basis changed.
--
-- No CHECK constraints on the string columns (H2/PostgreSQL parity); allowed values are enforced in the
-- application layer.

CREATE TABLE sacco_fund_types (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    code VARCHAR(40) NOT NULL,            -- used as financial_products.product_type (e.g. savings, burial)
    name VARCHAR(120) NOT NULL,           -- display name (e.g. "Burial Fund")
    basis VARCHAR(16) NOT NULL,           -- savings | shares | welfare (mechanics the fund follows)
    description VARCHAR(300),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sacco_fund_types_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_sacco_fund_types_user FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_sacco_fund_types_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_sacco_fund_types_tenant_active ON sacco_fund_types (tenant_id, active);

-- Seed the three built-in funds for every existing SACCO tenant.
INSERT INTO sacco_fund_types (id, tenant_id, code, name, basis, is_system, active, display_order, created_by_user_id)
SELECT 'fundtype_' || t.id || '_savings', t.id, 'savings', 'Savings', 'savings', TRUE, TRUE, 1, 'user_platform_admin'
FROM tenants t WHERE t.id <> 'tenant_platform'
UNION ALL
SELECT 'fundtype_' || t.id || '_shares', t.id, 'shares', 'Shares', 'shares', TRUE, TRUE, 2, 'user_platform_admin'
FROM tenants t WHERE t.id <> 'tenant_platform'
UNION ALL
SELECT 'fundtype_' || t.id || '_welfare', t.id, 'welfare', 'Welfare', 'welfare', TRUE, TRUE, 3, 'user_platform_admin'
FROM tenants t WHERE t.id <> 'tenant_platform';

-- Permissions catalog + grants. The SACCO Administrator configures funds; finance/governance roles view.
INSERT INTO permissions (id, module, action, description) VALUES
    ('fund-types:view', 'fund-types', 'view', 'View the SACCO configurable fund types.'),
    ('fund-types:manage', 'fund-types', 'manage', 'Create and edit SACCO fund types.');

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_green_admin', 'fund-types:view'),
    ('role_green_admin', 'fund-types:manage'),
    ('role_green_treasurer', 'fund-types:view'),
    ('role_green_accountant', 'fund-types:view'),
    ('role_green_chairperson', 'fund-types:view');
