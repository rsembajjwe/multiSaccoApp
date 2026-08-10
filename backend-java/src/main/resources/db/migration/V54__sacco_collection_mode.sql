-- Platform-controlled payment collection mode per SACCO, plus SACCO-admin activation flags.
--
-- allowed_collection_mode is set by the Platform Super Admin (NONE / MOBILE_MONEY_ONLY / BANK_ONLY /
-- BOTH). The two *_active flags are set by the SACCO admin and only take effect for channels the
-- allowed mode permits. No CHECK constraint on the mode string: H2 (PostgreSQL mode) rejects
-- Hibernate parameterized writes against string IN(...) CHECK constraints, so allowed values are
-- enforced in the application layer (see CollectionMode).

ALTER TABLE tenants ADD COLUMN allowed_collection_mode VARCHAR(32) NOT NULL DEFAULT 'NONE';
ALTER TABLE tenants ADD COLUMN mobile_money_collection_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN bank_collection_active BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing active SACCOs keep working: allow both channels and activate mobile money (the channel
-- that is actually implemented today). Bank stays inactive until a SACCO admin turns it on. New
-- SACCOs keep the column default of NONE until the platform enables them.
UPDATE tenants
   SET allowed_collection_mode = 'BOTH',
       mobile_money_collection_active = TRUE
 WHERE status = 'active';
