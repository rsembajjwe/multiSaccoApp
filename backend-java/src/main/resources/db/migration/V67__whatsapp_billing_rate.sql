-- WhatsApp is a charged notification channel (each message costs money to send), so it is metered for
-- billing exactly like SMS. This adds the platform-wide WhatsApp rate to the billing catalog. Push and
-- email remain free/included and are not metered. No member funds are touched, so no Bank of Uganda
-- payment licence is triggered.
INSERT INTO platform_billing_catalog (code, name, category, unit_price, billing_period) VALUES
    ('whatsapp_rate', 'WhatsApp message', 'whatsapp_rate', 60, 'metered');
