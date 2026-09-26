# Linkli business upgrade blueprint

Date: 27 July 2026

## Product read

Linkli is a Hebrew-first micro-page builder for emotional, social, and event moments: birthdays, date invitations, RSVP pages, friendship quizzes, love notes, and playful surprise pages. The strongest business angle is not "website builder"; it is "turn a personal moment into an interactive link people actually open and share."

Current strengths:

- Clear free offer: first interactive page free, no credit card.
- Plus offer exists: ₪9.90/month for up to 10 pages, all templates, and no Linkli branding.
- The app already has templates, previews, authenticated Studio, publishing, WhatsApp sharing, password protection, legal pages, admin metrics, campaign attribution, waitlist capture, and security work.
- Lint and production build passed locally.

Main gaps before serious paid marketing:

- Automated payment is still conditional on hosted billing URLs; production currently falls back to early-access/waitlist when billing is unavailable.
- The offer should be narrowed for the first launch. TikTok needs one sharp use case, not "many kinds of pages."
- There is no public proof layer yet: examples, testimonials, creator videos, before/after demos, or visible customer outcomes.
- TikTok measurement should be added before paid ads: Pixel/Events API or GTM, consent handling, and conversion events mapped to the current funnel.
- The admin dashboard tracks a good funnel, but the business needs weekly decision rules and content cadence.

## Positioning

Primary positioning:

"Linkli helps people create an interactive birthday, invitation, quiz, or surprise page in minutes and share it as one beautiful WhatsApp-ready link."

First launch wedge:

Start with birthdays and event invitations. They have urgency, emotional value, obvious sharing behavior, and an easy video demo.

Audience:

- People planning birthdays, couple surprises, dates, small events, and celebrations.
- Early paying segment: creators, small event planners, social media managers, families organizing multiple events.

Core promise:

"Instead of sending another regular message, send a little experience."

## Business-level product upgrades

Phase 1: Conversion readiness, week 1

- Make one landing path per use case: birthday, RSVP, date invitation.
- Add 3 public example pages that open instantly without registration.
- Add a visible "try demo" CTA above signup.
- Add stronger proof blocks: "built in minutes", "share through WhatsApp", "works on mobile", "first page free."
- Keep the free plan as the main TikTok CTA. Do not sell Plus first.

Phase 2: Activation readiness, week 2

- Add onboarding that drops users straight into a selected template from the campaign URL.
- Add a first-publish checklist inside Studio: choose template, edit headline, edit questions, publish, share.
- Add one-click copy/share controls for TikTok bio, WhatsApp, Instagram story, and direct link.
- Add default example text for each template so users can publish fast.
- Add "duplicate page" for Plus users. This is a strong upgrade reason for event planners and creators.

Phase 3: Payment readiness, week 3

- Connect the real billing provider for card payments first; add PayPal/bit only if the provider truly supports subscriptions or clear manual renewal.
- Ensure the webhook handles active, cancelled, failed payment, and refunded states.
- Add account billing status: current plan, renewal date, cancel instructions, invoice/support link.
- Keep the waitlist as fallback only, not the main checkout flow once paid traffic starts.

Phase 4: Trust and operations, week 4

- Add FAQ: what Linkli is, who sees the page, how passwords work, how to delete content, how billing works.
- Add support SLA target: reply within 24 hours during launch.
- Add a simple weekly business dashboard: visitors, CTA rate, signup rate, created page rate, published page rate, checkout/waitlist rate, paid conversion.
- Add 10-20 seeded demo templates/examples to make the product feel alive.

## TikTok launch strategy

Organic content goal:

Prove the magic visually before asking people to register. Every video should show the finished page opening on a phone within the first 2 seconds.

Content pillars:

- Before/after: "normal birthday message" vs "interactive birthday page."
- Build with me: screen recording of creating a page in under 60 seconds.
- Use-case hooks: birthday, wedding RSVP, date invitation, friendship quiz, prank page.
- Reaction angle: recipient opens the link and answers the questions.
- Founder/building in public: what you are improving and why.

Video format:

- Use 9:16 vertical video.
- Keep most launch creatives at 9-20 seconds for organic and Spark-style testing.
- Include motion, screen recording, voiceover or clear sound, and readable captions.
- Avoid static-image-only ads.

First 30-day cadence:

- Post 2 videos per day for 30 days.
- Produce in batches: 10 hooks, 5 templates, 3 editing styles, then remix.
- Use one CTA per video: "link in bio - create your first page free."
- Pin 3 videos: birthday demo, event invitation demo, and "what is Linkli?"

Example hooks:

- "I built a birthday greeting that people actually want to open."
- "Stop sending boring event invites. Send this link instead."
- "POV: you want to ask someone out, but make it cute."
- "This took less than one minute to make."
- "Your WhatsApp invite can look like a tiny game."
- "I made a page that reveals the surprise only after 3 questions."

Organic profile setup:

- Name: Linkli
- Bio: "Interactive birthday, invite and surprise pages. First page free."
- Link: `https://linkli.online/?utm_source=tiktok&utm_medium=organic_social&utm_campaign=bio`
- Pinned videos: product demo, birthday demo, event invite demo.

Paid TikTok testing plan:

- Do not start paid ads until TikTok web measurement is installed and verified.
- Start with Spark Ads from the best organic posts.
- Test 3 campaigns: birthday, event RSVP, date invitation.
- Use `utm_source=tiktok`, `utm_medium=paid_social`, `utm_campaign=birthday_launch`, and `utm_content=video_01` style naming.
- First decision point: 100 landing views per creative.
- Pause creatives with no signup after 100 visits.
- If CTA rate is below 10%, fix the landing message.
- If signup rate is below 5%, fix registration/friction.
- If fewer than 40% of signups create a page, fix onboarding.
- If fewer than 40% of created pages publish, fix editor/publishing.

Recommended TikTok web events:

- ViewContent: landing/demo page view.
- CompleteRegistration: account created.
- CustomizeProduct: page created or template customized.
- SubmitForm: Plus waitlist joined.
- InitiateCheckout: checkout started.
- Purchase: Plus activated after payment webhook.

## 7-day action plan

Day 1: Pick the launch wedge: birthday first, RSVP second, date invitation third.

Day 2: Create three polished public demo pages and make them visible from the landing page.

Day 3: Install TikTok measurement with privacy/consent reviewed, then verify events.

Day 4: Connect production billing or explicitly keep Plus as early access until payment is ready.

Day 5: Record 15 short TikTok videos using the same screen demos and different hooks.

Day 6: Publish the first 6 videos and watch comments, saves, profile clicks, and registrations.

Day 7: Review the funnel in admin. Improve the weakest step before spending on ads.

## Current official TikTok references checked

- TikTok Creative Center is the official place for trends, top ads, examples, and creative tools: https://ads.tiktok.com/help/article/creative-center
- TikTok In-Feed auction ads recommend vertical 9:16 video and list current ad specs: https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads
- TikTok ad format policy requires legible, dynamic video with audio and standard video sizes: https://ads.tiktok.com/help/article/tiktok-ads-policy-ad-format-and-functionality
- TikTok Pixel helps measure website traffic, campaign performance, optimization, and audiences: https://ads.tiktok.com/help/article/tiktok-pixel
- TikTok standard web events include CompleteRegistration, InitiateCheckout, Purchase, Contact, and CustomizeProduct: https://ads.tiktok.com/help/article/standard-events-parameters
