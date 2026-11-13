CREATE TABLE fleet_incident_states (
    incident_key VARCHAR(180) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    issue_type VARCHAR(60) NOT NULL,
    workflow_status VARCHAR(32) NOT NULL,
    assignee_user_id VARCHAR(80),
    assignee_name VARCHAR(160),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_note VARCHAR(1000),
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_fleet_incident_status_updated ON fleet_incident_states (workflow_status, updated_at DESC);
CREATE INDEX idx_fleet_incident_assignee ON fleet_incident_states (assignee_user_id, workflow_status);
