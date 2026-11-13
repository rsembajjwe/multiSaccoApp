-- The Green Valley demo SACCO prices staff-captured loans at 2% monthly (matching the Emergency Loan
-- product rate its loan fixtures and tests are calibrated against). V116 defaulted every profile's
-- loan_interest_rate to 1.5%, which made create()-issued loans price at 1.5% and diverge from the seeded
-- loan book (e.g. loan_green_0002's 96,000 interest) and the loan-lifecycle test expectations.
UPDATE sacco_profiles SET loan_interest_rate = 2.0000 WHERE tenant_id = 'tenant_green';
