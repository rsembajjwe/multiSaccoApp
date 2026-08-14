# Compliance Readiness Checklist

Use this checklist before pilot onboarding, hosted staging handoff, and production launch. It is an
operational evidence checklist, not legal advice. A qualified legal/regulatory adviser must confirm
the final obligations for each launch country and SACCO category.

## Scope

Tereka Online currently targets SACCO operations with Uganda as the first practical market. Before
expanding to another country, create a country-specific addendum for data-protection, SACCO,
microfinance, tax, consumer-protection, and payment-provider obligations.

## Data Protection Evidence

Record evidence for:

- Lawful basis for collecting member KYC, financial, loan, guarantor, welfare, support, and login data.
- Privacy notice text shown to members and administrators.
- Consent capture for SMS, email, mobile-money initiation, and provider data sharing.
- Subject-access, retention-review, and erasure request workflow.
- Retention schedule for KYC documents, statements, loans, audit logs, and payment records.
- DPO or data-protection owner name and escalation contact.
- Breach/incident notification procedure and incident owner.
- PII encryption and secret-rotation evidence.
- KYC document storage/disposal evidence.
- Cross-border data-transfer review where providers or hosting are outside the SACCO country.

## SACCO And Regulatory Evidence

Record evidence for:

- SACCO legal name, registration number, district, contact number, and license/approval reference.
- UMRA, Bank of Uganda, or relevant supervisory requirement review for the SACCO product type.
- Approved savings, shares, welfare, and loan policies.
- Maker-checker policy for cash, mobile-money, bank deposits, reversals, and write-offs.
- Interest, fees, penalties, arrears, and debt-service-ratio policy approval.
- Board/chairperson approval for onboarding the SACCO onto Tereka Online.
- Regulator-facing report review and export evidence.
- Complaint-handling SLA and escalation owner.

## Payment And Provider Evidence

Record evidence for:

- SACCO-owned bank and mobile-money collection accounts.
- Platform-level permission for the SACCO to use none, mobile money, bank, or both collection modes.
- Provider merchant/KYC approval documents.
- Callback signing, idempotency, reconciliation, and exception-handling evidence.
- Settlement account ownership confirmation showing money flows to the SACCO, not the platform.
- Provider support contact and escalation path.

## Legal Documents

Before production launch, attach approved versions of:

- Platform Terms of Service.
- Privacy Policy.
- SACCO subscription agreement.
- Data-processing agreement between Tereka Online and each SACCO where required.
- Acceptable-use and administrator responsibility policy.
- Member-facing payment disclaimer explaining SACCO-owned payment accounts and approval/reconciliation timing.

## Sign-Off

| Area | Owner | Evidence | Status |
| --- | --- | --- | --- |
| Data protection |  |  |  |
| SACCO/regulatory review |  |  |  |
| Payment/provider compliance |  |  |  |
| Legal documents |  |  |  |
| Security review |  |  |  |
| UAT/product acceptance |  |  |  |

Do not approve production release when data-protection owner, regulator/licensing review, payment
provider approval, legal documents, or unresolved high-severity findings are missing.
