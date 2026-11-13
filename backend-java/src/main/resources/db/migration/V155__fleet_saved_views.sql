CREATE TABLE fleet_saved_views (
    id VARCHAR(80) PRIMARY KEY,
    user_id VARCHAR(80) NOT NULL,
    name VARCHAR(80) NOT NULL,
    search_text VARCHAR(160),
    health VARCHAR(32),
    lifecycle_status VARCHAR(40),
    district VARCHAR(120),
    account_manager VARCHAR(80),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_fleet_saved_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_fleet_saved_views_user_name UNIQUE (user_id, name)
);

CREATE INDEX idx_fleet_saved_views_user ON fleet_saved_views (user_id, name);
