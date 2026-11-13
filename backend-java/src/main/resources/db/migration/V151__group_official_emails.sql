ALTER TABLE group_officials
    ADD COLUMN IF NOT EXISTS email VARCHAR(160);

UPDATE group_officials
SET email = LOWER(role) || '+' || id || '@pending.local'
WHERE email IS NULL OR TRIM(email) = '';

ALTER TABLE group_officials
    ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_official_phone
    ON group_officials (member_id, phone);

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_official_email
    ON group_officials (member_id, email);
