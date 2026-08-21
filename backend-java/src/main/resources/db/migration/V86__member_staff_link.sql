-- Optional link between a member record and a staff user account, for people who are both
-- SACCO staff and members. Used to enforce conflict-of-interest controls (a staff member cannot
-- approve or disburse their own loan or approve their own transactions across both identities).
-- Nullable and unique: at most one member per staff user. Multiple NULLs are allowed.
ALTER TABLE members ADD COLUMN linked_user_id VARCHAR(64) REFERENCES users(id);
CREATE UNIQUE INDEX idx_members_linked_user ON members (linked_user_id);
