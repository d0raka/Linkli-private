Open a NEW Astra chat on this project. Paste ONLY the text block below as the first message.

```text
# Linkli — make the product excellent, then make the SaaS publishable.

You are a senior full-stack engineer and product designer. You will finish this local app until a stranger can use it and the owner can publish it. Excellent means: real invitations people are proud to send, every button works, every plan matches the code, every flow is tested in a real browser. Not a demo. Not “looks fine.” Not “should work.”

Work only in `/Users/doraka/Documents/Projects/Apps:SaaS/OfirMigdal`.
https://linkli.online is the OLD live site. Ignore it. Local files win. If local and live disagree, local wins.

There is already uncommitted work. Read it first. Keep what is good. Upgrade it. Do not restart from scratch. Do not rewrite the stack. Do not research Grow or Stripe. Do not start with PayPal.

Product: Hebrew-first RTL invitation / surprise pages sent on WhatsApp. NOT link-in-bio. NOT a generic website builder.
Package: `linkli-saas`. Stack: Next.js 16 + React 19 + Vinext on Cloudflare Workers, D1 (`DB`), Images (`IMAGES`), Resend, hosted checkout.

Key files (read before editing):
`lib/templates.ts`, `app/p/[slug]/published-experience.tsx`, `app/studio/studio-client.tsx`, `app/studio/studio-shell.tsx`, `app/studio/editor-toolbox.tsx`, `app/create/birthday/`, `app/create/event/`, `app/create/wedding/`, `lib/plans.ts`, `lib/billing.ts`, `lib/rsvp.ts`, `lib/auth.ts`, `lib/email.ts`, `db/schema.ts`, `db/index.ts`, `app/page.tsx`, `app/api/health/route.ts`, `.env.example`, `docs/ops/launch-runbook.md`.

# DONE — only say done when ALL of this is true

A stranger can:
1. Open the landing page and understand Linkli in 10 seconds.
2. Register, verify email path, log in, log out, reset password.
3. Create a birthday, event, and wedding page from guided create.
4. Edit in studio, preview, publish, open `/p/{slug}` on a phone-width viewport.
5. Complete the guest experience end to end (questions, result, share).
6. RSVP on an event page; the host sees it in studio (and rehearsal does not persist).
7. Hit a plan lock that is honest (Free watermark / 1 live page; Pro photos+music; Max RSVP/calendar/Waze/password).
8. Open checkout and see either a real PayPal path OR honest Hebrew “התשלום ייפתח בקרוב” — never a dead button.
9. Contact support. See legal pages. Get Hebrew errors, never a stack trace.

AND you have proven it:
- `npm run check` is green.
- Relevant Playwright / unit tests are green, including new tests for what you changed.
- You opened localhost in a real browser and clicked every flow below. Screenshots alone are not proof.
- You wrote a short evidence note: command + result for each section. No “should work.”

If any item fails, it is not launch-ready. Fix it. Re-test. Then continue.

# ORDER — do not skip ahead

## 1. UPGRADE THE PRODUCT (main work — most of your time)

Make templates richer and worth ₪19.90 / ₪69. Crafted invitations, not a generic builder.

Upgrade every template in `lib/templates.ts` AND what guests actually see in `app/p/[slug]/published-experience.tsx`:
date, birthday, event, gift, memories, love-note, custom-blank, wedding, brit, mitzvah, henna.

If thank-you or save-the-date are still missing, add them after the list above is excellent. No 40-template marketplace. No Corporate / Business template.

For EACH template, all of this must be true:
- Unique copy, questions, decorations, result, color, motion. Not a recolor of birthday.
- Questions feel Israeli and specific (“דודה מהצפון”, וואטסאפ, בדיחה פנימית) — not translated corporate English.
- 2–4 questions with stable `id`s. RSVP widgets (`choice` / `guest-count` / `dj-song`) bind to question id, never to index. Reordering questions must not break guest-count or DJ.
- Guest journey works on a phone: tap, next, result, share. Large enough type (guest copy ≥ 15px). RTL. Honor reduced motion.
- Finale is a real moment (card, wax, scratch, candle, or reveal) — not a leftover form.
- Venue / date / countdown / calendar / Waze appear where they belong AND only if the plan allows them.
- WhatsApp: if the toggle is on and the phone is empty, live page still opens `https://wa.me/?text=...` (share sheet). Studio shows a persistent Hebrew warning. If the toggle is off, hide the button in preview AND live. Preview and live must match.
- Memories: Free = emoji + text (“מצגת זיכרונות”). Pro can attach a photo per slide. Do not call it an album unless a photo exists.
- If a control exists in studio, it must work on the published page. Delete or hide fake toggles. No dead buttons.

