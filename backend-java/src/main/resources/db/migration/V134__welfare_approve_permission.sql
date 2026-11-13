-- Maker-checker for welfare claims: Secretary/Treasurer submit (welfare:manage);
-- the Chairperson approves or rejects via a dedicated welfare:approve permission.
-- The SACCO Administrator keeps both. Idempotent for H2/PostgreSQL parity.

INSERT INTO permissions (id, module, action, description)
SELECT 'welfare:approve', 'welfare', 'approve', 'Approve or reject welfare claims.'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE id = 'welfare:approve');

INSERT INTO role_permissions (role_id, permission_id)
SELECT v.role_id, v.permission_id
FROM (
    SELECT 'role_green_chairperson' AS role_id, 'welfare:approve' AS permission_id
    UNION ALL SELECT 'role_green_chairperson', 'welfare:view'
    UNION ALL SELECT 'role_green_admin', 'welfare:approve'
) v
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = v.role_id AND rp.permission_id = v.permission_id
);
