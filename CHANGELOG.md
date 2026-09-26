# Changelog

All notable changes to Linkli are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Design system: semantic tokens (light, opt-in dark, high contrast), `ui-` primitives and React components for buttons, fields, badges, notices, dialogs, menus, toasts and empty states. Icons come from one family (Phosphor).
- Guests page per invitation (`/studio/[id]/guests`): who is coming, total guests, song requests, a searchable response table with delete, and export to Excel/CSV.
- Every page has its own editor URL (`/studio/[id]`), so the browser back button, bookmarks and "open in new tab" work. Old `/studio?edit=` links redirect.
- `/pricing` with plan columns, a feature-by-plan comparison table and the referral program. `/paywall` redirects permanently.
- Landing page FAQ covering apps, privacy, editing after sending, the free plan, payment and deletion.

### Changed

- New landing page: a split hero with a live, clickable invitation in a phone frame (birthday, wedding or date), how it works, a template showcase, the real WhatsApp message guests receive, host tools for events, pricing, FAQ and a closing call to action. Campaign links with `?template=` open the matching example and creation flow.
- Guided creators (birthday, wedding, event) share one layout and preview the real invitation renderer with the host's answers applied, instead of a hand-drawn imitation.
- Sign-in, sign-up, password recovery and email verification share one focused layout built from the new form components.
- Legal, accessibility, contact, 404 and payment result pages use the public site header and footer and readable long-form typography.
- Visible copy no longer uses em-dashes; plan and template texts were tightened.
- The Studio home is now a server-rendered "My pages" list: each page shows a thumbnail of the invitation, its state (draft or live), views, responses or confirmed guests, and the next useful action (continue editing, or share on WhatsApp). The duplicate stats strip, "next action" card and five-step journey card are gone.
- The template gallery groups templates into invitations and greetings; the whole thumbnail starts a page, and guided-wizard drafts are applied before the editor opens.
- Authenticated pages share one header with an account menu (settings, plan and billing, admin, help, sign out) instead of a crowded top bar.
- Plans now limit published pages only. Drafts are unlimited on every plan (with an account-wide cap of 100 to stop abuse); previously paid plans could not even start a draft once their quota was full.
- Page deletion and unpublishing use accessible confirmation dialogs instead of `window.confirm`.
- The editor has its own focused top bar: back to "My pages", the page title with its live/draft state and a save indicator, preview, and one primary action (publish a draft, or update a live page), with share and an overflow menu. Cmd/Ctrl+S saves.
- Drafts save automatically about a second after each change. Live pages only change when "Update page" is pressed, so guests never see half-typed text; leaving with pending updates asks first.
- Editable regions on the canvas are outlined only on hover or focus instead of permanently.

### Fixed

- The Business waitlist form asked for consent to be contacted about "Linkli Max", a different, purchasable plan.

- Clicking a short text element twice to edit it no longer lands on a resize handle; handle hit areas extend outward only.
- A fast second click on a selected element now reliably enters text editing (the selection was read from a stale render).
- Text typed while a save was in flight could be overwritten by the server response; saves are now serialized and newer local edits win.
- Window-level pointer listeners in the canvas used a stale transform handler from the first render.

### Security

- Upgraded `next` to 16.3.6, React / React DOM / `react-server-dom-webpack` to 19.2.8 (Server Functions DoS advisory), Vite to 8.0.16, `@cloudflare/vite-plugin` to 1.60.2 and Wrangler to 4.141.0. The pinned PostCSS override moved from a vulnerable 8.5.19 to 8.5.28. The production dependency audit now reports no known vulnerabilities outside vinext's bundled `image-size`.
- Removed a personal owner email that granted admin rights to any local development session. Admin access now comes only from `ADMIN_EMAILS`.
- Removed obsolete AI-agent handoff prompts from `docs/`, one of which contained a plaintext account password. The password remains in earlier Git history and must be rotated.

### Performance

- Split the 288KB global stylesheet into route-scoped sheets. Guest pages (`/p/[slug]`, template previews and draft previews) no longer download editor and marketing CSS; the editor stylesheet loads only inside the Studio. About 37KB of CSS that no component could produce was deleted.

### Removed

- Unused components (`hero-interactive`, `account-header`), a dead re-export module, unused Open Graph images, and committed Playwright screenshots and CLI snapshots.

### Changed

- Business and security documents moved from the repository root into `docs/`.
- ESLint ignores intentionally unused `_`-prefixed arguments and variables.
