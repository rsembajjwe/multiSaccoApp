CREATE TABLE approval_workflows (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    module VARCHAR(60) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_user_id VARCHAR(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_approval_workflows_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_approval_workflows_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE approval_decisions (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    workflow_id VARCHAR(80) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(80) NOT NULL,
    decision VARCHAR(40) NOT NULL,
    decided_by_user_id VARCHAR(80) NOT NULL,
    reason VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_approval_decisions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_approval_decisions_workflow FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id),
    CONSTRAINT fk_approval_decisions_decided_by FOREIGN KEY (decided_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_approval_workflows_tenant_module ON approval_workflows (tenant_id, module);
CREATE INDEX idx_approval_decisions_tenant_resource ON approval_decisions (tenant_id, resource_type, resource_id);
CREATE INDEX idx_approval_decisions_tenant_decision ON approval_decisions (tenant_id, decision, created_at DESC);

INSERT INTO approval_workflows (
    id,
    tenant_id,
    name,
    module,
    active,
    created_by_user_id
) VALUES
    (
        'workflow_green_transactions',
        'tenant_green',
        'Financial transaction approval',
        'transactions',
        TRUE,
        'user_green_admin'
    ),
    (
        'workflow_green_loans',
        'tenant_green',
        'Loan committee approval',
        'loans',
        TRUE,
        'user_green_admin'
    );
