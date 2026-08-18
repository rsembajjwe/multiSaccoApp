# Notification Channels — Go-Live Integration Guide

_Last updated: 2026-08-18_

This guide turns the notification channels from working **demo stubs** into **live delivery** on real
providers. The application code does not change — you implement one class per real provider and flip a
config flag. Nothing here routes member funds, so no Bank of Uganda payment licence is involved.

---

## 1. What already exists

Tereka Online delivers notifications through a small provider SPI. Each channel is one Spring bean
implementing `NotificationProvider`:

```java
interface NotificationProvider {
    String channel();                 // "sms" | "email" | "whatsapp" | "push"
    String providerId();              // e.g. "meta_whatsapp", "fcm_push"
    String recipient(Member member);  // phone / email / member-id (push topic)
    NotificationSendResult sendTo(String recipient, String title, String message);
    NotificationProviderStatusResponse status();
}
```

`NotificationService` composes a message once and fans it out to every **enabled and allowed** channel.
Fan-out is gated by:

- **SACCO channel enablement** — `notification_channel_preferences` row with `member_id = ''`.
- **Member opt-out** — `notification_channel_preferences` row with a real `member_id`.
- **Provider config** — the bean only exists when its `sacco.providers.<channel>` flag matches.

Delivery attempts are persisted in `notification_deliveries` (channel, provider, recipient, status,
message, timestamps), which drives the retry UI, the provider-status panel, and **billing** (SMS and
WhatsApp are metered as charged usage).

Current bean wiring per channel:

| Channel  | Demo bean                       | Recipient        | Charged | Default (dev / prod)      |
|----------|---------------------------------|------------------|---------|---------------------------|
| SMS      | `SmsNotificationProvider`       | `member.phone`   | Yes     | `demo_sms` / off          |
| Email    | `EmailNotificationProvider`     | `member.email`   | No      | `demo_email` / off        |
| WhatsApp | `WhatsAppNotificationProvider`  | `member.phone`   | Yes     | `demo_whatsapp` / off     |
| Push     | `PushNotificationProvider`      | `member.id`      | No      | `demo_push` / off         |

Real SMS (`AfroSmsNotificationProvider`) and email (`GmailSmtpEmailNotificationProvider`) implementations
already exist and are selected by config — WhatsApp and push are the two that still need real providers.

---

## 2. Configuration surface

All provider selection is environment-driven (`application.properties` for dev, `application-prod.properties`
for prod). Each flag picks which bean is active; the demo bean is `@ConditionalOnProperty` on the demo value.

```properties
# Dev (application.properties) — demo stubs on, so everything is visible without credentials
sacco.providers.sms=${SACCO_SMS_PROVIDER:demo_sms}
sacco.providers.email=${SACCO_EMAIL_PROVIDER:demo_email}
sacco.providers.whatsapp=${SACCO_WHATSAPP_PROVIDER:demo_whatsapp}
sacco.providers.push=${SACCO_PUSH_PROVIDER:demo_push}

# Prod (application-prod.properties) — empty by default; each channel is opt-in
sacco.providers.whatsapp=${SACCO_WHATSAPP_PROVIDER:}
sacco.providers.push=${SACCO_PUSH_PROVIDER:}
```

To go live you will set, in the production environment, e.g. `SACCO_WHATSAPP_PROVIDER=meta_whatsapp` and
`SACCO_PUSH_PROVIDER=fcm_push`, plus the credentials in section 3/4. The real bean is
`@ConditionalOnProperty(name = "sacco.providers.whatsapp", havingValue = "meta_whatsapp")`, and the demo
bean stays off because its `havingValue` no longer matches.

**Secrets** (tokens, service-account JSON) must come from environment variables or the secret manager —
never commit them. They are already excluded from logs.

---

## 3. WhatsApp — Meta WhatsApp Cloud API

### Prerequisites
- A Meta **Business** account and a WhatsApp Business Account (WABA).
- A registered **phone number** with its **Phone Number ID**.
- A **System User access token** (no expiry) with `whatsapp_business_messaging` permission.
- Pre-approved **message templates** for anything sent outside the 24-hour customer-service window
  (transaction alerts and SACCO announcements are template messages; replies inside an active
  conversation can be free-form).
