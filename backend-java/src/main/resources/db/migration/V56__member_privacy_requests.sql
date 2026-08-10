CREATE TABLE member_privacy_requests (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL REFERENCES tenants(id),
    member_id VARCHAR(80) NOT NULL REFERENCES members(id),
    request_type VARCHAR(40) NOT NULL,
    status VARCHAR(40) NOT NULL,
    reason VARCHAR(500),
    resolution_note VARCHAR(500),
    requested_by_member_id VARCHAR(80),
    requested_by_user_id VARCHAR(80),
    handled_by_user_id VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    handled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_member_privacy_request_type CHECK (request_type IN ('subject_access', 'erasure', 'retention_review')),
    CONSTRAINT chk_member_privacy_request_status CHECK (status IN ('submitted', 'approved', 'completed', 'rejected'))
);

CREATE INDEX idx_member_privacy_requests_tenant_member
    ON member_privacy_requests (tenant_id, member_id, created_at DESC);

CREATE INDEX idx_member_privacy_requests_status
    ON member_privacy_requests (tenant_id, status, created_at DESC);
