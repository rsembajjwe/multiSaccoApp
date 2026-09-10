-- Secretary should focus on member records, dues follow-up, governance, complaints
-- and communication. Remove back-office finance menus from the secretary role.
DELETE FROM role_permissions
WHERE role_id = 'role_green_secretary'
  AND permission_id IN (
      'welfare:view',
      'welfare:manage',
      'savings-transfer:view',
      'savings-transfer:manage',
      'savings-transfer:create',
      'savings-transfer:approve'
  );
