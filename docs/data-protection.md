# Tereka Online Data Protection Runbook

This runbook turns privacy requirements into operational rules for SACCO member data.

## Sensitive data classes

High-risk personal data:

- National ID / NIN and uploaded KYC documents.
- Phone numbers and email addresses.
- Member financial balances, statements, loan history, guarantor exposure, and welfare claims.
- Login/session security metadata.

## API exposure policy

Member list and search responses must use summary masking:

- Phone: show only the last four digits.
- Email: show a short local-part prefix and the domain.
- National ID: show only a small prefix and suffix.
- Response marker: `privacyScope=summary_masked`.

Member detail responses may expose full fields only after authorization and SACCO scope checks:

- SACCO staff can view/edit members only inside their SACCO and only with the required permissions.
- Platform administrators should not use the member list as a general member-management workspace.
- Member portal users can see their own profile only through the member session.
- Response marker: `privacyScope=detail_full`.

## Storage and retention

Current state:

- Member PII is stored in PostgreSQL columns.
- National ID / NIN values are encrypted at rest with AES-GCM using `SACCO_PII_ENCRYPTION_KEY`.
- Legacy plaintext National ID values remain readable for backward compatibility and are encrypted
  when the member record is next saved.
- Passwords and tokens are hashed.
- Sensitive documents are referenced by storage key, not embedded in the database.
- Expired sessions, MFA challenges, and password-reset records are purged by scheduled cleanup.
- Members can update privacy preferences from the member portal.
- The member record stores privacy notice acceptance, SMS consent, email consent, mobile-money
  initiation consent, provider data-sharing consent, and consent update time.
- Consent updates are written to the audit trail as `member_privacy_consent`.
- Members can submit subject-access, retention-review, and erasure requests from the member portal.
- SACCO staff can review the member's privacy requests, update request status, and complete an
  erasure workflow. Completion redacts member profile identifiers and login secrets while preserving
  ledger, loan, statement, and audit history required for SACCO accountability.
- Privacy request status changes are audited as `member_privacy_request`.
- SACCO staff can mark uploaded KYC document references as active, review due, retained,
  disposal pending, or disposed. KYC retention decisions are audited as
  `member_document_retention`.
- When a KYC document is marked `disposed`, the backend calls the configured document-storage
  disposal service and records the file-store action, detail, and action time on the document row.
- The regulatory report includes SACCO-scoped and platform-consolidated data-protection evidence:
  consent coverage, privacy requests, completed erasures, KYC retention reviews, KYC disposals,
  storage actions, and an evidence status.

Production hardening still required:

- Consider extending at-rest encryption to phone/email after provider lookup and reporting impacts are mapped.
- Replace the local filesystem storage adapter with a cloud object-store adapter when deployment
  moves beyond a single small VPS.
- Mask PII in logs and operational exports unless the export purpose requires full values.

## Country compliance baseline

For Uganda DPPA and similar African data-protection frameworks, keep evidence for:

- Lawful basis and member consent.
- Purpose limitation for KYC, savings, loans, welfare, notifications, and support.
- Role-based access to sensitive data.
- Audit trail for create, update, approval, export, and deletion/retention decisions.
- Incident response and breach-notification procedure.

## Verification

`npm.cmd run check` includes `scripts/check-data-protection.mjs`, which verifies:

- PII masking utility exists.
- Member list responses use `MemberResponse.fromSummary`.
- Member detail responses retain full authorized detail mode.
- Member privacy consent fields, endpoint, portal form, and audit event are present.
- Member privacy request migration, endpoints, portal form, erasure redaction, and audit events are present.
- National ID at-rest encryption converter, migration capacity, production key guard, and tests are present.
- KYC document retention migration, endpoint, storage disposal service, UI actions, audit event,
  and tests are present.
- Regulatory reports include exportable data-protection evidence for supervisory review.
- Tests cover masked list responses.
- This runbook keeps retention, consent, and remaining encryption work visible.
