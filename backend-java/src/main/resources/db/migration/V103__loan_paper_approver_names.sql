ALTER TABLE loans
    ADD COLUMN IF NOT EXISTS paper_approval_approvers VARCHAR(500);
