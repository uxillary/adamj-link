# context.md — adamj.link

## Goal

Ship an ultra‑light, polished landing for **Adam J** that routes traffic to **ajstudios.dev**.  
Fast, clean, forward‑thinking. No CMS. One page + a couple of static meta files.

## Outcomes

- <50KB total (excluding images), 100/100 Lighthouse perf on desktop, >95 mobile.
- Clear CTAs (Portfolio, Blog, GitHub, Email), concise bio, “Currently building” strip, 2 project cards, book CTA.
- Accessible, keyboard‑friendly, dark by default with a light toggle.
- Deployed on **Cloudflare Pages** from GitHub (`adamj-link`).

## Tech & Constraints

- **No build step** initially (single `index.html`). Tailwind via CDN (`cdn.tailwindcss.com`).
- Vanilla JS for theme toggle and tiny interactions.
- SVG icons (inline or sprite), no external icon font.
- All images optimized, 16:9, max 1600px wide, `loading="lazy"`.

## Brand

- Primary: `#55e6a5` (brand)  
- Accent: `#ff6347` (accent)  
- Base: Dark UI on black; light UI on white.  
- Type: System UI stack (Inter optional later).

## Information Architecture (one page)

1. **Header** — AJ wordmark, nav (Portfolio / Blog / GitHub), theme toggle.  
2. **Hero** — “Creative Digital Developer…” short subcopy + primary CTA.  
3. **Currently building** — 3–4 bullets.  
4. **Work preview** — 2 cards linking to projects.  
5. **Book CTA** — simple block with buttons.  
6. **Contact + Social** — email + icons row (X, LinkedIn, GitHub, Instagram, Email).  
7. **Footer** — © year, location, privacy link.

## Assets to prepare

Place in `/public`:

- `/public/og.jpg` — 1200×630 (or 1600×840), dark background with AJ mark.
- `/public/hexlabs-shot.jpg` — 1600×900.
- `/public/infinitecurios-shot.jpg` — 1600×900.
- `/public/seo-book.png` — transparent, ~600px height.
- `/public/favicon.svg` — AJ monogram.
- `/public/icons.svg` — SVG sprite containing: `x`, `linkedin`, `instagram`, `github`, `mail`.

## Files we’ll have

```text
/
├─ index.html                # single-file site
├─ robots.txt
├─ sitemap.txt               # simple, static list of URLs
├─ 404.html                  # basic, on-brand
└─ public/
   ├─ og.jpg
   ├─ hexlabs-shot.jpg
   ├─ infinitecurios-shot.jpg
   ├─ seo-book.png
   ├─ favicon.svg
   └─ icons.svg              # <symbol id="x">…</symbol> etc.
```

## SEO & Social

- **Title:** `Adam J — Creative Digital Developer`  
- **Meta description:** `Playful, useful, forward-thinking projects. Portfolio, blog, GitHub.`  
- OG/Twitter tags referencing `/public/og.jpg`.  
- JSON-LD `Person` with `sameAs` (GitHub, YouTube, ajstudios.dev).

## Accessibility

- Color contrast WCAG AA on both themes.  
- Focus outlines visible (outline or custom focus ring).  
- All interactive elements 44×44 hit area min where possible.  
- Icons have `aria-label` via the anchor element (e.g., `<a aria-label="GitHub">`).

## Social Icons (sprite approach)

- `/public/icons.svg` contains a `<symbol>` for each logo.
- Usage example:

```html
<svg width="22" height="22" aria-hidden="true">
  <use href="/public/icons.svg#github"></use>
</svg>
```

- Each icon sits in a rounded button with `hover:border-brand/70` and `transition` classes.

## Cloudflare Pages

- Framework preset: **None**  
- Build command: **(empty)**  
- Output directory: `/`  
- Custom domain: point **adamj.link** to the Pages project.  
- Add **Cloudflare Web Analytics** later (one script tag).

## Performance Targets

- Images `loading="lazy"` and `decoding="async"`.  
- Tailwind via CDN is fine for this small page.  
- Minimize JS (theme toggle only).

## Security/Privacy

- No third‑party trackers initially.  
- Mail link only (no form) to avoid spam/Workers complexity.

## Acceptance Criteria (definition of done)

- Loads in <1s on 4G (repeat view <0.5s).  
- No console errors; keyboard navigation works; `prefers-color-scheme` respected.  
- OG card renders correctly on Discord/Twitter/Slack link previews.  
- If using `target="_blank"`, add `rel="noopener"`.  
- 404 page is branded and links home.

## Work plan (three Codex prompts)

**Prompt 1 — Scaffold & Shell**  
Create repo tree, `index.html` with head/meta/JSON‑LD, Tailwind config, dark/light toggle, header, footer, empty sections with TODO markers, minimal style utilities, and placeholder social icon bar using sprite.

**Prompt 2 — Content & Components**  
Fill sections with real copy, responsive layout, add work cards, book CTA, “Currently building” list, social buttons (accessible), swap placeholder images with `/public/*`, polish spacing and micro‑motion (scale/opacity on hover).

**Prompt 3 — Polish & Deployables**  
Add `robots.txt`, `sitemap.txt`, `404.html`, OG image wiring, tiny JS for year + theme persistence, Lighthouse passes, README snippet with deploy steps, and Cloudflare Pages instructions.

## Links

- Primary site: <https://ajstudios.dev>  
- Blog: <https://ajstudios.dev/blog>  
- GitHub: <https://github.com/admjski>  
- YouTube: <https://youtube.com/@admjski>  
- Email: <hello@ajstudios.dev>
