ALTER TABLE financial_transactions
    ADD COLUMN original_transaction_id VARCHAR(64);

ALTER TABLE financial_transactions
    ADD COLUMN reversal_reason VARCHAR(240);

ALTER TABLE financial_transactions
    ADD CONSTRAINT fk_financial_transactions_original FOREIGN KEY (original_transaction_id) REFERENCES financial_transactions(id);

CREATE INDEX idx_financial_transactions_original ON financial_transactions (original_transaction_id);
