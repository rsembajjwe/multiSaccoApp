CREATE TABLE member_next_of_kin (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    relationship VARCHAR(80) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    address VARCHAR(240),
    primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_next_of_kin_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_member_next_of_kin_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_member_next_of_kin_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE member_beneficiaries (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    member_id VARCHAR(80) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    relationship VARCHAR(80) NOT NULL,
    phone VARCHAR(40),
    allocation_percent DECIMAL(5, 2) NOT NULL,
    created_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_beneficiaries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_member_beneficiaries_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_member_beneficiaries_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_member_next_of_kin_member ON member_next_of_kin (member_id, created_at DESC);
CREATE INDEX idx_member_beneficiaries_member ON member_beneficiaries (member_id, created_at DESC);

INSERT INTO member_next_of_kin (
    id,
    tenant_id,
    member_id,
    full_name,
    relationship,
    phone,
    address,
    primary_contact,
    created_by_user_id
) VALUES
    (
        'kin_green_amina_001',
        'tenant_green',
        'member_green_amina',
        'Sarah Namusoke',
        'sister',
        '+256701111222',
        'Mukono Central',
        TRUE,
        'user_green_admin'
    );

INSERT INTO member_beneficiaries (
    id,
    tenant_id,
    member_id,
    full_name,
    relationship,
    phone,
    allocation_percent,
    created_by_user_id
) VALUES
    (
        'beneficiary_green_amina_001',
        'tenant_green',
        'member_green_amina',
        'Noah Kato',
        'son',
        '+256702222333',
        60.00,
        'user_green_admin'
    );
