ALTER TABLE sacco_profiles
    ADD COLUMN savings_cycle_period VARCHAR(16) NOT NULL DEFAULT 'continuous',
    ADD COLUMN savings_cycle_start_month INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN savings_cycle_start_day INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN savings_withdrawal_window_days INTEGER NOT NULL DEFAULT 30;

ALTER TABLE sacco_profiles
    ADD CONSTRAINT ck_sacco_profiles_savings_cycle_period
        CHECK (savings_cycle_period IN ('continuous', 'annual')),
    ADD CONSTRAINT ck_sacco_profiles_savings_cycle_month
        CHECK (savings_cycle_start_month BETWEEN 1 AND 12),
    ADD CONSTRAINT ck_sacco_profiles_savings_cycle_day
        CHECK (savings_cycle_start_day BETWEEN 1 AND 31),
    ADD CONSTRAINT ck_sacco_profiles_savings_window_days
        CHECK (savings_withdrawal_window_days BETWEEN 1 AND 366);
