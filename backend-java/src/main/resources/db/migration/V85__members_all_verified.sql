-- Members are entered directly by SACCO staff (the chairperson), so they are trusted on entry
-- and there is no separate KYC verification step. Every member is kept 'verified'; the column is
-- retained only as a constant compliance/reporting record. This clears any legacy
-- 'pending_verification' (and similar non-verified) states from the seed data.
UPDATE members SET kyc_status = 'verified' WHERE kyc_status IS NULL OR kyc_status <> 'verified';
