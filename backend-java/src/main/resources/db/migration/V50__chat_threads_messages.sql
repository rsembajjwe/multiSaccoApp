-- Real chat data model for the WhatsApp-style support workspace.
-- Threads support unlimited back-and-forth messages and two relationship types:
--   MEMBER_SUPPORT   : SACCO member <-> SACCO staff
--   PLATFORM_SUPPORT : SACCO staff  <-> Platform Super Admin
-- Every thread belongs to a SACCO (tenant_id) for isolation, even platform threads.

CREATE TABLE chat_threads (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    type VARCHAR(24) NOT NULL,
    member_id VARCHAR(80),
    subject VARCHAR(180) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    complaint_id VARCHAR(80),
    last_message_at TIMESTAMP WITH TIME ZONE,
    member_last_read_at TIMESTAMP WITH TIME ZONE,
    staff_last_read_at TIMESTAMP WITH TIME ZONE,
    platform_last_read_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id VARCHAR(80),
    created_by_member_id VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_chat_threads_type CHECK (type IN ('MEMBER_SUPPORT', 'PLATFORM_SUPPORT')),
    CONSTRAINT fk_chat_threads_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_chat_threads_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_chat_threads_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);

CREATE INDEX idx_chat_threads_tenant_type_recent ON chat_threads (tenant_id, type, last_message_at DESC);
CREATE INDEX idx_chat_threads_member_recent ON chat_threads (member_id, last_message_at DESC);
CREATE INDEX idx_chat_threads_type_recent ON chat_threads (type, last_message_at DESC);

CREATE TABLE chat_messages (
    id VARCHAR(80) PRIMARY KEY,
    thread_id VARCHAR(80) NOT NULL,
    tenant_id VARCHAR(80) NOT NULL,
    sender_type VARCHAR(16) NOT NULL,
    sender_id VARCHAR(80) NOT NULL,
    body VARCHAR(4000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_chat_messages_sender_type CHECK (sender_type IN ('MEMBER', 'STAFF', 'PLATFORM')),
    CONSTRAINT fk_chat_messages_thread FOREIGN KEY (thread_id) REFERENCES chat_threads(id),
    CONSTRAINT fk_chat_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_chat_messages_thread_created ON chat_messages (thread_id, created_at);
CREATE INDEX idx_chat_messages_tenant ON chat_messages (tenant_id);

-- Backfill: fold every existing complaint into a MEMBER_SUPPORT thread so history is preserved.
INSERT INTO chat_threads (
    id,
    tenant_id,
    type,
    member_id,
    subject,
    status,
    complaint_id,
    last_message_at,
    created_by_user_id,
    created_by_member_id,
    created_at,
    updated_at
)
SELECT
    'chat_' || c.id,
    c.tenant_id,
    'MEMBER_SUPPORT',
    c.member_id,
    c.subject,
    c.status,
    c.id,
    c.updated_at,
    c.created_by_user_id,
    c.created_by_member_id,
    c.created_at,
    c.updated_at
FROM complaints c;

-- The original complaint text becomes the first message (from the member if they raised it, else staff).
INSERT INTO chat_messages (id, thread_id, tenant_id, sender_type, sender_id, body, created_at)
SELECT
    'msg_' || c.id || '_1',
    'chat_' || c.id,
    c.tenant_id,
    CASE WHEN c.created_by_member_id IS NOT NULL THEN 'MEMBER' ELSE 'STAFF' END,
    COALESCE(c.created_by_member_id, c.created_by_user_id, c.member_id, 'system'),
    COALESCE(NULLIF(c.description, ''), c.subject),
    c.created_at
FROM complaints c;

-- Any existing resolution note becomes the first staff reply message.
INSERT INTO chat_messages (id, thread_id, tenant_id, sender_type, sender_id, body, created_at)
SELECT
    'msg_' || c.id || '_2',
    'chat_' || c.id,
    c.tenant_id,
    'STAFF',
    COALESCE(c.resolved_by_user_id, c.assigned_user_id, c.created_by_user_id, 'system'),
    c.resolution_notes,
    COALESCE(c.resolved_at, c.updated_at)
FROM complaints c
WHERE c.resolution_notes IS NOT NULL AND c.resolution_notes <> '';
