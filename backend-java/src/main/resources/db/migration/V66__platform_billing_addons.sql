-- Additional platform revenue avenues layered on top of the base SACCO subscription. All are billed to
-- the SACCO as line items; none touch member funds (so no Bank of Uganda payment licence is triggered):
--   * paid add-on modules (advanced reporting, API access, ...)
--   * premium support subscription
--   * one-time onboarding/setup fee
--   * staff-seat and branch overage beyond the tier limit (computed at billing time)
--   * metered SMS/notification usage (computed from notification deliveries)
--
-- `platform_billing_catalog` holds the platform-wide rates (super admin / billing officer maintains them).
-- `tenant_billing_items` holds the explicit add-on/support/setup selections per SACCO; overage and SMS are
-- derived at billing time from live counts, not stored here.
--
-- No CHECK constraints on the string columns (H2/PostgreSQL parity).

CREATE TABLE platform_billing_catalog (
    code VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(32) NOT NULL,        -- addon_module | support | setup | overage_user | overage_branch | sms_rate
    unit_price DECIMAL(18, 2) NOT NULL,
    billing_period VARCHAR(16) NOT NULL,  -- annual | one_time | monthly | metered
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_billing_items (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    catalog_code VARCHAR(64) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(16) NOT NULL DEFAULT 'active',   -- active | cancelled
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenant_billing_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_tenant_billing_items_catalog FOREIGN KEY (catalog_code) REFERENCES platform_billing_catalog(code)
);

CREATE INDEX idx_tenant_billing_items_tenant ON tenant_billing_items (tenant_id, status);

-- Default rates (UGX). Prices are illustrative; the platform maintains them.
INSERT INTO platform_billing_catalog (code, name, category, unit_price, billing_period) VALUES
    ('addon_advanced_reporting', 'Advanced reporting & analytics', 'addon_module', 600000, 'annual'),
    ('addon_api_access', 'API access', 'addon_module', 900000, 'annual'),
    ('support_premium', 'Premium support (priority SLA)', 'support', 1000000, 'annual'),
    ('setup_onboarding', 'Onboarding & implementation (one-time)', 'setup', 500000, 'one_time'),
    ('overage_user', 'Extra staff seat (beyond tier)', 'overage_user', 60000, 'annual'),
    ('overage_branch', 'Extra branch (beyond tier)', 'overage_branch', 300000, 'annual'),
    ('sms_rate', 'SMS / notification message', 'sms_rate', 45, 'metered');

-- Demo: give Green Valley an add-on + premium support so the composed invoice is visible in the UI.
INSERT INTO tenant_billing_items (id, tenant_id, catalog_code, quantity, status) VALUES
    ('billitem_green_reporting', 'tenant_green', 'addon_advanced_reporting', 1, 'active'),
    ('billitem_green_support', 'tenant_green', 'support_premium', 1, 'active');
