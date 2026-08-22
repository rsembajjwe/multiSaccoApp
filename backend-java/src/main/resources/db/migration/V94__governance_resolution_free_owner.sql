ALTER TABLE governance_resolutions
    ADD COLUMN owner_name VARCHAR(180);

ALTER TABLE governance_resolutions
    ADD COLUMN owner_title VARCHAR(120);

UPDATE governance_resolutions resolution
SET owner_name = (
    SELECT member.full_name
    FROM members member
    WHERE member.id = resolution.owner_member_id
    FETCH FIRST 1 ROW ONLY
)
WHERE owner_name IS NULL
  AND owner_member_id IS NOT NULL;

UPDATE governance_resolutions
SET owner_title = 'Member'
WHERE owner_title IS NULL
  AND owner_name IS NOT NULL;
