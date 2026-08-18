-- Member membership dues: a per-member recurring membership with its own amount, payment status and
-- expiry, managed by SACCO staff (separate from the platform's per-SACCO subscription). Renewals extend
-- the expiry by the billing period. No CHECK constraints on string columns (H2/PostgreSQL parity); values
-- are validated in the application layer.
CREATE TABLE member_subscriptions (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    plan_name VARCHAR(120) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    paid NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,            -- pending_payment | active | expired
    billing_period VARCHAR(24) NOT NULL DEFAULT 'annual',   -- monthly | annual
    start_date DATE,
    expiry DATE NOT NULL,
    last_reminder_on DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_member_subscriptions_member FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX idx_member_subscriptions_member ON member_subscriptions (member_id, created_at DESC);
CREATE INDEX idx_member_subscriptions_tenant_status ON member_subscriptions (tenant_id, status);

-- Demo: an active annual membership for Green Valley member Amina so the UI has data to show.
INSERT INTO member_subscriptions (id, tenant_id, member_id, plan_name, amount, paid, status, billing_period, start_date, expiry) VALUES
    ('membersub_green_amina', 'tenant_green', 'member_green_amina', 'Annual membership', 50000, 50000, 'active', 'annual', DATE '2026-01-15', DATE '2027-01-15');
