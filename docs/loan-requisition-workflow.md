# Loan Requisition Workflow (Tereka Online)

Status: implemented (core workflow). Consolidates the member-driven guarantor
selection, guarantor accept/reject, and committee decision with a system-assisted
credit-cover view. Built on the existing loan model rather than replacing it.

## Implementation status (2026-08-20)

Done:
- Guarantor selection at submission (1–3 members, each with a pledge) with validation and notifications to each selected member. `POST /member-auth/mobile-loans` (`guarantors[]`).
- Guarantor accept/reject with capacity re-check; the applicant is notified of each response.
- Replacement guarantors after a rejection, capped at 3 active. `POST /member-auth/loans/{loanId}/guarantors`.
- Cover gate at approval (1.0×): applicant savings + accepted pledges must ≥ loan amount, else `409 LOAN_NOT_COVERED`.
- Committee cover dashboard: applicant self-cover + per-guarantor savings/capacity/pledge/status + totals and cover ratio vs request. `GET /loans/{loanId}/cover`.
- Credit appraisal record (officer recommend/decline, recommended amount/term, notes) surfaced to the committee. `GET`/`POST /loans/{loanId}/appraisals`.
- Amount-based approval routing: single (≤ single-max), dual maker≠checker (up to dual-max), committee resolution reference (above dual-max). Config keys `sacco.loans.approval.single-max` / `dual-max`.
- Maker-checker on disbursement: one officer initiates, a second, distinct officer confirms before funds move.

Not yet done (optional refinements):
- Appraisal as a hard gate before approval (currently advisory).
- Per-SACCO approval thresholds stored in settings (currently global config defaults).
- Enforced appraiser ≠ approver separation.
- Arrears flags/notifications to guarantors on missed installments.

## Principles

- A loan is a movement of SACCO money, so every stage transition is audited (actor + reason), money postings are immutable with reversals, and all amounts use BigDecimal.
- Guarantors are always **members of the same SACCO** (tenant-isolated).
- Two credit sources back a loan: the **applicant's own credit** (their savings/shares) and the **guarantors' available capacity**. Both are considered.
- Maker cannot be checker. Recommending, approving, and disbursing are distinct acts by distinct people.

## Roles

- **Applicant** — the member requesting the loan.
- **Guarantor** — 1 to 3 members selected by the applicant.
- **Loans officer** — performs credit appraisal and recommends.
- **Loan committee** — approves or rejects (chairperson, treasurer, secretary, credit members).
- **Treasurer** — disburses and receipts repayments.

## Credit definitions

- **Applicant self-cover** = applicant's savings (and shares, per SACCO policy) available as security.
- **Guarantee capacity (per guarantor)** = `3 × savings − already-committed guarantees`, clamped at 0. (Already implemented as `guaranteeCapacity`.) The multiplier is a per-SACCO setting.
- **Total cover for a request** = applicant self-cover + sum of accepted guarantors' pledged amounts (each pledge ≤ that guarantor's capacity).
- **Cover ratio** = Total cover ÷ Loan request sum. The committee sets a minimum (e.g. ≥ 1.0 = fully covered).

## End-to-end workflow

### 1. Application and guarantor selection (Draft → Submitted)
Owner: applicant.
- Applicant enters product, amount, term, purpose, repayment source.
- Applicant **selects 1 to 3 SACCO members as guarantors** and the amount each is asked to pledge (defaults can auto-split the request).
- On submit, an automatic **eligibility pre-check** runs: membership active, no loans in arrears, amount within the product's exposure limit, and amount within the applicant's own self-cover policy.
- Validations: a guarantor must be an active member of the same SACCO, cannot be the applicant, cannot appear twice, and each requested pledge must be ≤ that member's available guarantee capacity.
- Pass → status `submitted`, stage "Guarantor Response". Guarantor requests are created in `pending`.

