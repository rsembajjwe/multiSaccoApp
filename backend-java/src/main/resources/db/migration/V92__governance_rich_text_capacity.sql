ALTER TABLE governance_meetings
    ALTER COLUMN minutes TYPE TEXT;

ALTER TABLE governance_resolutions
    ALTER COLUMN decision TYPE TEXT;
