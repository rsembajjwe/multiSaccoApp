CREATE TABLE accounting_periods (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    period VARCHAR(7) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'open',
    closed_by_user_id VARCHAR(64) REFERENCES users(id),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_accounting_periods_tenant_period UNIQUE (tenant_id, period)
);

CREATE INDEX idx_accounting_periods_tenant_status ON accounting_periods (tenant_id, status);

INSERT INTO accounting_periods (
    id,
    tenant_id,
    period,
    status,
    closed_by_user_id,
    closed_at
) VALUES
    (
        'period_green_2026_06',
        'tenant_green',
        '2026-06',
        'closed',
        'user_green_admin',
        TIMESTAMP WITH TIME ZONE '2026-07-01 08:00:00+00'
    ),
    (
        'period_green_2026_07',
        'tenant_green',
        '2026-07',
        'open',
        NULL,
        NULL
    ),
    (
        'period_lake_2026_07',
        'tenant_lake',
        '2026-07',
        'open',
        NULL,
        NULL
    );
