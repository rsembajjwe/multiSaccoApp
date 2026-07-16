CREATE TABLE permissions (
    id VARCHAR(80) PRIMARY KEY,
    module VARCHAR(60) NOT NULL,
    action VARCHAR(40) NOT NULL,
    description VARCHAR(240) NOT NULL
);

CREATE TABLE roles (
    id VARCHAR(80) PRIMARY KEY,
    tenant_id VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    protected_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT uk_roles_tenant_name UNIQUE (tenant_id, name)
);

CREATE TABLE role_permissions (
    role_id VARCHAR(80) NOT NULL,
    permission_id VARCHAR(80) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE user_roles (
    user_id VARCHAR(80) NOT NULL,
    role_id VARCHAR(80) NOT NULL,
    tenant_id VARCHAR(80) NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_user_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_roles_tenant_name ON roles (tenant_id, name);
CREATE INDEX idx_user_roles_tenant_user ON user_roles (tenant_id, user_id);

INSERT INTO permissions (id, module, action, description) VALUES
    ('tenants:view', 'tenants', 'view', 'View SACCO tenants and onboarding status.'),
    ('tenants:manage', 'tenants', 'manage', 'Create and review SACCO tenants.'),
    ('users:view', 'users', 'view', 'View staff users.'),
    ('users:create', 'users', 'create', 'Create staff users.'),
    ('roles:view', 'roles', 'view', 'View roles and permissions.'),
    ('roles:create', 'roles', 'create', 'Create custom roles.'),
    ('members:view', 'members', 'view', 'View member profiles and balances.'),
    ('members:create', 'members', 'create', 'Register members.'),
    ('members:approve', 'members', 'approve', 'Approve or change member status.'),
    ('transactions:view', 'transactions', 'view', 'View financial transactions.'),
    ('transactions:create', 'transactions', 'create', 'Submit financial transactions.'),
    ('transactions:approve', 'transactions', 'approve', 'Approve or reject financial transactions.'),
    ('loans:view', 'loans', 'view', 'View loan files.'),
    ('loans:create', 'loans', 'create', 'Submit loan applications.'),
    ('loans:approve', 'loans', 'approve', 'Approve or reject loans.'),
    ('accounting:view', 'accounting', 'view', 'View accounting records and reports.'),
    ('accounting:post', 'accounting', 'post', 'Post accounting-affecting records.'),
    ('reports:view', 'reports', 'view', 'View operational and regulatory reports.'),
    ('approvals:view', 'approvals', 'view', 'View approval workflows and decisions.'),
    ('approvals:decide', 'approvals', 'decide', 'Record approval decisions.');

INSERT INTO roles (id, tenant_id, name, protected_role, created_by_user_id) VALUES
    ('role_platform_admin', 'tenant_platform', 'Platform Administrator', TRUE, 'user_platform_admin'),
    ('role_green_admin', 'tenant_green', 'SACCO Administrator', TRUE, 'user_green_admin'),
    ('role_green_loans_officer', 'tenant_green', 'Loans Officer', TRUE, 'user_green_admin');

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_platform_admin', 'tenants:view'),
    ('role_platform_admin', 'tenants:manage'),
    ('role_platform_admin', 'users:view'),
    ('role_platform_admin', 'users:create'),
    ('role_platform_admin', 'roles:view'),
    ('role_platform_admin', 'roles:create'),
    ('role_platform_admin', 'reports:view'),
    ('role_green_admin', 'users:view'),
    ('role_green_admin', 'users:create'),
    ('role_green_admin', 'roles:view'),
    ('role_green_admin', 'roles:create'),
    ('role_green_admin', 'members:view'),
    ('role_green_admin', 'members:create'),
    ('role_green_admin', 'members:approve'),
    ('role_green_admin', 'transactions:view'),
    ('role_green_admin', 'transactions:create'),
    ('role_green_admin', 'transactions:approve'),
    ('role_green_admin', 'loans:view'),
    ('role_green_admin', 'loans:create'),
    ('role_green_admin', 'loans:approve'),
    ('role_green_admin', 'accounting:view'),
    ('role_green_admin', 'accounting:post'),
    ('role_green_admin', 'reports:view'),
    ('role_green_admin', 'approvals:view'),
    ('role_green_admin', 'approvals:decide'),
    ('role_green_loans_officer', 'members:view'),
    ('role_green_loans_officer', 'loans:view'),
    ('role_green_loans_officer', 'loans:create'),
    ('role_green_loans_officer', 'approvals:view');

INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES
    ('user_platform_admin', 'role_platform_admin', 'tenant_platform'),
    ('user_green_admin', 'role_green_admin', 'tenant_green');
