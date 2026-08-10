# Setting up MTN MoMo collection for a SACCO (Green Valley)

This wires the backend to MTN MoMo so the app can initiate mobile-money collections. It uses the
**sandbox** first (free, proves the integration works) and then the **production** path (needed for a
real prompt to ring the payer's phone).

Two constraints to keep in mind:

- The backend runs **one** mobile-money provider at a time (`SACCO_MOBILE_MONEY_PROVIDER`). This
  setup makes **MTN** active platform-wide; each SACCO is still gated by its collection mode.
- The MTN **sandbox does not ring a real phone** — it simulates the payment. A real prompt to
  `0779494225` needs **production** credentials (MTN merchant/KYC onboarding).

---

## 1. Get MTN MoMo credentials

1. Create an account at **https://momodeveloper.mtn.com** and, under Products, **subscribe to
   "Collections."** Open your profile/subscription and copy the **Primary key** — this is your
   `SACCO_MTN_MOMO_SUBSCRIPTION_KEY`.

2. Provision a sandbox **API User** and **API Key**. Generate a UUID (that UUID *is* your API User
   ID), then run (replace `SUBKEY` and `UUID`):

   ```bash
   # Create the API user
   curl -i -X POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser \
     -H "X-Reference-Id: UUID" \
     -H "Ocp-Apim-Subscription-Key: SUBKEY" \
     -H "Content-Type: application/json" \
     -d '{"providerCallbackHost":"example.com"}'      # expect 201 Created

   # Create the API key for that user
   curl -s -X POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/UUID/apikey \
     -H "Ocp-Apim-Subscription-Key: SUBKEY"           # returns {"apiKey":"..."}
   ```

   - `UUID`  → `SACCO_MTN_MOMO_API_USER_ID`
   - `apiKey` from the second call → `SACCO_MTN_MOMO_API_KEY`

## 2. Configure the backend

Fill in `deploy/mtn-momo.env.example` and load those variables into your backend environment
(docker-compose `backend.env`, or `export` them before starting the Java app). The essentials:

```
SACCO_MOBILE_MONEY_PROVIDER=mtn_momo
SACCO_MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
SACCO_MTN_MOMO_TARGET_ENVIRONMENT=sandbox
SACCO_MTN_MOMO_SUBSCRIPTION_KEY=...
SACCO_MTN_MOMO_API_USER_ID=...
SACCO_MTN_MOMO_API_KEY=...
SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS=false   # sandbox
```

**Restart the backend.** Then, as a platform admin, open the platform **Integrations / operations
readiness** view — MTN MoMo should show as configured and active. (Green Valley already has
mobile-money allowed + active from the collection-mode migration.)

## 3. Test a collection (sandbox)

1. Log in as a Green Valley member (e.g. `GVS-0001`) → **Money → Pay by mobile money** → enter an
   amount, payer `0779494225`, **Pay now**. The backend calls MTN `requesttopay`; you should get an
   accepted payment request (status `pending_provider_callback`).

2. Sandbox sends **no** callback, so complete the payment by simulating it (signing is off):

   ```bash
   curl -i -X POST http://localhost:8080/api/v1/integrations/mobile-money/callback \
     -H "Content-Type: application/json" \
     -d '{
           "tenantId": "tenant_green",
           "memberIdentifier": "GVS-0001",
           "purpose": "savings_deposit",
           "amount": 5000,
           "externalReference": "PASTE-THE-REQUEST-REFERENCE",
           "provider": "mtn_momo"
         }'
   ```

   This records the deposit as **pending approval** (per the maker-checker rule).

3. Log in as the **Treasurer** → **Approvals** → approve the pending deposit. The member's balance is
   credited. That's the full collection loop verified.

## 4. Going to production (real prompt on the phone)

Complete MTN's **merchant/KYC onboarding** to get production credentials, then switch:

```
SACCO_MTN_MOMO_BASE_URL=https://proxy.momoapi.mtn.com
SACCO_MTN_MOMO_TARGET_ENVIRONMENT=mtnuganda
SACCO_MTN_MOMO_SUBSCRIPTION_KEY=...(production)
SACCO_MTN_MOMO_API_USER_ID=...(production)
SACCO_MTN_MOMO_API_KEY=...(production)
SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS=true
SACCO_MOBILE_MONEY_CALLBACK_SECRET=...(a strong shared secret)
```

Give MTN your public callback URL (`https://<your-domain>/api/v1/integrations/mobile-money/callback`).
Now a real payment initiated to `0779494225` prompts that phone, and MTN posts a signed callback that
the backend verifies and records automatically (still pending treasurer approval).

---

### Adding Airtel too

Because only one provider is active at a time, using the Airtel number `0700940858` in parallel needs
a small code change to route by the member's chosen network (MTN vs Airtel) to the matching provider.
Say the word and I'll implement that.
