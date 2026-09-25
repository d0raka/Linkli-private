Owner note: do not commit passwords. Paste the password only into Astra chat if you remove it from the block. Rotate the password after this session because it was shared in chat.

```text
# Linkli Astra CONTINUATION — do not restart

This is a CONTINUATION. Do not restart Phase 0. Do not re-audit from scratch. Preserve existing uncommitted work in the local tree. Read the files already changed, then continue from the in-progress items below. Do not open a new architecture debate. Do not ask where to work.

---

## CRITICAL: where you work (source of truth)

https://linkli.online is the OLD public site. It is NOT the source of truth.

The updated Linkli lives ONLY at:

`/Users/doraka/Documents/Projects/Apps:SaaS/OfirMigdal`

All edits, tests, and verification must be against that local tree. Do not treat the live site as the version you are shipping. Do not "fix production" by looking only at linkli.online. Do not scrape, copy, or "match" live CSS/copy from linkli.online as if it were current. If local and live disagree, local wins.

Package name: `linkli-saas`. Hebrew-first RTL invitation / surprise pages (WhatsApp), not a link-in-bio tool. Stack: Next.js 16.2 + React 19 + Vinext on Cloudflare Workers, D1 binding `DB`, Images binding `IMAGES`. Run from that repo. After UI work, verify in a real browser against localhost. After backend work, run `npm run check` and relevant Playwright specs in this repo.

Key files (local only):
- Plans: `lib/plans.ts`
- Billing: `lib/billing.ts`, `app/api/billing/upgrade/route.ts`, `app/api/billing/webhook/route.ts`, `app/api/billing/status/route.ts`
- Schema / migrator: `db/schema.ts`, `db/index.ts`
- Templates: `lib/templates.ts`
- Studio: `app/studio/studio-client.tsx`, `app/studio/studio-shell.tsx`, `app/studio/editor-toolbox.tsx`
- Published page: `app/p/[slug]/published-experience.tsx`
- Birthday / guided: `app/create/birthday/birthday-creator.tsx`, `lib/birthday-draft.ts`, `lib/guided-draft.ts`, `app/create/event/`, `app/create/wedding/`
- Worker: `worker/index.ts`
- Health: `app/api/health/route.ts`
- Env template: `.env.example` (no real secrets)
- Briefs (follow, do not rewrite): `docs/astra-launch-prompt.md` (PayPal-first Phase 1), `docs/astra-paypal-addendum.md`, `docs/ops/launch-runbook.md`

---

## BILLING OVERRIDE (already decided)

PayPal only for launch. Stop Grow research/integration. No Grow adapter, no `/api/billing/webhook/grow`, no `approveTransaction`. No Stripe/Link. Takbull / cards+bit later only, via empty optional `BILLING_CREDIT_CARD_URL` and `BILLING_BIT_URL`.

Follow `docs/astra-paypal-addendum.md` and the PayPal-first Phase 1 in `docs/astra-launch-prompt.md`.

Secrets will be added later; code must be secrets-optional:
- Checkout shows honest Hebrew “התשלום ייפתח בקרוב” / waitlist when PayPal URL is missing — not a fake live PayPal button.
- `POST /api/billing/upgrade` returns 503 `billing_unavailable` when `BILLING_PAYPAL_URL` (and fallback) are unset and demo mode is off.
- `GET /api/health` reports `billingConfigured: false` (never leak secret values).
- Keep hosted-checkout in `app/api/billing/upgrade/route.ts`: redirect to `BILLING_PAYPAL_URL` (optional `BILLING_CHECKOUT_URL` fallback) with `order_id`, `plan`, `state`, success/cancel URLs.
- Add `POST /api/billing/webhook/paypal` with official PayPal REST webhook verification (`verify-webhook-signature`). Map `PAYMENT.CAPTURE.COMPLETED` / checkout order completed / `PAYMENT.SALE.COMPLETED` into existing `applyBillingEvent` in `lib/billing.ts`.
- Keep `POST /api/billing/webhook` (HMAC Linkli-native) for tests. Never grant a plan from the success redirect alone.
- Bind the user via unique `order_id` / `custom_id` / `invoice_id`. A static PayPal.me with no order id is not acceptable.
- Hebrew: תשלום דרך PayPal (כרטיס או חשבון PayPal). Plan names: חינם / יוצר / אירוע. Do not mention Grow in the product UI.
- `BILLING_DEMO_MODE` cannot enable in production. Never list it as recommended in `.env.example`.

Owner will set up PayPal later. Do not wait. Do not ask for Client ID / Secret now.

---

## What you already completed (do not redo)

- Phase 0 readiness: 9 green tests; runbook with owner checklist, env inventory, rollback, clone-only restore rehearsal
- Cloudflare/Workers: made cron, R2, Images bindings explicit
- Media + accounts audits started
- Stationery visual direction started (warm paper, dark ink, restrained carmine, invitation preview)
- Guest-count and DJ are individual questions so reordering does not break RSVP
- New hosts: 3 guided steps מילים / אווירה / שיתוף
- Four required occasion templates + event/wedding wizards with distinct copy/layouts/palettes

You were about to: wire creator controls to the published page, owner RSVP rehearsal, memory-slide photos, WhatsApp share when no phone is set. CONTINUE those. Also finish PayPal-ready billing (not Grow).

---

## TEST LOGIN for the LOCAL app

Not production unless they later deploy. Use this only to exercise register/login/studio/checkout on localhost against the local repo.

Email: dor.aka.inbox@gmail.com
Password: DorLinkli150999

Do not print the password in logs, commits, README, or `.env.example`. Do not push it to git. If the account does not exist locally, create it via the app or test harness — do not assume linkli.online credentials work on a fresh local D1.

---

## Finish the remaining launch brief (continue, do not restart)

PayPal webhook + secrets-optional checkout, R2 media, remaining templates/options, UX stationery unification, verification (`npm run check`, e2e, real browser). Owner will set up PayPal later.

Continue from the in-progress product work, then close remaining phases in `docs/astra-launch-prompt.md` (PayPal-first Phase 1, then 2–7). Do not rewind Phase 0.

Immediate continue (you were mid-flight):
1. Wire creator / studio controls so they actually affect the published page (`app/p/[slug]/published-experience.tsx`). Preview and live must match.
2. Owner RSVP rehearsal: draft preview and `/studio/preview/[id]` render RSVP with banner “מצב בדיקה — התשובה לא נשמרת אצל האורחים”. Preview submits (`?preview=1` or `preview: true`) validate but do not insert a row and do not email. Published `/p/{slug}` stays real RSVP.
3. Memory-slide photos: optional `photoKey` on slides, Pro-gated upload/remove, icon field (max 8 chars). Free slides stay emoji+text. If no slide has a photo, copy says “מצגת זיכרונות”, never “אלבום”.
4. WhatsApp when no phone is set: if toggle is on and `whatsapp` is empty, live page uses `https://wa.me/?text=...` (share sheet) and studio shows persistent Hebrew warning. If toggle is off, hide the button in preview and live.
5. Finish PayPal-ready billing as specified above (not Grow). Fixtures: webhook success, duplicate event, bad signature. HMAC tests stay green.