- Recorded **opt-in/consent** from each member before messaging them on WhatsApp (Meta policy + PDPO).

### Endpoint (as of writing)
`POST https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages` with header
`Authorization: Bearer {SYSTEM_USER_TOKEN}`. Confirm the current graph version before shipping — Meta
increments it periodically.

Template message body shape:

```json
{
  "messaging_product": "whatsapp",
  "to": "256700000001",
  "type": "template",
  "template": {
    "name": "sacco_transaction_alert",
    "language": { "code": "en" },
    "components": [
      { "type": "body", "parameters": [ { "type": "text", "text": "UGX 250,000 savings deposit posted" } ] }
    ]
  }
}
```

### Config
```properties
sacco.providers.whatsapp=${SACCO_WHATSAPP_PROVIDER:}
sacco.whatsapp.phone-number-id=${WHATSAPP_PHONE_NUMBER_ID:}
sacco.whatsapp.access-token=${WHATSAPP_ACCESS_TOKEN:}
sacco.whatsapp.graph-version=${WHATSAPP_GRAPH_VERSION:v22.0}
sacco.whatsapp.default-template=${WHATSAPP_DEFAULT_TEMPLATE:sacco_transaction_alert}
```

### Implementation sketch
Add a real provider bean next to the stub (keep the stub — it remains the dev default):

```java
@Component
@ConditionalOnProperty(name = "sacco.providers.whatsapp", havingValue = "meta_whatsapp")
class MetaWhatsAppNotificationProvider implements NotificationProvider {

    private final RestClient client;      // reuse the bounded-timeout RestClient config
    private final String phoneNumberId, token, graphVersion, defaultTemplate;

    // constructor injects @Value config above

    @Override public String channel()    { return "whatsapp"; }
    @Override public String providerId()  { return "meta_whatsapp"; }
    @Override public String recipient(Member m) { return m.getPhone(); }

    @Override
    public NotificationSendResult sendTo(String recipient, String title, String message) {
        try {
            var body = Map.of(
                "messaging_product", "whatsapp",
                "to", normalizeMsisdn(recipient),          // strip '+', spaces
                "type", "template",
                "template", Map.of(
                    "name", defaultTemplate,
                    "language", Map.of("code", "en"),
                    "components", List.of(Map.of("type", "body",
                        "parameters", List.of(Map.of("type", "text", "text", message))))));
            var res = client.post()
                .uri("https://graph.facebook.com/{v}/{id}/messages", graphVersion, phoneNumberId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
            String providerMessageId = res.path("messages").path(0).path("id").asText(null);
            return NotificationSendResult.sent(providerMessageId, "WhatsApp accepted for delivery.");
        } catch (RuntimeException e) {
            return NotificationSendResult.failed(e.getMessage());
        }
    }
}
```

Notes:
- Reuse the existing bounded-timeout / Resilience4j `RestClient` so WhatsApp calls inherit timeouts,
  retries and the circuit breaker.
- `NotificationSendResult.sent(providerMessageId, ...)` stores the provider id so a delivery-status
  webhook can later reconcile it.

### Delivery-status webhook (recommended)
Register a Meta webhook and add a small inbound controller (mirroring the existing mobile-money callback
pattern under `/api/v1/integrations/...`): verify the signature, map Meta statuses
(`sent`/`delivered`/`read`/`failed`) onto the matching `notification_deliveries` row by provider message
id, and update its status. This makes the delivery monitor and billing (charge on `delivered`) accurate.

---

## 4. Mobile-app push — Firebase Cloud Messaging (HTTP v1)

### Prerequisites
- A Firebase project for the mobile app (the Flutter app under `mobile/`).
- A **service-account JSON** key with the `https://www.googleapis.com/auth/firebase.messaging` scope.
- A topic strategy. The stub already targets **topic `member_<id>`**; have the app call
  `FirebaseMessaging.subscribeToTopic("member_" + memberId)` at sign-in and `unsubscribeFromTopic` at
  sign-out. This needs **no server-side device-token store**.

### Endpoint (as of writing)
`POST https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send` with a short-lived OAuth2 bearer
token minted from the service account. Topic body shape:

