CREATE TABLE fleet_forecast_scenarios (
    id VARCHAR(80) PRIMARY KEY,
    user_id VARCHAR(80) NOT NULL,
    name VARCHAR(80) NOT NULL,
    renewal_rate INTEGER NOT NULL,
    price_adjustment INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_fleet_forecast_scenario_name UNIQUE (user_id, name)
);

CREATE INDEX idx_fleet_forecast_scenario_user ON fleet_forecast_scenarios (user_id, name);
