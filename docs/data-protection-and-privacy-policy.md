# Data Protection & Privacy Policy — Tereka Online

**Version:** 1.0 (draft for review) · **Date:** 2026-08-17
**Applies to:** the Tereka Online platform operator and every SACCO tenant using it.
**Governing law:** Uganda's Data Protection and Privacy Act, No. 9 of 2019 (the "Act") and the Data
Protection and Privacy Regulations, 2021, enforced by the Personal Data Protection Office (PDPO) under
NITA-U.

> This is a governance policy. It complements the technical runbook in `docs/data-protection.md` (which
> records the implemented controls and evidence). Sections marked **[SACCO action]** must be completed by
> each SACCO for its own tenant; sections marked **[Platform action]** are the operator's responsibility.

## 1. Purpose & scope

This policy sets out how personal data is collected, used, stored, shared, secured and disposed of across
Tereka Online, and how data subjects (members and staff) exercise their rights. It covers all personal
data processed through the platform: member KYC and financial records, staff accounts, and operational
logs.

## 2. Controller and processor roles

Tereka is a multi-tenant SaaS in which **each SACCO owns and controls its own members' data and money**
(the platform holds no central float and does not pool member data across SACCOs):

- **Each SACCO is the data controller** of its members' personal data. It decides the purposes and means
  of processing, obtains consent, responds to data-subject requests, and is responsible for its own PDPO
  registration and (where required) designating a data protection contact. **[SACCO action]**
- **The platform operator is a data processor** acting on each SACCO's documented instructions for that
  SACCO's member data, and is a **controller** only for its own platform-staff accounts and platform-level
  security/audit logs. **[Platform action]**
- Tenant isolation is enforced technically: every record is scoped by `tenant_id`, and no SACCO can access
  another SACCO's data.

A data-processing agreement (DPA) between the operator and each SACCO should record these roles, the
processing scope, security obligations, sub-processors, and breach-notification timelines. **[Platform action]**

## 3. Data protection principles (Act s.3)

All processing follows the Act's principles: accountability; fairness and lawfulness; collection for a
specified, explicit, lawful purpose; adequacy, relevance and minimisation; accuracy and currency;
retention no longer than necessary; and security safeguards. Transparency is provided through member-facing
privacy notices at registration.

## 4. What personal data is processed

| Category | Examples | Role |
|---|---|---|
| Member identity / KYC | full name, phone, email, national ID, membership number, branch | SACCO controls |
| Member financial data | savings/shares/welfare and custom-fund balances, transactions, loans, guarantees | SACCO controls |
| Consents & privacy requests | privacy-notice acceptance, SMS/email/MoMo/data-sharing consents, access/erasure requests | SACCO controls |
| Staff accounts | name, email, role assignments, session and MFA data | Platform + SACCO |
| Operational data | audit trail, notification delivery logs, correlation IDs, login-attempt records | Platform controls |

Special personal data (e.g. national ID) receives additional protection (encryption at rest — see §8).

## 5. Lawful basis and consent

Processing is grounded in the member's consent captured at onboarding and/or the performance of the
SACCO-member contract and the SACCO's legal/regulatory obligations. The system records granular consents
(privacy notice, SMS, email, mobile money, provider data-sharing) with timestamps, and members can update
them. Customer mobile-money PINs are never collected or stored.

## 6. Data subject rights and how they are honoured

Members and staff may: be informed (privacy notice); access their data; request correction; request
erasure/restriction; object to processing (including direct marketing); and be notified of a breach that
affects them. The platform implements a **privacy-request** workflow (access/correction/erasure) with an
auditable record, and members can view their own balances, statements, notifications and consents in the
member portal. Requests should be actioned within the timelines the SACCO commits to in its privacy notice.
**[SACCO action: define and publish response timelines.]**

## 7. Retention & disposal

Personal data is kept only as long as necessary for the purpose or as required by SACCO/financial
regulation, then disposed of securely. Indicative schedule (each SACCO confirms against its regulator):

