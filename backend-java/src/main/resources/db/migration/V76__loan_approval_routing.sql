-- Amount-based loan approval routing: dual approval (first/second) for mid-value
-- loans and a recorded committee resolution reference for high-value loans.
ALTER TABLE loans ADD COLUMN first_approved_by_user_id VARCHAR(64);
ALTER TABLE loans ADD COLUMN first_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE loans ADD COLUMN resolution_reference VARCHAR(120);
