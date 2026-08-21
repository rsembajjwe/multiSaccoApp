-- Dual approval for high-value savings transfers: at or above the dual-approval threshold, a transfer
-- must be approved by TWO distinct checkers (neither being the maker) before it posts. The first approval
-- moves it to 'awaiting_second_approval'; a second, different checker then posts it.
ALTER TABLE savings_transfers ADD COLUMN first_approved_by_user_id VARCHAR(80);
ALTER TABLE savings_transfers ADD COLUMN first_approved_at TIMESTAMP WITH TIME ZONE;
