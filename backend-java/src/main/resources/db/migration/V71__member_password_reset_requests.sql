-- Member self-service password reset. A member requests a reset by SACCO code + identifier (membership
-- number, phone or email) and a delivery channel. Email and WhatsApp are free and issue the code
-- immediately (status 'pending'). SMS is a charged channel: the request starts as 'pending_payment' and
-- is only activated (code sent) once a UGX 500 mobile-money payment is confirmed by callback. The reset
-- code is short-lived and single-use. No CHECK constraints on string columns (H2/PostgreSQL parity).
CREATE TABLE member_password_reset_requests (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    token VARCHAR(120) NOT NULL,
    channel VARCHAR(24) NOT NULL,            -- email | whatsapp | sms
    status VARCHAR(24) NOT NULL,             -- pending_payment | pending | used | expired
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    external_reference VARCHAR(120),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mprr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_mprr_member FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX idx_mprr_member ON member_password_reset_requests (member_id, created_at DESC);
CREATE INDEX idx_mprr_reference ON member_password_reset_requests (tenant_id, external_reference);