Host flow:
- `/create/birthday`, `/create/event`, `/create/wedding` — 3 steps, sessionStorage drafts, opaque draft id in the URL (never personal answers in query strings).
- Studio default for new hosts: מילים → אווירה → שיתוף. Advanced toolbox is secondary.
- Owner RSVP rehearsal on draft / studio preview: banner “מצב בדיקה — התשובה לא נשמרת”. Submit with `preview=1` — no DB row, no owner email. Published `/p/{slug}` stays real RSVP.
- Max RSVP settings already in config (`responseLimit`, `retentionDays`) must have studio fields. Do not invent new columns.
- Hide custom-domain chrome. Feature is closed. Do not build DNS.
- Free-plan copy everywhere: “עמוד מפורסם אחד · טיוטות ללא הגבלה”. Never “עמוד אחד” without “מפורסם”.

Quality bar: you would send this page to your own family on WhatsApp. If you would be embarrassed, keep going.

## 2. SAAS TOOLS — everything a real SaaS needs to launch

Use what already exists. Do not add random vendors, a new CRM, Stripe, analytics suites, or extra docs for their own sake.

AUTH & ACCOUNT — must work end to end:
- Register, login, logout, session cookie, email verification, resend verification, forgot password, reset password, change password, account settings, confirm-email change if it exists, delete-account path.
- Strong password with a Hebrew meter so 15 characters does not feel like a broken form.
- Signed-out create flows go to `/register?returnTo=…` and come back to the draft.
- Rate-limit auth and write routes. Same-origin on writes.
- Production without Resend: fail with a clear Hebrew message. Do not crash. Do not create a half-account that cannot verify.

DATABASE:
- D1 users, sessions, projects, RSVP, orders, support requests. Schema applied via `ensureDatabase` + incremental migrators. Additive only. No destructive rewrites.
- Migrations have tests (`schema-upgrade`, invariants). Existing data must survive.

EMAIL:
- Resend for verify, reset, change-password, delete, RSVP-to-owner. Secrets may be empty locally.
- Contact form emails support (`EMAIL_REPLY_TO` / support inbox) AND/OR stores the request where admin can see it. No silent black hole.
- Hebrew email copy. No stack traces in mail.

PLANS (code ids `free|pro|max|business`, UI names חינם / יוצר / אירוע / ארגונים):
- Free ₪0: 1 live page + watermark. Unlimited drafts.
- Pro ₪19.90 one-time: photos, YouTube music, no watermark, more pages.
- Max ₪69 one-time: RSVP, calendar, Waze/maps, password gate, more pages.
- Business: waitlist only. `parsePurchasablePlan` rejects it.
- UI, paywall, studio locks, and `lib/plans.ts` must say the same thing. If a feature is locked, the lock must be real AND the published page must not leak it.

ADMIN:
- `/admin` already exists. Make user + project management work. Do not invent a second admin.
- Document that Cloudflare Access should sit in front of `/admin` and `/api/admin` (runbook). Do not block on the owner doing that now.

SUPPORT / TRUST / SEO:
- Contact form works. Legal pages (`/legal`) present and consistent.
- `robots.ts` + `sitemap.ts` consistent. Personal `/p/{slug}` pages stay noindex.
- 404 and error pages in Hebrew, on-brand, with a way home.
- `GET /api/health` reports `{ ok, db, emailConfigured, billingConfigured, missing[] }` with no secret values.

SECURITY / OPS (code-side, secrets later):
- Never enable `BILLING_DEMO_MODE` in production. Do not recommend it in `.env.example`.
- Never rotate `AUTH_PEPPER` if users exist.
- Never store card numbers.
- Do not load Google Fonts (CSP + invariants forbid it). Only self-hosted Heebo/Rubik (or another self-hosted Hebrew font you actually add).
- `.env.example` lists every required var with placeholders only. No real emails, no real keys.
- `docs/ops/launch-runbook.md` stays the owner checklist: PayPal, Resend domain, Worker secrets, Workers Paid, D1 export, Access on admin. Update it; do not pretend owner actions are done.
- Prefer editing existing files. Justify any new dependency.

If time remains after the product is excellent: move new uploads to R2 binding `MEDIA` (bytes out of D1), per-page OG JPEG ≤ 300KB at `GET /api/public/[slug]/og`, memory-photo API, Turnstile on register/login/forgot/contact (fail closed in production if secret missing).

## 3. UX / UI — one stationery house

