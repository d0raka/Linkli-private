### PayPal / hosted checkout (launch rail)
- [ ] Create PayPal Business for Linkli
- [ ] Enable sandbox + live webhooks pointing to `https://linkli.online/api/billing/webhook/paypal`
- [ ] Prefer Checkout / Payment Links that accept `custom_id` or `invoice_id` = Linkli pending order id (not a static PayPal.me)
- [ ] Create hosted pages / links for Pro ₪19.90 and Max ₪69
- [ ] Copy Client ID / Secret if REST verification needs them
- [ ] Set Worker secrets: `BILLING_PAYPAL_URL`, optional `PAYPAL_WEBHOOK_ID` / `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
- [ ] Confirm `BILLING_DEMO_MODE` is unset in production (not set to false — absent)
- [ ] Card/bit URLs stay empty until a later Takbull rail

### Resend / email
- [ ] Add and verify domain `linkli.online` in Resend (SPF, DKIM, DMARC)
- [ ] Set production `EMAIL_FROM` to `Linkli <account@linkli.online>` (or the verified mailbox you create)
- [ ] Set `RESEND_API_KEY`, `EMAIL_REPLY_TO`, and a support inbox
- [ ] Send one real verify / reset / RSVP-owner email on production and confirm inbox + spam

### Cloudflare Worker secrets and plan
- [ ] Confirm the Worker is on **Workers Paid** (required for D1 Time Travel 30 days and production read/write headroom)
- [ ] Set secrets (values never committed): `AUTH_PEPPER`, `BILLING_WEBHOOK_SECRET`, `BILLING_STATE_SECRET`, checkout URLs, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`, Turnstile keys, `CF_ACCESS_AUD` when Access is on
- [ ] Confirm `BILLING_DEMO_MODE` is **absent** in production (not set to false — unset)
- [ ] Confirm bindings `DB`, `ASSETS`, `IMAGES`, `MEDIA` (R2) exist on the deployed Worker
- [ ] Confirm cron `15 3 * * *` is registered on the deployed Worker
- [ ] Practice one D1 Time Travel restore onto a disposable clone (never prod)
- [ ] Schedule weekly `wrangler d1 export` to R2
- [ ] Put Cloudflare Access in front of `/admin` and `/api/admin`
- [ ] Point an uptime monitor at `https://linkli.online/api/health`

### Do not ask the owner to decide
Do not ask which payment provider (PayPal for launch), whether to use R2, whether to keep Vinext, which plan names to use, whether custom domains ship now, whether Business is purchasable, or how RSVP widgets should bind. Those are decided above.


## Historical production inventory — 2026-09-05

The local repository is the source of truth. The old live site is not this implementation; all new testing runs on localhost. No deployment is part of this continuation.

Read-only Sites inventory: Linkli is public at https://linkli.online. Configured names:
ADMIN_EMAILS, AUTH_PEPPER, EMAIL_FROM, EMAIL_REPLY_TO, RESEND_API_KEY. Secret values were not inspected or logged.
Missing billing, PayPal and Turnstile configuration must be supplied before launch. Never rotate AUTH_PEPPER for existing users.
The repository declares DB, ASSETS, IMAGES and MEDIA, with cron `15 3 * * *` (UTC).
The pre-existing generated build had no cron, R2 or Images; it is stale and is not proof of deployment.
Sites does not expose deployed Worker schedules or account tier through the available read APIs.
Deployed binding names, cron registration and Workers Paid remain **unverified owner actions** above.
Logical MEDIA bucket: `linkli-media` for direct Wrangler/local configuration. Sites provisions its physical bucket; record its actual name from the deployed Worker bindings before backups.

## Environment inventory

`.env.example` is the names-only inventory. AUTH_PEPPER strengthens password hashes (generate once).
BILLING_WEBHOOK_SECRET authenticates native callbacks; BILLING_STATE_SECRET binds checkout to orders.
BILLING_PAYPAL_URL provides hosted checkout; BILLING_CHECKOUT_URL is an optional fallback. Card/bit URLs stay empty for launch.
BILLING_PORTAL_URL is optional. PAYPAL_WEBHOOK_ID, PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET verify provider notifications. PAYPAL_ENVIRONMENT selects live or sandbox.
RESEND_API_KEY and verified EMAIL_FROM deliver account/RSVP mail; EMAIL_REPLY_TO and SUPPORT_INBOX route support.
ADMIN_EMAILS is the admin allowlist. CF_ACCESS_AUD and CF_ACCESS_TEAM_DOMAIN restrict administrative access.
TURNSTILE_SITE_KEY is public; TURNSTILE_SECRET_KEY validates challenges; TURNSTILE_HOSTNAMES restricts origin.
BILLING_DEMO_MODE and TURNSTILE_TEST_BYPASS must be absent in production.
DB/ASSETS/IMAGES/MEDIA are bindings, not string secrets. NODE_ENV is supplied by the runtime/build.

