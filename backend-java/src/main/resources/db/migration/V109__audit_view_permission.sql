-- H2/M1 hardening: dedicated audit:view permission.
-- Previously the audit-log listing endpoint authenticated the caller but did not
-- check any permission, so any authenticated tenant user could read the SACCO
-- audit trail, and any platform user could read every tenant's audit trail.
-- The role matrix restricts Audit Logs to SACCO Administrator + Auditor and, on
-- the platform side, Super Admin + Compliance Officer. This permission makes that
-- enforceable; the controller now gates on it.
INSERT INTO permissions (id, module, action, description) VALUES
    ('audit:view', 'audit', 'view', 'Review sensitive audit activity and access history.');

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_platform_super_admin', 'audit:view'),
    ('role_platform_admin', 'audit:view'),
    ('role_platform_compliance_officer', 'audit:view'),
    ('role_green_admin', 'audit:view'),
    ('role_green_auditor', 'audit:view');
