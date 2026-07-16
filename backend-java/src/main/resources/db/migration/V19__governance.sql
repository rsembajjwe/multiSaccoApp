CREATE TABLE governance_meetings (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    meeting_type VARCHAR(40) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    chair_user_id VARCHAR(80),
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    minutes VARCHAR(1000),
    created_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_governance_meetings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_governance_meetings_chair FOREIGN KEY (chair_user_id) REFERENCES users(id),
    CONSTRAINT fk_governance_meetings_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE governance_resolutions (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    meeting_id VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    decision VARCHAR(1000),
    owner_user_id VARCHAR(80),
    due_date DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_governance_resolutions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_governance_resolutions_meeting FOREIGN KEY (meeting_id) REFERENCES governance_meetings(id),
    CONSTRAINT fk_governance_resolutions_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
    CONSTRAINT fk_governance_resolutions_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_governance_meetings_tenant_date ON governance_meetings (tenant_id, scheduled_at);
CREATE INDEX idx_governance_resolutions_tenant_status ON governance_resolutions (tenant_id, status);

INSERT INTO governance_meetings (id, tenant_id, title, meeting_type, scheduled_at, chair_user_id, status, minutes, created_by_user_id) VALUES
    ('meeting_green_0001', 'tenant_green', 'Quarterly Credit Committee', 'credit_committee', TIMESTAMP WITH TIME ZONE '2026-07-20 09:00:00+03', 'user_green_admin', 'scheduled', 'Agenda includes loan portfolio quality, guarantor exposure, and repayment performance.', 'user_green_admin');

INSERT INTO governance_resolutions (id, tenant_id, meeting_id, title, decision, owner_user_id, due_date, status, created_by_user_id) VALUES
    ('resolution_green_0001', 'tenant_green', 'meeting_green_0001', 'Review high-risk emergency loan files', 'Credit officer to present guarantor status and repayment capacity before approval.', 'user_green_admin', DATE '2026-07-25', 'open', 'user_green_admin');
