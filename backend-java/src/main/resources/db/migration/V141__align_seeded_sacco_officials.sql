-- Align the Green Valley demo officials with their existing seeded staff accounts.
-- The original V139 fallback selected the first three members by membership number;
-- this explicit mapping keeps seeded governance and staff identities deterministic.
UPDATE members
SET linked_user_id = CASE id
    WHEN 'member_green_amina' THEN 'user_green_chairperson'
    WHEN 'member_green_daniel' THEN 'user_green_secretary'
    WHEN 'member_green_grace' THEN 'user_green_treasurer'
END,
updated_at = CURRENT_TIMESTAMP
WHERE id IN ('member_green_amina', 'member_green_daniel', 'member_green_grace');

UPDATE sacco_official_assignments
SET member_id = 'member_green_amina',
    assigned_by_user_id = 'user_platform_admin',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'tenant_green'
  AND office = 'chairperson';

UPDATE sacco_official_assignments
SET member_id = 'member_green_daniel',
    assigned_by_user_id = 'user_platform_admin',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'tenant_green'
  AND office = 'secretary';

UPDATE sacco_official_assignments
SET member_id = 'member_green_grace',
    assigned_by_user_id = 'user_platform_admin',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'tenant_green'
  AND office = 'treasurer';