# UAT Findings Template

Use this template to track issues found during staging UAT. Copy the table into the project tracker if another system is used. Every failed UAT step should create or reference one finding.

## Severity Policy

| Severity | Meaning | Release impact |
| --- | --- | --- |
| P0 Blocker | Prevents login, data isolation, posting, approval, repayment, reversal, billing, or core member self-service. | Blocks staging handoff and release. |
| P1 High | Major workflow is broken or produces confusing financial, tenant, or security state. | Blocks external UAT or release unless formally accepted. |
| P2 Medium | Workflow works with a workaround or has incomplete polish that does not risk financial correctness. | Can be accepted by the product owner with a follow-up owner. |
| P3 Low | Cosmetic, wording, or low-risk usability issue. | Can move to backlog. |

## Finding Lifecycle

`Open` -> `In Progress` -> `Ready for Retest` -> `Closed` or `Accepted`.

Accepted findings must name the acceptance owner, reason, and follow-up date. P0 findings should not be accepted for release.

## Findings Tracker

| ID | Severity | Role/screen | Environment/build | Steps to reproduce | Expected result | Actual result | Evidence | Owner | Status | Retest result/date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UAT-001 |  |  |  |  |  |  |  |  | Open |  |

## Retest Notes

| Finding ID | Retester | Date | Result | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## Handoff Rule

External UAT can start only when all P0 findings are closed and all P1 findings are either closed or explicitly accepted by the product owner. Production release requires the same rule plus completed release evidence in `docs/release-evidence-template.md`.
