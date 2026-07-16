CREATE TABLE member_documents (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    document_type VARCHAR(80) NOT NULL,
    storage_key VARCHAR(240) NOT NULL,
    verification_status VARCHAR(40) NOT NULL,
    uploaded_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_documents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_member_documents_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_member_documents_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_member_documents_member ON member_documents (member_id, created_at DESC);
CREATE INDEX idx_member_documents_tenant_status ON member_documents (tenant_id, verification_status);

INSERT INTO member_documents (
    id,
    tenant_id,
    member_id,
    document_type,
    storage_key,
    verification_status,
    uploaded_by_user_id
) VALUES
    (
        'doc_green_amina_nin',
        'tenant_green',
        'member_green_amina',
        'national_id',
        'tenant_green/members/GVS-0001/national-id.pdf',
        'verified',
        'user_green_admin'
    ),
    (
        'doc_green_daniel_photo',
        'tenant_green',
        'member_green_daniel',
        'photo',
        'tenant_green/members/GVS-0002/photo.jpg',
        'pending_verification',
        'user_green_admin'
    );