### 2. Guarantor response (Submitted)
Owner: guarantors.
- Each selected member **receives a notification** (their chosen channel — in-app, SMS, WhatsApp, email) showing who is asking, the loan amount, and the pledge requested of them.
- Each guarantor **accepts or rejects** from their portal. Acceptance is capacity-checked at the moment of acceptance (a member's capacity can change between selection and response).
- The applicant is notified of each response. If a guarantor rejects, the applicant may **add a replacement** (still within the 1–3 cap) and that member is notified.
- **Gate:** the loan cannot advance until either (a) all selected guarantors have responded and accepted pledges + applicant self-cover meet the minimum cover ratio, or (b) the applicant withdraws.
- When cover is met → stage "Credit Appraisal".

### 3. Credit appraisal (Under Review)
Owner: loans officer.
- Officer records an appraisal: affordability (installment vs income/savings), history, recommended amount/term, and a recommend/decline note.
- Exit: "Recommended to Committee" or "Declined" (with reason, applicant notified).

### 4. Loan committee decision (Under Review → Approved / Rejected)
Owner: loan committee.
- The committee opens a **cover dashboard** for the loan (the system-assisted view) that shows, side by side:
  - Loan request sum, product, term, appraisal recommendation.
  - **Applicant self-cover**: savings/shares available.
  - **Each guarantor**: name, savings, guarantee capacity, amount pledged, response status.
  - **Totals**: total pledged (accepted only), total cover (self + guarantors), and the **cover ratio vs the request**, with a clear met/short indicator.
- Amount-based routing (per-SACCO thresholds A and B):
  - ≤ A: one manager approves (maker ≠ appraiser).
  - A–B: treasurer + chairperson dual approval.
  - ≥ B: recorded committee/board vote with a resolution reference.
- Decision is audited with actor and reason. Approve → status `approved`, stage "Ready for Disbursement"; reject → stage "Rejected" (applicant + guarantors notified). Accepted guarantors' pledges are held as committed exposure while the loan is live.

### 5. Disbursement (Approved → Active)
Owner: treasurer, with **maker-checker on the money movement**.
- Choose funding source and payout channel (mobile money / bank / cash), generate the repayment schedule, post the disbursement as an immutable transaction.
- Only an `approved` loan can be disbursed (already enforced). Applicant and guarantors notified.

### 6. Repayment and servicing (Active)
Owner: applicant + treasurer.
- Repayments post against the schedule; mobile-money repayments already go through treasurer approval.
- Arrears tracking: a missed installment flags the loan and notifies the applicant and guarantors (guarantors carry exposure, so they are kept informed).

### 7. Closure or default (Closed / Written-off)
- Balance = 0 → `closed`; guarantors' committed exposure is released.
- Persistent arrears → documented restructure/default/write-off via board resolution. Never a silent delete; use reversal/closure records.

## State model

`draft → submitted → under_review → approved → active → closed`
with side exits `rejected` (from under_review) and `defaulted/written_off` (from active).
Guarantor request states: `pending → accepted | rejected` (and `released` on closure).

## What already existed vs what was built

(See the Implementation status section above for the current state; the list below records the original starting point.)

Reused:
- `Loan` state machine and stages; `disburse` and `schedule` endpoints.
- Guarantor model and `guaranteeCapacity` (3× savings − committed).
- Guarantor accept/reject with capacity check (`GUARANTEE_CAPACITY_EXCEEDED`).
- Member accept/reject portal actions and the notification channels.
- Maker-checker + resolution-reference pattern from savings transfers.

Build:
- Guarantor **selection at submission** (1–3 members) with per-member pledge amounts and notifications to the selected members.
- **Cover gate**: block advancement until accepted pledges + self-cover meet the minimum ratio; allow replacement guarantors.
- **Appraisal record** (officer assessment).
- **Committee cover dashboard** endpoint + view (self-cover, per-guarantor capacity/pledge/status, totals, cover ratio vs request).
- **Amount-based approval routing** with dual/committee approval and resolution reference.
- **Maker-checker on disbursement**.
- Arrears flags and guarantor notifications on missed installments.

## Decisions needed from the SACCO

- Guarantee multiplier (default 3×) and whether shares count toward self-cover.
- Minimum cover ratio (e.g. 1.0 = fully covered).
- Approval thresholds A and B for single vs dual vs committee approval.
- Eligibility rule (e.g. max loan = N × savings, no active arrears).