One visual system on landing, wizards, studio, published page, auth, paywall, checkout, 404:
- Paper (warm off-white), ink (deep warm black-violet), one seal accent (muted rose/carmine for primary actions only), thin gold-line on cards.
- Hebrew-first. Buttons say what happens: “שמירת העמוד”, “פרסום הקישור”, “שליחה בוואטסאפ”.
- Must NOT look AI-built: no cream-pink-purple SaaS clichés, no emoji rain on marketing, no 01/02/03 emoji grids, no marker underlines, no floating stat bubbles, no identical pink gradient on every button, no Rubik 900 with huge negative tracking on Hebrew headlines.
- Landing hero: a real invitation preview, not a fake phone with particle rain.
- Studio labels ≥ 13px. Guest copy ≥ 15px. RTL everywhere including emails and errors.
- Marketing pages almost still. One orchestrated moment on the published card. Honor `prefers-reduced-motion` and the existing a11y widget.

## 4. PAYMENT — only after 1–3 are excellent

PayPal-ready. Secrets later. Do not wait for the owner’s PayPal account. No Grow. No Stripe. No Link. Takbull / cards+bit later only if those env URLs are set.

- Checkout: PayPal when `BILLING_PAYPAL_URL` is set. Hebrew: “תשלום דרך PayPal (כרטיס או חשבון PayPal)”.
- If PayPal URL is empty: “התשלום ייפתח בקרוב”. Upgrade returns 503 `billing_unavailable`. Health `billingConfigured: false`.
- Keep hosted checkout in `app/api/billing/upgrade/route.ts` with `order_id`, `plan`, signed `state`, success/cancel URLs.
- Add `POST /api/billing/webhook/paypal` with official PayPal REST signature verification. Map CAPTURE / SALE / checkout completed into existing `applyBillingEvent`.
- Keep `POST /api/billing/webhook` HMAC for tests.
- Bind the payer with unique `order_id` / `custom_id` / `invoice_id`. A static PayPal.me with no order id is not acceptable. Never grant a plan from the success redirect. Success already polls `/api/billing/status`.
- Tests: success, duplicate event, bad signature. Demo-mode tests stay development-only.

## 5. PROVE IT — launch gate (do this for real)

Run `npm run check`. Run e2e. Then open localhost in a real browser and exercise every path like a user. Fix anything that fails. Re-run.

### Browser — marketing & trust
- `/` landing: Hebrew, stationery, primary CTA to create, plans match `lib/plans.ts`.
- `/legal`, `/contact` (submit a message), `/paywall`, `/login`, `/register`, `/forgot-password`, 404 (`/this-page-does-not-exist`).
- Mobile width (~390px) and desktop. RTL. Reduced-motion still usable.

### Browser — account
- Register a new user. See verify path (or honest Hebrew if email is unset).
- Login, logout, login again.
- Forgot / reset path (or honest Hebrew if email is unset).
- Account settings: change what exists, no crash.
- Free user cannot publish a second live page. Copy says “עמוד מפורסם אחד”.

### Browser — create, studio, publish (do birthday AND event AND wedding)
- Guided create → studio → save → draft preview → publish → open `/p/{slug}`.
- Edit headline, questions, decorations. Confirm the published page shows the same values.
- WhatsApp on with empty phone: warning in studio, share-sheet on live.
- WhatsApp off: hidden in preview and live.
- Memories: add a slide; Pro photo if you can; Free stays emoji+text.
- Event/Max: RSVP rehearsal in preview (no persist). Real RSVP on live page. Host sees the response. Export if the button exists.
- Password-gated page: guest is blocked until the password is correct.
- Every studio control you leave visible: turn it on, publish, confirm the guest sees it.

### Browser — plans & checkout
- Free watermark on live page.
- Locked Pro/Max features show a lock, not a broken control.
- Checkout with empty PayPal URL: “התשלום ייפתח בקרוב”, no fake charge.
- Success page does not grant a plan by itself.

### Browser — admin
- Admin can see users/projects (or document the exact blocker). No crash.

### Automated
- `npm run check`
- Auth, billing, RSVP, publish, health, schema-upgrade, a11y invariants, Playwright launch/a11y specs.
- New test for every behavior you change.
- Fonts: no Google Fonts. Picker only lists hosted fonts.

### Honest leftover list
In the runbook, list ONLY owner actions you cannot do in code (PayPal account, Resend domain, Worker secrets, Workers Paid, Access on admin). Everything else must already work.

# DO NOT

- Restart the repo or match CSS/copy from linkli.online.
- Research or implement Grow, Stripe, or Link.
- Start with payment.
- Invent a 40-template marketplace, decoration marketplace, or custom domains.
- Enable Business purchases.
- Load Google Fonts. Put secrets or passwords in git, README, or `.env.example`.
- Trust “it compiles.” Trust the browser and the tests.
- Ask the owner to choose providers, storage, plan names, or RSVP widget binding. Those are decided.

Skip: extra research, extra docs beyond the runbook, extra fonts, Business product, DNS.

Start at section 1. Product first. Then SaaS tools. Then UX. Then PayPal. Then the launch gate. The outcome is a site the owner can publish with confidence.
```
