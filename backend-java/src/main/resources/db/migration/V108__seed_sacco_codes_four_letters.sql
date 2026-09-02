-- Align demo/seed SACCO codes with the production rule: SACCO codes are four letters.
-- Historical databases that already applied older seed migrations receive the same values
-- now used by fresh seed data.

UPDATE tenants
SET abbreviation = CASE id
    WHEN 'tenant_green' THEN 'GREE'
    WHEN 'tenant_lake' THEN 'LAKE'
    WHEN 'tenant_pending' THEN 'KIGE'
    WHEN 'tenant_kigezi' THEN 'KABA'
    WHEN 'tenant_masaka' THEN 'MASA'
    WHEN 'tenant_gulu' THEN 'GULU'
    WHEN 'tenant_mbale' THEN 'MBAL'
    WHEN 'tenant_hoima' THEN 'HOIM'
    ELSE abbreviation
END,
updated_at = CURRENT_TIMESTAMP
WHERE id IN (
    'tenant_green',
    'tenant_lake',
    'tenant_pending',
    'tenant_kigezi',
    'tenant_masaka',
    'tenant_gulu',
    'tenant_mbale',
    'tenant_hoima'
);

UPDATE tenants SET registration_no = REPLACE(registration_no, 'GVS', 'GREE') WHERE registration_no LIKE '%GVS%';
UPDATE tenants SET registration_no = REPLACE(registration_no, 'LFS', 'LAKE') WHERE registration_no LIKE '%LFS%';
UPDATE tenants SET registration_no = REPLACE(registration_no, 'KTS', 'KIGE') WHERE registration_no LIKE '%KTS%';
UPDATE tenants SET registration_no = REPLACE(registration_no, 'KBS', 'KABA') WHERE registration_no LIKE '%KBS%';
UPDATE tenants SET registration_no = REPLACE(registration_no, 'MMS', 'MASA') WHERE registration_no LIKE '%MMS%';
UPDATE tenants SET registration_no = REPLACE(registration_no, 'GTS', 'GULU') WHERE registration_no LIKE '%GTS%';
UPDATE tenants SET registration_no = REPLACE(registration_no, 'MWS', 'MBAL') WHERE registration_no LIKE '%MWS%';
UPDATE tenants SET registration_no = REPLACE(registration_no, 'HOW', 'HOIM') WHERE registration_no LIKE '%HOW%';

UPDATE sacco_profiles SET umra_license_no = REPLACE(umra_license_no, 'GVS', 'GREE') WHERE umra_license_no LIKE '%GVS%';
UPDATE sacco_profiles SET cooperative_registration_no = REPLACE(cooperative_registration_no, 'GVS', 'GREE') WHERE cooperative_registration_no LIKE '%GVS%';
UPDATE sacco_profiles SET umra_license_no = REPLACE(umra_license_no, 'KBS', 'KABA') WHERE umra_license_no LIKE '%KBS%';
UPDATE sacco_profiles SET cooperative_registration_no = REPLACE(cooperative_registration_no, 'KBS', 'KABA') WHERE cooperative_registration_no LIKE '%KBS%';
UPDATE sacco_profiles SET umra_license_no = REPLACE(umra_license_no, 'MMS', 'MASA') WHERE umra_license_no LIKE '%MMS%';
UPDATE sacco_profiles SET cooperative_registration_no = REPLACE(cooperative_registration_no, 'MMS', 'MASA') WHERE cooperative_registration_no LIKE '%MMS%';
UPDATE sacco_profiles SET umra_license_no = REPLACE(umra_license_no, 'GTS', 'GULU') WHERE umra_license_no LIKE '%GTS%';
UPDATE sacco_profiles SET cooperative_registration_no = REPLACE(cooperative_registration_no, 'GTS', 'GULU') WHERE cooperative_registration_no LIKE '%GTS%';
UPDATE sacco_profiles SET umra_license_no = REPLACE(umra_license_no, 'MWS', 'MBAL') WHERE umra_license_no LIKE '%MWS%';
UPDATE sacco_profiles SET cooperative_registration_no = REPLACE(cooperative_registration_no, 'MWS', 'MBAL') WHERE cooperative_registration_no LIKE '%MWS%';
UPDATE sacco_profiles SET umra_license_no = REPLACE(umra_license_no, 'HOW', 'HOIM') WHERE umra_license_no LIKE '%HOW%';
UPDATE sacco_profiles SET cooperative_registration_no = REPLACE(cooperative_registration_no, 'HOW', 'HOIM') WHERE cooperative_registration_no LIKE '%HOW%';

UPDATE members SET membership_no = REPLACE(membership_no, 'GVS-', 'GREE-') WHERE membership_no LIKE 'GVS-%';
UPDATE members SET membership_no = REPLACE(membership_no, 'LFS-', 'LAKE-') WHERE membership_no LIKE 'LFS-%';
UPDATE members SET membership_no = REPLACE(membership_no, 'KTS-', 'KIGE-') WHERE membership_no LIKE 'KTS-%';
UPDATE members SET membership_no = REPLACE(membership_no, 'KBS-', 'KABA-') WHERE membership_no LIKE 'KBS-%';
UPDATE members SET membership_no = REPLACE(membership_no, 'MMS-', 'MASA-') WHERE membership_no LIKE 'MMS-%';
UPDATE members SET membership_no = REPLACE(membership_no, 'GTS-', 'GULU-') WHERE membership_no LIKE 'GTS-%';
UPDATE members SET membership_no = REPLACE(membership_no, 'MWS-', 'MBAL-') WHERE membership_no LIKE 'MWS-%';
UPDATE members SET membership_no = REPLACE(membership_no, 'HOW-', 'HOIM-') WHERE membership_no LIKE 'HOW-%';

UPDATE financial_products SET code = REPLACE(code, 'GVS-', 'GREE-') WHERE code LIKE 'GVS-%';
UPDATE financial_products SET code = REPLACE(code, 'LFS-', 'LAKE-') WHERE code LIKE 'LFS-%';
UPDATE financial_accounts SET account_no = REPLACE(account_no, 'GVS-', 'GREE-') WHERE account_no LIKE 'GVS-%';
UPDATE financial_accounts SET account_no = REPLACE(account_no, 'LFS-', 'LAKE-') WHERE account_no LIKE 'LFS-%';

UPDATE financial_transactions SET reference = REPLACE(reference, 'GVS-', 'GREE-') WHERE reference LIKE '%GVS-%';
UPDATE loan_repayments SET reference = REPLACE(reference, 'GVS-', 'GREE-') WHERE reference LIKE '%GVS-%';
UPDATE statement_lines SET external_reference = REPLACE(external_reference, 'GVS-', 'GREE-') WHERE external_reference LIKE '%GVS-%';
UPDATE mobile_money_callbacks SET external_reference = REPLACE(external_reference, 'GVS-', 'GREE-') WHERE external_reference LIKE '%GVS-%';
UPDATE welfare_claims SET reference = REPLACE(reference, 'GVS-', 'GREE-') WHERE reference LIKE '%GVS-%';
UPDATE member_documents SET storage_key = REPLACE(storage_key, 'GVS-', 'GREE-') WHERE storage_key LIKE '%GVS-%';
