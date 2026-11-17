UPDATE members member
SET email = CASE assignment.office
        WHEN 'chairperson' THEN 'rsembajjwe@gmail.com'
        WHEN 'treasurer' THEN 'rsembajjwe1@gmail.com'
        WHEN 'secretary' THEN 'rsembajjwe2@gmail.com'
    END,
    updated_at = CURRENT_TIMESTAMP
FROM sacco_official_assignments assignment
WHERE assignment.member_id = member.id
  AND assignment.tenant_id = member.tenant_id
  AND assignment.office IN ('chairperson', 'treasurer', 'secretary');

UPDATE users staff_user
SET email = CASE assignment.office
        WHEN 'chairperson' THEN 'rsembajjwe@gmail.com'
        WHEN 'treasurer' THEN 'rsembajjwe1@gmail.com'
        WHEN 'secretary' THEN 'rsembajjwe2@gmail.com'
    END
FROM members member
JOIN sacco_official_assignments assignment
  ON assignment.member_id = member.id
 AND assignment.tenant_id = member.tenant_id
WHERE staff_user.id = member.linked_user_id
  AND staff_user.tenant_id = member.tenant_id
  AND assignment.office IN ('chairperson', 'treasurer', 'secretary');
