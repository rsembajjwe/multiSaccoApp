ALTER TABLE governance_meetings
    ADD COLUMN chair_member_id VARCHAR(64);

ALTER TABLE governance_meetings
    ADD CONSTRAINT fk_governance_meetings_chair_member
    FOREIGN KEY (chair_member_id) REFERENCES members(id);

CREATE INDEX idx_governance_meetings_chair_member ON governance_meetings (chair_member_id);
