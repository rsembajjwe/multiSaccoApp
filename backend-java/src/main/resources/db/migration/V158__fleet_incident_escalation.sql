ALTER TABLE fleet_incident_states ADD COLUMN escalated_at TIMESTAMP;
ALTER TABLE fleet_incident_states ADD COLUMN escalated_by_user_id VARCHAR(80);
ALTER TABLE fleet_incident_states ADD COLUMN escalated_by_name VARCHAR(160);

CREATE INDEX idx_fleet_incident_escalated ON fleet_incident_states (escalated_at DESC);
