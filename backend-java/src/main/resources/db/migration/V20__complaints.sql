CREATE TABLE complaints (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80),
    category VARCHAR(40) NOT NULL,
    subject VARCHAR(180) NOT NULL,
    description VARCHAR(1200),
    channel VARCHAR(40) NOT NULL,
    priority VARCHAR(24) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    resolution_notes VARCHAR(1200),
    assigned_user_id VARCHAR(80),
    resolved_by_user_id VARCHAR(80),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id VARCHAR(80),
    created_by_member_id VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaints_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_complaints_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_complaints_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(id),
    CONSTRAINT fk_complaints_resolved_by FOREIGN KEY (resolved_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_complaints_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_complaints_created_by_member FOREIGN KEY (created_by_member_id) REFERENCES members(id)
);

CREATE INDEX idx_complaints_tenant_status ON complaints (tenant_id, status);
CREATE INDEX idx_complaints_member_created ON complaints (member_id, created_at DESC);

INSERT INTO complaints (
    id,
    tenant_id,
    member_id,
    category,
    subject,
    description,
    channel,
    priority,
    status,
    assigned_user_id,
    created_by_user_id
) VALUES (
    'complaint_green_0001',
    'tenant_green',
    'member_green_amina',
    'statement',
    'Statement balance clarification',
    'Member requested clarification on the timing of a mobile-money savings posting.',
    'branch',
    'medium',
    'open',
    'user_green_admin',
    'user_green_admin'
);
