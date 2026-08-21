-- Governance hardening for savings transfers:
--   * Separate maker/checker duties: the treasurer/finance officer initiates (create), the chairperson/
--     board approves, rejects or reverses (approve). No single person both executes and oversees.
--   * Capture the member's authorization for a movement, and a board/AGM resolution for group deductions,
--     so member funds are never moved without a recorded mandate.
ALTER TABLE savings_transfers ADD COLUMN authorization_reference VARCHAR(240);
ALTER TABLE savings_transfers ADD COLUMN resolution_reference VARCHAR(240);

INSERT INTO permissions (id, module, action, description) VALUES
    ('savings-transfer:create', 'savings-transfer', 'create', 'Initiate (make) savings transfers and group deductions.'),
    ('savings-transfer:approve', 'savings-transfer', 'approve', 'Approve, reject or reverse savings transfers.');

-- Treasurer/finance officer is the maker; chairperson/board is the checker. Admin retains both (still
-- subject to maker-checker: nobody can approve their own transfer).
INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_green_treasurer', 'savings-transfer:create'),
    ('role_green_admin', 'savings-transfer:create'),
    ('role_green_chairperson', 'savings-transfer:approve'),
    ('role_green_admin', 'savings-transfer:approve');
