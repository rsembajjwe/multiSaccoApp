ALTER TABLE member_documents ADD COLUMN retention_status VARCHAR(40) NOT NULL DEFAULT 'active';
ALTER TABLE member_documents ADD COLUMN retention_reason VARCHAR(500);
ALTER TABLE member_documents ADD COLUMN retention_review_due_at DATE;
ALTER TABLE member_documents ADD COLUMN retention_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE member_documents ADD COLUMN retention_actioned_by_user_id VARCHAR(80);

UPDATE member_documents
SET retention_status = 'review_due',
    retention_reason = 'KYC verification expired; review whether the document should be retained, replaced, or disposed.'
WHERE verification_status = 'expired';

CREATE INDEX idx_member_documents_retention_status
    ON member_documents (tenant_id, retention_status, retention_review_due_at);
