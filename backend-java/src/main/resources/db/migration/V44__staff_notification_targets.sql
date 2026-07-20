ALTER TABLE notifications
    ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE notification_deliveries
    ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE notifications
    ADD COLUMN user_id VARCHAR(80);

ALTER TABLE notification_deliveries
    ADD COLUMN user_id VARCHAR(80);

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE notification_deliveries
    ADD CONSTRAINT fk_notification_deliveries_user FOREIGN KEY (user_id) REFERENCES users(id);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
