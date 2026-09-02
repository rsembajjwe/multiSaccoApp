-- M2 hardening: dedicated Welfare and Member-Subscription permissions.
-- These functions are separated in the role matrix, but were gated on the coarse
-- transactions:* / members:* permissions -- so a Secretary who owns Welfare in the
-- matrix could not use it while a Teller could, and a Treasurer who owns Member
-- Subscriptions could not load them. These permissions make the matrix enforceable;
-- the controllers and the web menu now gate on them.
--
-- Welfare payment/disbursement deliberately stays on accounting:post (a financial
-- posting), so welfare:view is also granted to the Treasurer and Accountant who
-- disburse approved claims, while welfare:manage (submit/decide) is limited to the
-- SACCO Administrator and Secretary.
INSERT INTO permissions (id, module, action, description) VALUES
    ('welfare:view', 'welfare', 'view', 'View welfare contributions, balances and claims.'),
    ('welfare:manage', 'welfare', 'manage', 'Submit and decide welfare claims.'),
    ('member-subscription:view', 'member-subscription', 'view', 'View member subscription dues and expiry.'),
    ('member-subscription:manage', 'member-subscription', 'manage', 'Assign and record member subscription payments.');

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('role_green_admin', 'welfare:view'),
    ('role_green_admin', 'welfare:manage'),
    ('role_green_secretary', 'welfare:view'),
    ('role_green_secretary', 'welfare:manage'),
    ('role_green_treasurer', 'welfare:view'),
    ('role_green_accountant', 'welfare:view'),
    ('role_green_admin', 'member-subscription:view'),
    ('role_green_admin', 'member-subscription:manage'),
    ('role_green_treasurer', 'member-subscription:view'),
    ('role_green_treasurer', 'member-subscription:manage'),
    ('role_green_secretary', 'member-subscription:view'),
    ('role_green_secretary', 'member-subscription:manage');
