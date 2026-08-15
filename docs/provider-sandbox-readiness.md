# Provider Sandbox Readiness Checklist

Use this checklist before switching notification or payment providers from demo mode to sandbox/live
mode. It covers the launch providers currently in scope: AfroSMS, Gmail SMTP, SACCO-owned bank
collection, MTN MoMo, and Airtel Money. M-Pesa is not a required launch provider in this block and
must remain disabled unless a later release explicitly adds it.

## Provider Scope

| Provider area | Required launch status | Evidence required |
| --- | --- | --- |
| AfroSMS | Sandbox/live credentials configured outside git | SMS send test, balance check, delivery log, retry/failure evidence |
| Gmail SMTP | App password or delegated SMTP credential configured outside git | Email send test, delivery log, retry/failure evidence |
| SACCO-owned bank collection | Each SACCO records its own bank account details | Staff reconciliation test, duplicate reference rejection, ledger posting evidence |
| MTN MoMo | Enabled only for SACCOs allowed by platform settings | Request-to-pay test, signed callback test, idempotency proof, reconciliation evidence |
| Airtel Money | Enabled only for SACCOs allowed by platform settings | Request-to-pay test, signed callback test, idempotency proof, reconciliation evidence |

## Secrets And Configuration

Before testing:

- Provider credentials must come from environment variables or a hosted secret store, never from source code.
- `SACCO_DEMO_LOGINS_ENABLED=false` must be used outside demo verification.
- Provider base URLs must point to sandbox/live endpoints, not demo placeholders.
- Callback secrets must be unique per environment.
- SACCO collection accounts must be SACCO-owned; money must not flow through a platform account.
- M-Pesa excluded from required provider readiness unless explicitly enabled in a later release.

## Sandbox Test Matrix

| Flow | Required test |
| --- | --- |
| AfroSMS send | Send one low-risk SMS to a test number and confirm delivery state is recorded. |
| AfroSMS balance | Query provider credit balance and record timestamp without exposing credentials. |
| Gmail SMTP send | Send one test email and confirm delivery state is recorded. |
| Bank collection | Import or record a bank collection line, reconcile it to a member deposit, and reject a duplicate reference. |
| MTN MoMo request | Initiate a member savings deposit request, receive a signed callback, post once, and reconcile. |
| Airtel Money request | Initiate a member loan repayment request, receive a signed callback, post once, and reconcile. |
| Callback idempotency | Replay the same callback and prove no duplicate ledger posting occurs. |
| Provider timeout | Simulate timeout/failure and confirm retry/status evidence without user-facing double posting. |

## Release Evidence

Attach to the release pack:

- Redacted provider configuration inventory.
- AfroSMS send, balance, and delivery-log evidence.
- Gmail SMTP send and delivery-log evidence.
- Bank collection reconciliation evidence.
- MTN MoMo and Airtel Money sandbox callback evidence.
- Callback idempotency and duplicate-reference evidence.
- Provider outage or timeout handling evidence.

## Production Blockers

Do not approve provider go-live when:

- Any provider credential is committed to git or baked into a container image.
- Callback signature verification is disabled for mobile-money providers.
- A duplicate provider callback can create a duplicate ledger posting.
- SACCO money is routed through a platform-owned account without explicit legal/payment approval.
- Provider delivery failures are invisible to SACCO staff or platform administrators.
