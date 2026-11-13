CREATE TABLE IF NOT EXISTS system_reseed_events (
    id VARCHAR(80) PRIMARY KEY,
    status VARCHAR(24) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    details VARCHAR(500)
);

INSERT INTO system_reseed_events (id, status, details)
VALUES (
    'retain_two_community_groups_2026',
    'pending',
    'Superseded by the live-data-aware two-SACCO reseed runner'
)
ON CONFLICT (id) DO NOTHING;
