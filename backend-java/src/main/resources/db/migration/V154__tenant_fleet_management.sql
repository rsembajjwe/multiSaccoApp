ALTER TABLE tenants ADD COLUMN account_manager_user_id VARCHAR(80);
ALTER TABLE tenants ADD COLUMN account_manager_name VARCHAR(160);

CREATE INDEX idx_tenants_fleet_status_district ON tenants (status, district);
CREATE INDEX idx_tenants_account_manager ON tenants (account_manager_user_id);
