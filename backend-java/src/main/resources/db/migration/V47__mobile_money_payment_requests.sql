CREATE TABLE mobile_money_payment_requests (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    loan_id VARCHAR(80),
    purpose VARCHAR(40) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    currency_code VARCHAR(8) NOT NULL,
    payer_phone VARCHAR(40) NOT NULL,
    external_reference VARCHAR(120) NOT NULL,
    provider VARCHAR(80) NOT NULL,
    provider_reference VARCHAR(120),
    provider_payload TEXT,
    status VARCHAR(40) NOT NULL,
    status_message VARCHAR(255),
    checkout_prompt VARCHAR(255),
    callback_posting BOOLEAN NOT NULL DEFAULT TRUE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mobile_money_payment_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_mobile_money_payment_requests_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT uk_mobile_money_payment_requests_tenant_reference UNIQUE (tenant_id, external_reference)
);

CREATE INDEX idx_mobile_money_payment_requests_tenant_requested ON mobile_money_payment_requests (tenant_id, requested_at DESC);
CREATE INDEX idx_mobile_money_payment_requests_member_requested ON mobile_money_payment_requests (member_id, requested_at DESC);
