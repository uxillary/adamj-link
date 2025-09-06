# adamj.link — ultra-light landing

## Quick start
- Static site, no build step. Tailwind via CDN.
- Edit `index.html`, commit, push → Cloudflare Pages deploy.

## Domain
- Connect repo to Cloudflare Pages (Framework preset: None, no build, output dir `/`).
- Add `adamj.link` as custom domain in Pages.

## Assets
- Put images in `/public`:
  - `hexlabs-shot.jpg`, `infinitecurios-shot.jpg` (1600×900)
  - `seo-book.png` (transparent ~600px height)
  - `og.jpg` (1200×630 or 1600×840)

## Tuning
- Theme toggle persists in `localStorage`.
- Global corner radius:
  - `<html data-radius="soft|sharp|square">`
  - or run `setRadius('sharp')` in devtools (persists).

## Checklist (DoD)
- Lighthouse: 100 desktop / >95 mobile
- No console errors
- Keyboard navigation & skip link OK
- OG preview renders (Discord/Twitter/Slack)
- `_headers` active (response headers visible)

## Nice-to-haves (optional)
- Add Cloudflare Web Analytics (one script tag)
- Add `/press` with logo SVG + brand colors
