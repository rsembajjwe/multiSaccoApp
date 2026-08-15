# Pilot Launch Decision Checklist

Use this checklist for the final go/no-go meeting before a hosted SACCO pilot or production launch.
It does not replace the detailed evidence files; it confirms that every owner has reviewed the
release pack and that unresolved risks are either closed or formally accepted.

## Decision Inputs

Attach or reference:

- Release evidence pack from `npm.cmd run release:evidence`.
- Hosted staging handoff checklist.
- Hosted operations evidence.
- Provider sandbox readiness evidence.
- Migration evidence for pilot SACCO data.
- UAT findings tracker and role sign-off.
- Security audit readiness or final penetration-test report.
- Accessibility audit readiness or final WCAG audit report.
- Compliance readiness and legal/regulatory owner sign-off.
- Backup/restore evidence and restore owner confirmation.
- Load/soak readiness and hosted load evidence when production launch is requested.

## Go/No-Go Owners

| Owner area | Required owner | Decision responsibility |
| --- | --- | --- |
| Product owner | Platform product owner | Confirms business workflows are ready for the pilot SACCO. |
| Technical owner | Lead engineer or platform administrator | Confirms build, deployment, rollback, and release gates are green. |
| Operations owner | Platform operations officer | Confirms monitoring, alerts, logs, backup schedule, and incident contacts. |
| Data owner | Migration or SACCO data owner | Confirms imported members, balances, loans, documents, and exceptions. |
| Provider owner | Notifications/payment owner | Confirms AfroSMS, Gmail SMTP, bank collection, MTN/Airtel evidence, and M-Pesa exclusion. |
| Compliance owner | Legal/compliance owner | Confirms data protection, SACCO/regulatory, terms, privacy, and payment disclosures. |
| UAT owner | SACCO representative | Confirms platform admin, SACCO staff, and member journeys are accepted. |

## Required Decisions

| Decision | Required rule |
| --- | --- |
| Proceed to supervised pilot | All automated gates pass, no open P0/P1 findings, restore owner named, provider evidence attached, and UAT owner signs. |
| Proceed to production launch | Pilot findings are closed or accepted, hosted monitoring/backups are proven, legal/compliance signs, and external audits are accepted. |
| Approved with accepted findings | Only P2/P3 findings may be accepted, each with owner, expiry, workaround, and customer impact note. |
| Blocked | Any failed gate, unaccepted P0/P1 finding, missing restore evidence, missing provider proof, missing legal/compliance sign-off, or unknown incident contact. |

## Launch Window Evidence

Record:

- Release candidate ID and commit SHA.
- Deployment window and rollback window.
- Database backup taken before deployment.
- Migration start and finish time if pilot data is imported.
- Post-deploy health check and API smoke result.
- First login test for platform admin, SACCO staff, and member.
- First provider test for AfroSMS, Gmail SMTP, and enabled payment collections.
- Known accepted findings and owner/expiry.

## Final Blockers

Do not approve launch when:

- `npm.cmd run release:evidence` fails.
- Hosted staging handoff evidence is incomplete.
- Hosted operations evidence is incomplete.
- Provider sandbox readiness evidence is incomplete.
- UAT sign-off is missing.
- Legal/compliance sign-off is missing.
- External security or accessibility audit required for the target launch is missing.
- No rollback owner, restore owner, or incident contact is named.
