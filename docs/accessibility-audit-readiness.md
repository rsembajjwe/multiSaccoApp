# Accessibility Audit Readiness Checklist

Use this checklist before calling a release WCAG-ready or booking an external accessibility review.
It is not a substitute for an external WCAG audit; it prepares the evidence, scope, and closure
rules needed for a clean review.

## Audit Standard

The target standard is WCAG 2.1 AA for the production web app across the login gateway, platform
administration portal, SACCO staff portal, and member portal.

## Audit Scope

The audit should cover:

- Login and password recovery, including SACCO code routing, error messages, session expiry, and MFA prompts.
- Public SACCO registration and payment-initiation screens.
- Platform admin dashboards, SACCO registration, subscriptions, reports, complaints, notifications, users, roles, and audit logs.
- SACCO staff dashboards, members, transactions, savings, shares, welfare, loans, guarantors, approvals, accounting, reconciliation, reports, governance, complaints, users, roles, settings, and audit logs.
- Member portal balances, monthly savings, deposits, loan repayments, mobile-money instructions, messages, guarantor requests, notifications, and offline drafts.
- Modal dialogs, tab groups, tables, filters, pagination, form validation, toasts, and loading/error states.

## Manual Audit Matrix

| Check | Required coverage | Release rule |
| --- | --- | --- |
| Keyboard-only navigation | Tab order, skip links, menus, tabs, dialogs, forms, tables, pagination, and logout | No keyboard trap or unreachable core action |
| Screen-reader smoke test | Labels, headings, landmarks, live messages, form errors, and table context | Core workflows are understandable without visual layout |
| Contrast review | Text, buttons, badges, table rows, selected navigation, alerts, and disabled states | WCAG AA contrast is met for normal and large text |
| 200% zoom | Login, platform, SACCO staff, and member portal on desktop browser zoom | No overlapping text, clipped controls, or lost actions |
| Touch target review | Mobile viewport controls, menu, tabs, buttons, inputs, and table actions | Primary controls remain tappable without precision gestures |
| Reduced-motion review | Animations, loading states, transitions, and notification indicators | Motion is avoidable or non-essential when reduced motion is requested |

## Assistive Technology Set

Test at least:

- NVDA with Chrome or Firefox on Windows.
- VoiceOver with Safari on iOS or macOS where available.
- TalkBack with Chrome on Android where available.

Record any unavailable assistive technology as an accepted testing limitation with owner and date.

## Automated Evidence To Attach

Attach:

- Static accessibility evidence from `npm.cmd run accessibility:evidence`.
- Browser accessibility journey from `npm.cmd run accessibility:browser`.
- Browser regression evidence from `npm.cmd run ui:browser`.
- Release evidence pack from `npm.cmd run release:evidence`.
- Screenshots or notes for any manual keyboard, screen-reader, contrast, zoom, touch, and reduced-motion findings.

## Finding Severity

| Severity | Examples | Required action |
| --- | --- | --- |
| Critical accessibility blocker | Login impossible by keyboard, no usable focus path, screen reader cannot complete payment/deposit/loan action, destructive action is unlabeled | Stop release until fixed and retested |
| High | Core dashboard, member balance, payment instruction, or table action is inaccessible to keyboard or screen reader | Fix before UAT sign-off unless explicitly accepted by owner |
| Medium | Non-core wording, focus order, table header, or contrast issue that has a workaround | Fix or accept with owner, expiry, and compensating instruction |
| Low | Cosmetic spacing or copy issue that does not block understanding or operation | Track for next release |

## Closure

Production launch must not proceed until:

- No Critical or High accessibility findings remain open.
- Any accepted Medium finding has an owner, expiry date, and workaround.
- The final audit report or internal audit notes are attached to the release evidence pack.
- The release owner confirms that login, platform admin, SACCO staff, and member portal journeys were reviewed.