| Data | Indicative retention |
|---|---|
| Active member KYC & balances | Duration of membership |
| Financial transactions / accounting records | As required by SACCO/UMRA/financial law (commonly 7–10 years) |
| Closed-member records | Regulatory minimum after exit, then erasure/anonymisation |
| Member documents | Per the document retention/disposal workflow (migrations V58/V59) |
| Security artefacts (sessions, reset tokens, login attempts) | Short-lived; purged automatically by the scheduled cleanup job |
| Audit trail | Retained for accountability; reviewed periodically |

Immutable posted financial transactions are never physically deleted — corrections use reversal entries —
so financial integrity and erasure obligations are reconciled through anonymisation where lawful.

## 8. Security safeguards (Act s.20) — implemented controls

- **Authentication:** PBKDF2-HMAC-SHA256 password hashing (210,000 iterations), DB-backed sessions with
  expiry and revocation, MFA for staff, and failure-based login lockout.
- **Encryption:** national ID encrypted at rest (AES-GCM, versioned `enc:v1:` storage); TLS in transit; a
  strict Content-Security-Policy and security headers (nosniff, frame-deny, HSTS, referrer policy).
- **Minimisation & masking:** PII masking on list views (phone, email, national ID); full detail only to
  authorised roles.
- **Access control:** role-based permissions with maker-checker on sensitive transactions, plus tenant and
  branch isolation on every query.
- **Secret management:** credentials/keys supplied via environment/secret store, never committed; a
  production secret-readiness check gates start-up.
- **Accountability:** a comprehensive audit trail, correlation IDs, and Prometheus metrics.

## 9. Sharing and cross-border transfer (Act s.19)

Personal data is shared only with the member's SACCO and, on the member's instruction/consent, with
mobile-money/bank providers to complete the member's own payments — funds and data do not pass through a
central platform pool. Cross-border transfer of personal data is restricted under the Act; any hosting or
sub-processor located outside Uganda must provide equivalent protection and be covered by the DPA and, where
required, PDPO conditions. **[Platform action: record data-hosting location and sub-processors.]**

## 10. Personal data breach management

On discovering a breach, the operator/SACCO will contain it, assess the risk to data subjects, and notify
the PDPO and affected data subjects as required by the Act and Regulations, keeping a record of the breach
and the response. A concrete breach-response runbook (roles, contact tree, containment steps, notification
templates and timelines) should be maintained. **[Platform action: finalise the breach runbook;** see the
incident-readiness checks already in the repo.**]**

## 11. Registration with the PDPO (Act s.29(2) / Reg. 15(1))

Every data collector, processor or controller must register with the PDPO online at pdpo.go.ug. Practically:

- **[Platform action]** The operator registers as a **data processor** (and controller for its own staff
  data) covering the platform's processing purposes and sub-processors.
- **[SACCO action]** Each SACCO registers as a **data controller** for its members' data.

The PDPO was operationalised in August 2021 and maintains a public register of registered entities.

## 12. Governance & review

**[Platform action]** Designate a data-protection contact, keep records of processing activities, run this
policy past qualified Ugandan legal counsel before go-live, and review the policy at least annually or on
material change. **[SACCO action]** Each SACCO designates its own data-protection contact and publishes a
member-facing privacy notice consistent with this policy.

---

### Status of this document

This is a **drafting aid**, not legal advice. The technical controls in §8 are implemented and verifiable in
the codebase today; the **[action]** items (DPA, PDPO registrations, breach runbook, hosting/sub-processor
records, response timelines, legal review) are the outstanding "policy completion" work noted in the
capabilities review. Have Ugandan data-protection counsel review before relying on it.

Sources:
- [Personal Data Protection Office (PDPO)](https://pdpo.go.ug/)
- [NITA-U — Requirements to register with the PDPO](https://www.nita.go.ug/requirements-register-personal-data-protection-office)
- [PDPO Registration, Classification and Guidance Notes (2021)](https://business.cch.com/CybersecurityPrivacy/UgandaRegistrationClassificationandGuidanceNotes92021.pdf)
- [NGO Bureau — Reminder to register under the Data Protection and Privacy Act, 2019](https://www.ngobureau.go.ug/en/news-and-notices/reminder-of-the-requirement-to-register-under-the-data-protection-and-privacy-act)
