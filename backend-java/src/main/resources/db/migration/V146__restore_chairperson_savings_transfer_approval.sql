-- Restore the Chairperson's savings-transfer approval right (removed by V111). A high-value savings
-- transfer requires a maker plus two distinct checkers; with only the Treasurer and Admin holding
-- 'savings-transfer:approve', the SACCO had too few officers to exercise that dual control. As the senior
-- elected officer, the Chairperson is an appropriate second approver, giving three distinct approvers
-- (Treasurer, Admin, Chairperson). Idempotent: only inserts the grant when it is not already present.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role_green_chairperson', 'savings-transfer:approve'
WHERE EXISTS (SELECT 1 FROM roles WHERE id = 'role_green_chairperson')
  AND EXISTS (SELECT 1 FROM permissions WHERE id = 'savings-transfer:approve')
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role_id = 'role_green_chairperson' AND permission_id = 'savings-transfer:approve'
  );
