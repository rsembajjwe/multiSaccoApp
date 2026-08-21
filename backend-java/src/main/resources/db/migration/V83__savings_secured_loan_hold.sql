-- Collateral hold for savings-secured loans: the secured portion of a member's savings is held
-- (not withdrawable/transferable) while the loan is outstanding, and released as it is repaid.
ALTER TABLE members ADD COLUMN savings_hold DECIMAL(18, 2) NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN secured_hold_amount DECIMAL(18, 2) NOT NULL DEFAULT 0;
