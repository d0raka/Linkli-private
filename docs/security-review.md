# Linkli application security review

Date: 15 July 2026

## Scope and limitations

This review covered the Linkli application code and its public, authenticated, owner/admin, page-password, billing-webhook, email-verification, password-reset, support, analytics, and publishing flows. It included source review, dependency auditing, production builds, and non-destructive local browser tests.

This is an application security review, not a certification or a substitute for an independent infrastructure penetration test. It did not attempt denial-of-service traffic, social engineering, provider compromise, or testing of Resend, WhatsApp, payment providers, Cloudflare, or OpenAI infrastructure outside Linkli's own code.

The deployed application currently uses its own server-side authentication and a hosted D1 database. No Supabase client, Supabase Auth, service-role key, or Supabase database call is present in the application source.

## Result

No known critical or high-severity application vulnerability remained after the fixes in this review. The production dependency audit reported zero known vulnerabilities.

## Findings fixed in this review

### 1. Duplicate project creation - Medium

Repeated clicks could submit multiple create requests before the editor appeared. The client now locks all template choices immediately while creation is in progress. The API also accepts an idempotency key, uses it as the project identifier, and performs the plan-limit check inside the atomic insert statement. Retrying the same request returns the existing project.

### 2. Page-password access survived password rotation - Medium

A visitor who had unlocked a protected page could previously retain access for the cookie lifetime after the owner changed the page password. The access signature now includes the current password hash, so changing the password immediately invalidates previous access cookies.

### 3. Authentication email origin trust - Medium

Verification and password-reset links were previously based on the incoming request origin. Production email links are now pinned to `https://linkli.online`; local development continues to use the local origin.

### 4. Login and registration abuse limits - Medium

Rate limiting previously combined account and IP into one bucket. Login and registration now have separate per-account and per-IP limits, reducing distributed password guessing and bulk account creation.

### 5. Stored-text hardening - Low

All template content already had server-side length limits and was rendered through React text nodes, which escape HTML. Stored plain text is now also Unicode-normalized and stripped of control characters and bidirectional override characters. Matching `maxLength` limits were added to the editor controls. Request bodies remain capped before JSON parsing.

### 6. Same-origin write verification - Low

Write routes already compared the `Origin` header and blocked cross-site Fetch Metadata. Requests that omit both a valid origin and same-origin Fetch Metadata are now rejected. Same-site and cross-site submissions are rejected.

### 7. Sensitive-page caching and response headers - Low

Account, verification, password recovery, and reset pages now receive private no-store caching. Additional browser hardening headers were added for origin isolation and cross-domain policy files.

## Controls verified

- Passwords are processed with a server-side HMAC secret and bcrypt cost 12; plaintext passwords are not stored.
- Session tokens and email/reset tokens are random, stored as hashes, expire, and are placed in `HttpOnly`, `Secure`, `SameSite=Lax`, host-only cookies in production.
- Password changes revoke all account sessions.
- Email verification is required before Studio and write operations.
- Project, publishing, page-password, account, and admin actions enforce authorization on the server.
- Project queries are scoped by owner email; public pages require a valid slug and published status.
- SQL values use bound parameters. The only dynamic analytics column is selected from a fixed two-value allowlist.
- JSON content type and byte limits are enforced before parsing.
- Template identifiers, UUIDs, slugs, emails, colors, phone numbers, plan values, topics, event types, and webhook fields are allowlisted or format-validated.
- Billing webhooks require a timestamped HMAC signature and reject replayed event identifiers.
- Contact and registration forms include honeypots and rate limits.
- No `dangerouslySetInnerHTML`, direct `innerHTML`, `eval`, or dynamic function construction is used for user content.
- Security headers include CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, permissions policy, COOP, and CORP.
- A stored script-tag payload remained literal text after save/reload; no DOM element was created from it. Bidirectional override characters were removed.
- Rapid duplicate clicks produced one local draft. Password rotation invalidated a previously unlocked local page session.
- Production dependencies: zero known vulnerabilities reported by `npm audit --omit=dev` on the review date.

## Remaining recommendations

### CAPTCHA / bot challenge - Medium abuse risk

Rate limits and honeypots reduce automated abuse, but a managed challenge would add another layer to registration, login, password recovery, and contact submission. Cloudflare Turnstile can be added once a site key and secret are available.

### Owner multi-factor authentication - Medium account risk

The owner/admin account is protected by the same password-based flow as other accounts. Add MFA or move owner administration behind an identity provider before the service holds materially sensitive customer data.

### Content Security Policy - Low defense-in-depth risk

The framework currently requires inline scripts, so the CSP contains `script-src 'unsafe-inline'`. No executable user-content sink was found, but a future framework-supported nonce or hash-based CSP would further reduce impact if a new HTML injection bug is introduced later.

### Independent external test

Before a high-traffic launch or handling sensitive data, commission an independent test that includes Cloudflare configuration, DNS, TLS, account recovery abuse, payment-provider configuration, operational access, backups, logging, and incident response.
