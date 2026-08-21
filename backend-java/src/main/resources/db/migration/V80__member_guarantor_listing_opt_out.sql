-- Privacy: members can opt out of appearing in other members' guarantor search picker.
-- Default false = listable (identity only; no balances are ever exposed in search).
ALTER TABLE members ADD COLUMN guarantor_listing_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
