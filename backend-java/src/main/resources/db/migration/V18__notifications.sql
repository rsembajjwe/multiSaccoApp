CREATE TABLE notifications (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    status VARCHAR(32) NOT NULL,
    resource_type VARCHAR(64),
    resource_id VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_notifications_member FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE notification_deliveries (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    notification_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    provider VARCHAR(80) NOT NULL,
    recipient VARCHAR(160) NOT NULL,
    status VARCHAR(32) NOT NULL,
    message VARCHAR(500) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_deliveries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_notification_deliveries_notification FOREIGN KEY (notification_id) REFERENCES notifications(id),
    CONSTRAINT fk_notification_deliveries_member FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX idx_notifications_member_created ON notifications (member_id, created_at DESC);
CREATE INDEX idx_notification_deliveries_tenant_created ON notification_deliveries (tenant_id, created_at DESC);

INSERT INTO notifications (id, tenant_id, member_id, channel, event_type, title, body, status, resource_type, resource_id, created_at) VALUES
    ('notification_green_seed_0001', 'tenant_green', 'member_green_amina', 'in_app', 'payment_received', 'Payment received', 'Your mobile-money savings deposit of 250000.00 was posted.', 'unread', 'financial_transaction', 'txn_green_0001', TIMESTAMP WITH TIME ZONE '2026-07-14 09:15:00+00');

INSERT INTO notification_deliveries (id, tenant_id, notification_id, member_id, channel, provider, recipient, status, message, sent_at, created_at) VALUES
    ('delivery_green_seed_sms_0001', 'tenant_green', 'notification_green_seed_0001', 'member_green_amina', 'sms', 'demo_sms', '+256700000001', 'sent', 'Your mobile-money savings deposit of 250000.00 was posted.', TIMESTAMP WITH TIME ZONE '2026-07-14 09:15:05+00', TIMESTAMP WITH TIME ZONE '2026-07-14 09:15:00+00');
