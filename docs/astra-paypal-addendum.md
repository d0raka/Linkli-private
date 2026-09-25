If Astra already started on Grow or treated https://linkli.online as the product, stop that thread.
Paste the single fenced text block from `docs/astra-continuation.md` into a fresh Astra chat after you reset usage.
Do not restart Phase 0; the continuation is the source of truth for where to work and for PayPal-only billing.

```text
# Addendum — PayPal only for launch (amends the previous brief)

You already have `docs/astra-launch-prompt.md`. This is an amendment, not a restart.

Do not rewind templates, UX, R2, health, email, RSVP, or verification work. Keep implementing phases 0 and 2–7. Finish the rest of that brief.

The owner decided: **PayPal only for launch.** No Grow. No Stripe/Link. They will create the PayPal Business account later. Your job is to make the code and docs ready so adding Worker env secrets turns payments on — no further code change required.

---

## OVERRIDE Phase 1 and the Billing architecture decisions

Ignore every Grow-first instruction in the previous brief. Replace them with this:

- Do NOT implement Grow. Do not create `lib/billing-providers/grow.ts`. Do not add `/api/billing/webhook/grow`. Do not call `approveTransaction`. Do not mention Grow in the product UI.
- Do NOT require Takbull for launch. Takbull (Israeli cards + bit) is a later optional rail only. Leave `BILLING_CREDIT_CARD_URL` and `BILLING_BIT_URL` as empty optional env vars.
- Launch rail is **PayPal**.
- Keep the existing hosted-checkout model in `app/api/billing/upgrade/route.ts`: redirect to `BILLING_PAYPAL_URL` (and optional `BILLING_CHECKOUT_URL` fallback) with `order_id`, `plan`, `state`, success/cancel URLs. Card/bit URLs can stay empty.
- Checkout UI: show PayPal as the available method when `BILLING_PAYPAL_URL` is set. Do not show card/bit as live if those env URLs are empty. Hebrew copy must say תשלום דרך PayPal (כרטיס או חשבון PayPal) — honest, not “כל כרטיס תמיד”.
- Implement `POST /api/billing/webhook/paypal` that verifies PayPal webhook signatures with official REST webhook verification (PayPal `verify-webhook-signature` / documented REST verification — do not invent a weaker check). Map `PAYMENT.CAPTURE.COMPLETED` / checkout order completed / `PAYMENT.SALE.COMPLETED` (whichever PayPal actually sends for Checkout / Payment Links) into the existing `applyBillingEvent` in `lib/billing.ts`.
- Keep `POST /api/billing/webhook` (HMAC Linkli-native) for tests. Do not break existing HMAC webhook tests.
- Never grant a plan from the success redirect alone. The success page already polls `/api/billing/status` — keep that.
- Bind the user via a unique `order_id` / `custom_id` / `invoice_id` you attach when creating the PayPal payment or appending to `BILLING_PAYPAL_URL` query params. A static PayPal.me with no order id is NOT acceptable as the only bind.
- Prefer PayPal Checkout / Payment Links that accept `custom_id` or `invoice_id` = Linkli pending order id.
- Hebrew UI plan names stay חינם / יוצר / אירוע. Do not mention Grow in the product UI.

### Secrets-optional (mandatory)

Code must work with PayPal secrets MISSING:
- Checkout shows honest Hebrew “התשלום ייפתח בקרוב” / waitlist — not a fake live PayPal button.
- `POST /api/billing/upgrade` returns 503 `billing_unavailable` when `BILLING_PAYPAL_URL` (and fallback) are unset and demo mode is off.
- `GET /api/health` reports `billingConfigured: false` (no secret values leaked).

When the owner later sets Worker secrets, payments turn on with no code change. Billing phase status is: **PayPal-ready, secrets optional.** Do not wait for the owner’s PayPal account.

### Tests

Add fixtures for PayPal webhook success, duplicate event, and bad signature. Keep existing HMAC webhook tests green. Keep demo-mode tests isolated to development. Assert `BILLING_DEMO_MODE` cannot enable in production.

### Owner setup — document, do not block

Document this exact checklist in `docs/ops/launch-runbook.md` (create the file if missing). You cannot complete these in code. Leave them as checkboxes and continue.

- [ ] Create PayPal Business for Linkli
- [ ] Enable sandbox + live webhooks pointing to `https://linkli.online/api/billing/webhook/paypal`
- [ ] Prefer Checkout / Payment Links that accept `custom_id` or `invoice_id` = Linkli pending order id (not a static PayPal.me)
- [ ] Create hosted pages / links for Pro ₪19.90 and Max ₪69
- [ ] Copy Client ID / Secret if REST verification needs them
- [ ] Set Worker secrets: `BILLING_PAYPAL_URL`, optional `PAYPAL_WEBHOOK_ID` / `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
- [ ] Confirm `BILLING_DEMO_MODE` is unset in production (not set to false — absent)
- [ ] Card/bit URLs stay empty until a later Takbull rail

Takbull / Israeli cards + bit remains a later optional add-on. Stripe/Link is still forbidden.

---

## Continue and FINISH the rest of the original brief

Do not pause the launch for PayPal account creation. Keep working:

- Phase 0 — runbook, health (`billingConfigured` keyed off `BILLING_PAYPAL_URL`), R2 binding `MEDIA`, `.env.example` without real secrets
- Phase 2 — Resend, Turnstile, contact email
- Phase 3 — R2 media, D1 backups
- Phase 4 — templates, guided create, RSVP widgets, memories honesty, OG, WhatsApp CTA
- Phase 5 — stationery UX
- Phase 6 — observability, legal, per-page OG
- Phase 7 — verification commands and browser pass

If you must cut scope, still do not cut the PayPal webhook adapter, Resend, R2, backups, birthday funnel, event/wedding wizards, RSVP id-binding, per-page OG, WhatsApp CTA honesty, or stationery unification.

Evidence for the amended billing phase: PayPal fixture tests pass (success / duplicate / bad signature); HMAC tests still pass; upgrade returns 503 `billing_unavailable` and checkout shows “התשלום ייפתח בקרוב” when secrets are missing; health reports `billingConfigured: false` until `BILLING_PAYPAL_URL` is set.
```
