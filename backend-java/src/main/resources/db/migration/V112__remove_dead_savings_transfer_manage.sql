-- L3 catalog hygiene: remove the dead savings-transfer:manage permission. It was seeded
-- but is never checked by any controller (savings-transfer:create / :approve / :view are the
-- live permissions). Dropping it prevents confusing no-op role grants.
DELETE FROM role_permissions WHERE permission_id = 'savings-transfer:manage';
DELETE FROM permissions WHERE id = 'savings-transfer:manage';
