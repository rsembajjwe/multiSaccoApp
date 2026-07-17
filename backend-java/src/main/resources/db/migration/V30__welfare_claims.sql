CREATE TABLE welfare_claims (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    member_id VARCHAR(64) NOT NULL,
    claim_type VARCHAR(64) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    channel VARCHAR(32),
    reference VARCHAR(80) NOT NULL,
    description VARCHAR(320) NOT NULL,
    status VARCHAR(32) NOT NULL,
    submitted_by_user_id VARCHAR(64) NOT NULL,
    decided_by_user_id VARCHAR(64),
    paid_by_user_id VARCHAR(64),
    rejection_reason VARCHAR(240),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    decided_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_welfare_claims_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_welfare_claims_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_welfare_claims_submitted_by FOREIGN KEY (submitted_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_welfare_claims_decided_by FOREIGN KEY (decided_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_welfare_claims_paid_by FOREIGN KEY (paid_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_welfare_claims_reference UNIQUE (tenant_id, reference)
);

CREATE INDEX idx_welfare_claims_tenant_status ON welfare_claims (tenant_id, status);
CREATE INDEX idx_welfare_claims_member ON welfare_claims (member_id);

INSERT INTO welfare_claims (
    id,
    tenant_id,
    member_id,
    claim_type,
    amount,
    channel,
    reference,
    description,
    status,
    submitted_by_user_id,
    decided_by_user_id,
    paid_by_user_id,
    submitted_at,
    decided_at,
    paid_at,
    updated_at
) VALUES
    ('welfare_claim_green_0001', 'tenant_green', 'member_green_amina', 'medical', 50000.00, NULL, 'GVS-WCL-0001', 'Medical support reimbursement', 'approved', 'user_green_admin', 'user_green_admin', NULL, TIMESTAMP WITH TIME ZONE '2026-07-02 09:00:00+00', TIMESTAMP WITH TIME ZONE '2026-07-02 10:00:00+00', NULL, TIMESTAMP WITH TIME ZONE '2026-07-02 10:00:00+00');
