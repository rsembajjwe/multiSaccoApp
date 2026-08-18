-- Persisted reconciliation attribution: staff can confirm (or override the suggested) SACCO-owned
-- collection account that an imported statement line / mobile-money callback settled into. This makes
-- the destination account durable evidence, not just a per-request heuristic in the reconciliation view.
--
-- Nullable FK to sacco_payment_accounts; NULL means "not yet confirmed" (the read model then falls back
-- to the heuristic suggestion). No CHECK constraints on the columns, consistent with the H2/PostgreSQL
-- parity constraints documented in V61.

ALTER TABLE statement_lines
    ADD COLUMN collection_account_id VARCHAR(64);

ALTER TABLE statement_lines
    ADD CONSTRAINT fk_statement_lines_collection_account
    FOREIGN KEY (collection_account_id) REFERENCES sacco_payment_accounts(id);

CREATE INDEX idx_statement_lines_collection_account ON statement_lines (collection_account_id);

ALTER TABLE mobile_money_callbacks
    ADD COLUMN collection_account_id VARCHAR(64);

ALTER TABLE mobile_money_callbacks
    ADD CONSTRAINT fk_mobile_money_callbacks_collection_account
    FOREIGN KEY (collection_account_id) REFERENCES sacco_payment_accounts(id);

CREATE INDEX idx_mobile_money_callbacks_collection_account ON mobile_money_callbacks (collection_account_id);
