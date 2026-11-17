CREATE TABLE sacco_sms_schedules (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id),
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    message_mode VARCHAR(32) NOT NULL DEFAULT 'custom',
    member_ids TEXT NOT NULL DEFAULT '',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'scheduled',
    estimated_credits INTEGER NOT NULL DEFAULT 0,
    recipients INTEGER NOT NULL DEFAULT 0,
    credits_used INTEGER NOT NULL DEFAULT 0,
    failure_reason VARCHAR(500),
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_sacco_sms_schedule_mode CHECK (message_mode IN ('custom', 'account_status')),
    CONSTRAINT ck_sacco_sms_schedule_status CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled'))
);

CREATE INDEX idx_sacco_sms_schedules_due
    ON sacco_sms_schedules(status, scheduled_at);

CREATE INDEX idx_sacco_sms_schedules_tenant
    ON sacco_sms_schedules(tenant_id, created_at DESC);
