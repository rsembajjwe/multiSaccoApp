-- Notification channel preferences control which channels a message actually fans out to. A delivery on
-- a channel happens only when the SACCO enables that channel AND the member has not opted out of it.
-- One unified table holds both levels: member_id = '' marks a SACCO-wide channel toggle; a non-empty
-- member_id marks a per-member override. Absence of a row means "enabled" (opt-out model), so existing
-- behaviour is preserved until someone changes a setting. The in_app channel is always on (the stored
-- message record) and is not gated here. No CHECK constraints on the string columns (H2/PostgreSQL parity).
CREATE TABLE notification_channel_preferences (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL DEFAULT '',   -- '' = SACCO-wide toggle; otherwise a member override
    channel VARCHAR(32) NOT NULL,                -- sms | email | whatsapp | push
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ncp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE UNIQUE INDEX ux_ncp_tenant_member_channel ON notification_channel_preferences (tenant_id, member_id, channel);

-- Demo: Green Valley member Amina has opted out of email so the effect is visible in the portal.
INSERT INTO notification_channel_preferences (id, tenant_id, member_id, channel, enabled) VALUES
    ('ncp_green_amina_email', 'tenant_green', 'member_green_amina', 'email', FALSE);
