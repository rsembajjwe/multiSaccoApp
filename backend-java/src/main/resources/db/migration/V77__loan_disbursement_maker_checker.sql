-- Maker-checker on loan disbursement: one officer initiates the payout, a second,
-- distinct officer confirms it before the money moves.
ALTER TABLE loans ADD COLUMN disbursement_initiated_by_user_id VARCHAR(64);
ALTER TABLE loans ADD COLUMN disbursement_initiated_at TIMESTAMP WITH TIME ZONE;
