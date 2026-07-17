CREATE TABLE mobile_money_callbacks (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80),
    purpose VARCHAR(40) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    external_reference VARCHAR(120) NOT NULL,
    provider VARCHAR(80) NOT NULL,
    provider_payload TEXT,
    status VARCHAR(32) NOT NULL,
    resource_type VARCHAR(64),
    resource_id VARCHAR(80),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mobile_money_callbacks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_mobile_money_callbacks_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT uk_mobile_money_callbacks_tenant_reference UNIQUE (tenant_id, external_reference)
);

CREATE INDEX idx_mobile_money_callbacks_tenant_received ON mobile_money_callbacks (tenant_id, received_at DESC);
CREATE INDEX idx_mobile_money_callbacks_member ON mobile_money_callbacks (member_id, received_at DESC);

INSERT INTO mobile_money_callbacks (id, tenant_id, member_id, purpose, amount, external_reference, provider, provider_payload, status, resource_type, resource_id, received_at) VALUES
    ('callback_green_seed_0001', 'tenant_green', 'member_green_amina', 'savings_deposit', 250000.00, 'GVS-TX-0001', 'demo_mobile_money', '{"seed":true}', 'posted', 'financial_transaction', 'txn_green_0001', TIMESTAMP WITH TIME ZONE '2026-07-14 09:15:00+00');
