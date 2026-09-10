CREATE TABLE complaint_messages (
    id VARCHAR(80) PRIMARY KEY,
    complaint_id VARCHAR(80) NOT NULL,
    tenant_id VARCHAR(80) NOT NULL,
    sender_type VARCHAR(24) NOT NULL,
    sender_user_id VARCHAR(80),
    sender_member_id VARCHAR(80),
    visibility VARCHAR(24) NOT NULL,
    action VARCHAR(40) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaint_messages_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    CONSTRAINT fk_complaint_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_complaint_messages_user FOREIGN KEY (sender_user_id) REFERENCES users(id),
    CONSTRAINT fk_complaint_messages_member FOREIGN KEY (sender_member_id) REFERENCES members(id)
);

CREATE INDEX idx_complaint_messages_complaint_created ON complaint_messages (complaint_id, created_at);
CREATE INDEX idx_complaint_messages_tenant_created ON complaint_messages (tenant_id, created_at DESC);
CREATE INDEX idx_complaint_messages_visibility ON complaint_messages (complaint_id, visibility, created_at);

INSERT INTO complaint_messages (
    id,
    complaint_id,
    tenant_id,
    sender_type,
    sender_user_id,
    sender_member_id,
    visibility,
    action,
    message,
    created_at
)
SELECT
    id || '_opening',
    id,
    tenant_id,
    CASE WHEN created_by_member_id IS NULL THEN 'staff' ELSE 'member' END,
    created_by_user_id,
    created_by_member_id,
    'member_visible',
    'opened',
    description,
    created_at
FROM complaints
WHERE description IS NOT NULL
  AND description <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM complaint_messages
      WHERE complaint_messages.id = complaints.id || '_opening'
  );

INSERT INTO complaint_messages (
    id,
    complaint_id,
    tenant_id,
    sender_type,
    sender_user_id,
    sender_member_id,
    visibility,
    action,
    message,
    created_at
)
SELECT
    id || '_legacy_resolution',
    id,
    tenant_id,
    'staff',
    resolved_by_user_id,
    NULL,
    'member_visible',
    'legacy_resolution',
    resolution_notes,
    updated_at
FROM complaints
WHERE resolution_notes IS NOT NULL
  AND resolution_notes <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM complaint_messages
      WHERE complaint_messages.id = complaints.id || '_legacy_resolution'
  );
