ALTER TABLE member_documents ADD COLUMN retention_storage_action VARCHAR(80);
ALTER TABLE member_documents ADD COLUMN retention_storage_action_detail VARCHAR(500);
ALTER TABLE member_documents ADD COLUMN retention_storage_action_at TIMESTAMP WITH TIME ZONE;