## Deploy and rollback

1. Run `npm run check`, `npm run test:e2e`, then `npm run build`. Inspect `dist/server/wrangler.json` for DB, ASSETS, IMAGES, MEDIA and cron.
2. Existing Sites project: reuse `.openai/hosting.json` project_id, save the exact validated source/build as a version and deploy that saved version. Do not replace the production D1 with the all-zero local database ID.
3. In Worker Settings confirm Workers Paid and `15 3 * * *`; verify `/api/health` returns 200 with `{ok:true,db:"ok",emailConfigured:true,billingConfigured:true,missing:[]}`.
4. Roll back the Worker to the prior saved Sites version (or `npx wrangler rollback <previous-version-id>` for direct Cloudflare deployments). Schema changes are additive; rollback does not rewind data.
5. Verify register/verification, one publication, provider callback, mail delivery, media and OG after deployment.

## Backups and restore rehearsal

Production requires Workers Paid: D1 Time Travel retention is 30 days (Free: 7 days), and free daily read/write limits are enforced.
Time Travel is always on. **Restore overwrites the target database in place; it cannot restore a production bookmark into a different database.** Rehearse on a disposable clone created by SQL export/import, using that clone's own Time Travel history. Never practice on production.

```sh
# Run on an authenticated operator machine. Substitute actual deployed DB name.
npx wrangler d1 info <production-database-name>
npx wrangler d1 export <production-database-name> --remote --output=/tmp/linkli-backup.sql
npx wrangler d1 create linkli-restore-rehearsal
npx wrangler d1 execute linkli-restore-rehearsal --remote --file=/tmp/linkli-backup.sql
npx wrangler d1 time-travel info linkli-restore-rehearsal
# Record the CLONE bookmark above, then make a disposable marker.
npx wrangler d1 execute linkli-restore-rehearsal --remote --command 'CREATE TABLE restore_rehearsal_marker (id INTEGER)'
npx wrangler d1 time-travel restore linkli-restore-rehearsal --bookmark=<clone-bookmark>
npx wrangler d1 execute linkli-restore-rehearsal --remote --command "SELECT name FROM sqlite_schema WHERE name='restore_rehearsal_marker'"
# Expected: no marker. Validate schema/counts and app on clone before disposing.
```

Schedule weekly off-peak export on an authenticated runner; exports briefly block database requests. Use a private backup bucket with restricted access and lifecycle retention, separate from guest media. Do not commit exports.

```sh
npx wrangler d1 export <production-database-name> --remote --output=/tmp/linkli-weekly.sql
npx wrangler r2 object put <private-backup-bucket>/weekly/<UTC-date>.sql --file=/tmp/linkli-weekly.sql --remote
# Rehearse the exported backup too:
npx wrangler r2 object get <private-backup-bucket>/weekly/<UTC-date>.sql --file=/tmp/linkli-restore.sql --remote
npx wrangler d1 execute linkli-restore-rehearsal --remote --file=/tmp/linkli-restore.sql
```

Sources: [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 export/import](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

## PayPal activation and secret rotation

Billing is PayPal-ready with secrets optional. Missing URL: checkout says “התשלום ייפתח בקרוב”, upgrade returns 503 `billing_unavailable`, health reports `billingConfigured: false`.
Set BILLING_PAYPAL_URL to hosted Checkout that preserves the unique Linkli order in custom_id/invoice_id. A static PayPal.me link is insufficient. Confirm correlation using a sandbox payment before setting the live URL. Prices remain `linkli-pro` ₪19.90 / 1990 agorot and `linkli-max` ₪69 / 6900 agorot; Business is waitlisted.
Set the REST client credentials and webhook ID for the same PayPal environment. Provider authenticity uses official verify-webhook-signature; unknown/unverified notifications fail closed. Never grant a plan from the browser success redirect.
For native HMAC key rotation: pause internal callback delivery, drain in-flight callbacks, update BILLING_WEBHOOK_SECRET in sender and Worker, replay a test and resume retries. Keep BILLING_STATE_SECRET stable while pending orders exist. AUTH_PEPPER is not a rotatable webhook key.
Never log callback payloads, payer email, phone, or secrets. Troubleshoot with event ID/request ID.

## Monitoring and launch evidence

Worker Observability records structured errors with request ID. Invocation logs are disabled to avoid recording personal URLs/query strings. Do not log request bodies, tokens or payment PII.
Uptime URL: https://linkli.online/api/health. Owner must connect the monitor and test an alert.
Phase evidence is recorded in `docs/ops/launch-evidence.md`; account-only checks remain unchecked until actually exercised.