```json
{ "message": {
    "topic": "member_member_green_amina",
    "notification": { "title": "Payment received", "body": "UGX 250,000 savings deposit posted" }
} }
```

### Config
```properties
sacco.providers.push=${SACCO_PUSH_PROVIDER:}
sacco.push.project-id=${FCM_PROJECT_ID:}
sacco.push.service-account=${FCM_SERVICE_ACCOUNT_JSON:}   # JSON string or file path
```

### Implementation sketch
```java
@Component
@ConditionalOnProperty(name = "sacco.providers.push", havingValue = "fcm_push")
class FcmPushNotificationProvider implements NotificationProvider {

    private final GoogleCredentials credentials;  // built from service-account JSON, firebase.messaging scope
    private final RestClient client;
    private final String projectId;

    @Override public String channel()   { return "push"; }
    @Override public String providerId() { return "fcm_push"; }
    @Override public String recipient(Member m) { return m.getId(); }   // topic key

    @Override
    public NotificationSendResult sendTo(String recipient, String title, String message) {
        try {
            credentials.refreshIfExpired();
            String accessToken = credentials.getAccessToken().getTokenValue();
            var body = Map.of("message", Map.of(
                "topic", "member_" + recipient,
                "notification", Map.of("title", title, "body", message)));
            client.post()
                .uri("https://fcm.googleapis.com/v1/projects/{p}/messages:send", projectId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve().toBodilessEntity();
            return NotificationSendResult.sent(null, "Push accepted by FCM.");
        } catch (RuntimeException e) {
            return NotificationSendResult.failed(e.getMessage());
        }
    }
}
```

Use the Google Auth library (`com.google.auth:google-auth-library-oauth2-http`) to mint tokens; do not
hand-roll the JWT exchange.

---

## 5. Billing, preferences and status interplay

- **Billing**: WhatsApp and SMS are metered from `notification_deliveries` where `status = 'sent'`
  (`PlatformBillingService.channelCount`). Once real providers write real statuses, the composed invoice
  reflects real charged volume automatically — no billing code change needed. Consider charging on
  `delivered` (via the WhatsApp webhook) rather than `sent` if you want to bill only confirmed messages.
- **Preferences**: nothing to change. `NotificationService` already gates each provider through
  `channelAllowed(tenant, member, channel)`, so SACCO channel toggles and member opt-outs apply to the
  real providers the same way they apply to the stubs.
- **Provider status**: implement `status()` on each real provider (e.g. a lightweight token/credit check)
  so the operations "Provider status" panel shows real readiness before staff retry failed deliveries.

---

## 6. Rollout checklist

1. Implement `MetaWhatsAppNotificationProvider` and/or `FcmPushNotificationProvider` beside the stubs.
2. Add the config keys and inject the secrets from the environment / secret manager.
3. In **one pilot SACCO**, set `SACCO_WHATSAPP_PROVIDER` / `SACCO_PUSH_PROVIDER` and enable the channel in
   the SACCO's notification-channels settings.
4. Confirm member consent/opt-in is captured before enabling WhatsApp for members.
5. Send a test broadcast; verify `notification_deliveries` rows show `sent`, then `delivered` (webhook).
6. Verify the composed invoice shows the WhatsApp usage line.
7. Roll out to remaining SACCOs; keep prod defaults empty so each SACCO stays opt-in.

---

## 7. Security & compliance

- Never store or request customer mobile-money PINs — WhatsApp/SMS/push carry notifications only.
- Store tokens and the FCM service-account JSON as secrets; keep them out of source control and logs.
- Capture and honour member consent per channel (already enforced technically via preferences; capture
  the consent record per PDPO — the SACCO is the data controller, the platform is the processor).
- Respect the 24-hour WhatsApp customer-service window: use approved templates for
  business-initiated messages; free-form only inside an active member-initiated conversation.

---

## Sources
- [WhatsApp Cloud API — Get Started (Meta for Developers)](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started)
- [Send a message using FCM HTTP v1 API (Firebase)](https://firebase.google.com/docs/cloud-messaging/send/v1-api)
- [Authenticate FCM HTTP v1 requests with OAuth 2 (Firebase)](https://firebase.google.com/docs/cloud-messaging/auth-server)
