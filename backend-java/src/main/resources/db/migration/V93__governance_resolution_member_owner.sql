ALTER TABLE governance_resolutions
    ADD COLUMN owner_member_id VARCHAR(64);

ALTER TABLE governance_resolutions
    ADD CONSTRAINT fk_governance_resolutions_owner_member
    FOREIGN KEY (owner_member_id) REFERENCES members(id);

UPDATE governance_resolutions
SET owner_member_id = (
    SELECT member.id
    FROM members member
    WHERE member.linked_user_id = governance_resolutions.owner_user_id
      AND member.tenant_id = governance_resolutions.tenant_id
    FETCH FIRST 1 ROW ONLY
)
WHERE owner_member_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM members member
      WHERE member.linked_user_id = governance_resolutions.owner_user_id
        AND member.tenant_id = governance_resolutions.tenant_id
  );

CREATE INDEX idx_governance_resolutions_owner_member ON governance_resolutions (owner_member_id);
