# Proprietor Mobile App Gap Review

Review date: 15 November 2026

## Implemented in this update

- Platform staff with `notifications:manage` can send an SMS to all SACCOs or selected SACCOs.
- Only active SACCO leadership users with verified telephone numbers are eligible.
- Duplicate leadership telephone numbers within one SACCO are sent once.
- Every attempt creates notification and delivery audit records, including provider failures.
- The result shows selected SACCOs, reached SACCOs, recipients, sent, failed, segments, and provider SMS units.
- Proprietor-originated broadcasts do not debit SACCO SMS wallets because the SACCO did not initiate the communication.

## High-priority gaps

1. **Notification operations:** provider health, provider credit, delivery history, failed recipients, and manual retries are now available. Remaining gaps are scheduled campaigns, templates, suppression management, provider-cost accounting, and server-side campaign grouping.
2. **SACCO lifecycle management:** SACCO details, officials, collection modes, collection activation, payment accounts, and guarded deletion are now available. Remaining gaps are account deletion/editing details, official history, and a dedicated pre-deletion dependency preview.
3. **Payment operations:** provider availability, callback totals, reconciliation evidence, manual reconciliation, and subscription payment history are now available. Remaining gaps are detailed request/callback drill-down, reversals, settlement-file matching, and exception assignment.
4. **Security administration:** platform password/lockout policy, audit history, staff MFA controls, forced logout, and password-reset requests are now available. Remaining gaps are individual-session review/revocation and password-reset history.
5. **Fleet incident response:** bulk lifecycle and portfolio-assignment jobs, maker-checker approval visibility, per-SACCO job results, and incident acknowledgement, escalation, reopening, and resolution are now available. Remaining gaps are incident creation from live health signals, push alerts, assignee selection, and operational-health evidence drill-down.

## Medium-priority gaps

1. **Billing depth:** catalog rate administration, SACCO billing-item creation/cancellation, composed bill summaries, SMS sales history, subscription receipt evidence, explicit cash collection, and database-backed package pricing are now available. Remaining gaps are refunds, credit notes, tax invoices, settlement allocation, and package-price effective dating.
2. **Staff administration:** platform staff can be invited and suspended, but cannot be edited, assigned multiple roles, reset passwords, manage MFA, or revoke individual sessions.
3. **Support workflow:** complaint workflow transitions, assignment, escalation, attachments, and two-way support chat are not exposed.
4. **Reporting:** fleet search, district, health, lifecycle and unassigned-portfolio filters, reusable saved views, device CSV export, six-month renewals, and configurable renewal scenarios are now available. Remaining gaps are arbitrary date ranges, charts, deep financial drill-downs, and provider-settlement reconciliation.
5. **Broadcast controls:** there is no scheduled sending, reusable templates, opt-out/suppression management, delivery preview, provider-cost ledger, or campaign history screen.

## Quality and release gaps

1. Widget and integration coverage is limited; most proprietor tests currently validate model parsing only.
2. There is no automated device smoke test against the hosted backend before APK publication.
3. The app does not register for platform push notifications, so approval, incident, and payment alerts depend on manual refresh.
4. Accessibility, slow-network, offline, and large-portfolio performance tests are not yet part of the release gate.

## Recommended delivery order

1. Notification operations and campaign history.
2. Payment reconciliation and provider evidence.
3. Security policy, sessions, MFA, and audit trail.
4. SACCO lifecycle and payment-account administration.
5. Fleet incidents, bulk jobs, reporting, and exports.
6. Widget, integration, device, accessibility, and performance automation.
