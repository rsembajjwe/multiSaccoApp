CREATE INDEX idx_financial_transactions_approval_queue
    ON financial_transactions (status, created_at, id);

CREATE INDEX idx_financial_transactions_approval_channel
    ON financial_transactions (status, channel, created_at);
