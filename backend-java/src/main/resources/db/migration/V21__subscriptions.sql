CREATE TABLE subscription_packages (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    price DECIMAL(18, 2) NOT NULL,
    billing_period VARCHAR(24) NOT NULL,
    min_members INTEGER NOT NULL,
    member_limit INTEGER NOT NULL,
    tier_label VARCHAR(80) NOT NULL,
    user_limit INTEGER NOT NULL,
    branch_limit INTEGER NOT NULL,
    modules VARCHAR(300) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active'
);

CREATE TABLE subscriptions (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    package_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    invoice VARCHAR(80) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    paid DECIMAL(18, 2) NOT NULL DEFAULT 0,
    member_count INTEGER NOT NULL,
    billable_members INTEGER NOT NULL,
    unit_price DECIMAL(18, 2),
    tier_id VARCHAR(40) NOT NULL,
    tier_label VARCHAR(80) NOT NULL,
    billing_description VARCHAR(240) NOT NULL,
    expiry DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_subscriptions_package FOREIGN KEY (package_id) REFERENCES subscription_packages(id),
    CONSTRAINT uk_subscriptions_invoice UNIQUE (invoice)
);

CREATE TABLE subscription_payments (
    id VARCHAR(80) PRIMARY KEY,
    subscription_id VARCHAR(80) NOT NULL,
    tenant_id VARCHAR(80) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    channel VARCHAR(40) NOT NULL,
    external_reference VARCHAR(100) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subscription_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
    CONSTRAINT fk_subscription_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_subscription_payments_recorded_by FOREIGN KEY (recorded_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_subscription_payments_reference UNIQUE (external_reference)
);

CREATE INDEX idx_subscriptions_tenant_status ON subscriptions (tenant_id, status);
CREATE INDEX idx_subscription_payments_tenant_received ON subscription_payments (tenant_id, received_at DESC);

INSERT INTO subscription_packages (id, name, price, billing_period, min_members, member_limit, tier_label, user_limit, branch_limit, modules, status) VALUES
    ('starter', 'Starter', 1200000.00, 'annual', 100, 500, '251-500 members', 8, 1, 'Members, savings, shares', 'active'),
    ('growth', 'Growth', 3600000.00, 'annual', 100, 2500, '501-2,500 members', 25, 5, 'Core finance, loans, approvals, reports', 'active'),
    ('enterprise', 'Enterprise', 9000000.00, 'annual', 100, 10000, '2,501-10,000 members', 100, 25, 'All modules, API, advanced support', 'active');

INSERT INTO subscriptions (
    id,
    tenant_id,
    package_id,
    status,
    invoice,
    amount,
    paid,
    member_count,
    billable_members,
    unit_price,
    tier_id,
    tier_label,
    billing_description,
    expiry
) VALUES
    ('subscription_green_growth', 'tenant_green', 'growth', 'active', 'INV-2026-001', 500000.00, 500000.00, 2, 100, 5000.00, 'per_member', '100-250 members', 'UGX 5,000 per member annually, minimum 100 members', DATE '2027-07-14'),
    ('subscription_lake_starter', 'tenant_lake', 'starter', 'pending_payment', 'INV-2026-002', 500000.00, 0.00, 1, 100, 5000.00, 'per_member', '100-250 members', 'UGX 5,000 per member annually, minimum 100 members', DATE '2026-07-30');
