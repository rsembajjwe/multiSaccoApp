ALTER TABLE sacco_profiles ADD COLUMN membership_dues_period VARCHAR(20) NOT NULL DEFAULT 'annual';
ALTER TABLE sacco_profiles ADD COLUMN membership_calendar_start_month INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sacco_profiles ADD COLUMN membership_calendar_start_day INTEGER NOT NULL DEFAULT 1;

UPDATE sacco_profiles
SET membership_dues_period = 'annual',
    membership_calendar_start_month = 1,
    membership_calendar_start_day = 1
WHERE membership_dues_period IS NULL;

ALTER TABLE sacco_profiles ADD CONSTRAINT ck_sacco_profiles_membership_dues_period CHECK (membership_dues_period IN ('once', 'monthly', 'annual'));
ALTER TABLE sacco_profiles ADD CONSTRAINT ck_sacco_profiles_calendar_month CHECK (membership_calendar_start_month BETWEEN 1 AND 12);
ALTER TABLE sacco_profiles ADD CONSTRAINT ck_sacco_profiles_calendar_day CHECK (membership_calendar_start_day BETWEEN 1 AND 31);

INSERT INTO permissions (id, module, action, description)
SELECT 'sacco-profile:manage', 'settings', 'manage', 'Manage SACCO profile and membership calendar policy.'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE id = 'sacco-profile:manage'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM (VALUES
    ('role_green_admin', 'sacco-profile:manage'),
    ('role_green_chairperson', 'sacco-profile:manage')
) AS grants(role_id, permission_id)
WHERE EXISTS (SELECT 1 FROM roles WHERE id = grants.role_id)
  AND EXISTS (SELECT 1 FROM permissions WHERE id = grants.permission_id)
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role_id = grants.role_id
        AND permission_id = grants.permission_id
  );
