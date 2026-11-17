CREATE TABLE platform_sms_inventory_settings (
    id SMALLINT PRIMARY KEY,
    provider_unit_cost NUMERIC(19, 2) NOT NULL,
    low_stock_threshold INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    CONSTRAINT chk_platform_sms_inventory_singleton CHECK (id = 1),
    CONSTRAINT chk_platform_sms_provider_cost CHECK (provider_unit_cost > 0),
    CONSTRAINT chk_platform_sms_low_stock CHECK (low_stock_threshold >= 0)
);

INSERT INTO platform_sms_inventory_settings
    (id, provider_unit_cost, low_stock_threshold, updated_by)
VALUES
    (1, 35, 100, 'migration');
