-- M3 hardening: remove the Chairperson's money-movement authority (savings-transfer
-- approval and loan disbursement), keeping its oversight and loan-APPROVAL role.
--
-- Loan disbursement previously shared loans:approve, so a dedicated loans:disburse
-- permission is introduced to separate "approve a loan" from "release the funds".
-- Disbursement stays two-officer dual control: Admin + Treasurer are the disbursing
-- officers. Savings-transfer approval moves to the Treasurer (the SACCO's choice) plus
-- the Secretary -- the Secretary is the non-maker second signatory required by the
-- two-distinct-approver high-value transfer flow, because the Treasurer is the transfer
-- maker and cannot approve their own transfer.

INSERT INTO permissions (id, module, action, description) VALUES
    ('loans:disburse', 'loans', 'disburse', 'Release funds for an approved loan (two-officer control).');

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_green_admin', 'loans:disburse'),
    ('role_green_treasurer', 'loans:disburse'),
    ('role_green_treasurer', 'savings-transfer:approve'),
    ('role_green_secretary', 'savings-transfer:approve'),
    ('role_green_secretary', 'savings-transfer:view');

DELETE FROM role_permissions
WHERE role_id = 'role_green_chairperson'
  AND permission_id IN ('savings-transfer:approve', 'savings-transfer:manage', 'savings-transfer:view');