Then finish remaining brief items already decided (do not reopen):
- R2 binding `MEDIA` for new background / emoji-image bytes; D1 keeps mime, key, version, owner/project ids; public URLs stay `/api/public/[slug]/background` and `/emoji`
- Remaining template/options honesty: hide decoration-set picker while only `"template"` exists; add `accent` bg style to the studio picker; Max-gated RSVP limit fields (`responseLimit`, `retentionDays`); hide custom-domain chrome; Free copy is “עמוד מפורסם אחד · טיוטות ללא הגבלה”; scratch canvas uses `config.fontFamily`
- Per-page OG JPEG ≤ 300KB at `GET /api/public/[slug]/og`; password-locked pages keep marketing OG
- Stationery unification: ink / paper / seal / gold-line; landing and studio move toward paywall stationery, not the old live site
- Email / Turnstile / health honesty if still open in the runbook
- Verification: `npm run check`, Playwright e2e, real browser on localhost (click, type, submit, navigate). Expand e2e if you touch register → create → publish → RSVP → checkout 503/honesty

If you must cut scope, still do not cut: PayPal webhook adapter, Resend, R2, backups, birthday funnel, event/wedding wizards, RSVP id-binding, per-page OG, WhatsApp CTA honesty, stationery unification.

Do not implement Grow. Do not treat linkli.online as the product. Do not commit secrets or this password. Start now in `/Users/doraka/Documents/Projects/Apps:SaaS/OfirMigdal`.
```
