# Changelog

All notable changes to Linkli are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Design system: semantic tokens (light, opt-in dark, high contrast), `ui-` primitives and React components for buttons, fields, badges, notices, dialogs, menus, toasts and empty states. Icons come from one family (Phosphor).
- Guests page per invitation (`/studio/[id]/guests`): who is coming, total guests, song requests, a searchable response table with delete, and export to Excel/CSV.
- Every page has its own editor URL (`/studio/[id]`), so the browser back button, bookmarks and "open in new tab" work. Old `/studio?edit=` links redirect.

### Changed

- The Studio home is now a server-rendered "My pages" list: each page shows a thumbnail of the invitation, its state (draft or live), views, responses or confirmed guests, and the next useful action (continue editing, or share on WhatsApp). The duplicate stats strip, "next action" card and five-step journey card are gone.
- The template gallery groups templates into invitations and greetings; the whole thumbnail starts a page, and guided-wizard drafts are applied before the editor opens.
- Authenticated pages share one header with an account menu (settings, plan and billing, admin, help, sign out) instead of a crowded top bar.
- Plans now limit published pages only. Drafts are unlimited on every plan (with an account-wide cap of 100 to stop abuse); previously paid plans could not even start a draft once their quota was full.
- Page deletion and unpublishing use accessible confirmation dialogs instead of `window.confirm`.

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
