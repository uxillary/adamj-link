# adamj.link

Personal web hub for Adam Johnston: a static-first identity site that brings together projects, writing, GitHub activity, contact, and trust/legitimacy pages.

The site has moved beyond the original ultra-light landing page. It is now a living portfolio and activity surface for Adam's wider internet ecosystem, with a handcrafted visual direction, live-ish data, and Cloudflare Pages Functions for the small dynamic pieces.

## Current Stage

- Main public entry point: `index.html`
- Supporting legitimacy pages: `about.html`, `contact.html`, `privacy.html`, `terms.html`, `site-info.html`
- Deployment target: Cloudflare Pages
- Build system: none
- Styling: Tailwind CDN plus `styles/main.css`
- Client scripts: plain JavaScript in `scripts/`
- Serverless APIs: Cloudflare Pages Functions in `functions/api/`

## Homepage Experience

The homepage currently includes:

- A dark, technical portfolio hero for Adam J as a creative digital developer.
- Project sections for upcoming work and shipped/showcase projects.
- Hover-loaded project GIF previews for heavier media.
- Studio metrics including page views, external counters, GitHub contributions, and subscriber-style stats.
- Recent GitHub activity from `public/contributions.json`.
- Writing cards sourced through the `infinite-curios.pages.dev` RSS proxy.
- A contact form with a small branded human-verification challenge.
- Theme, scroll-to-top, and corner-radius controls.
- Structured data, Open Graph metadata, sitemap, robots, favicons, and crawler-support pages.

## Key Systems

### Contact Form

The homepage contact form posts to:

```text
/api/contact
```

It sends email through Resend. Configure these Cloudflare Pages environment variables:

```text
RESEND_API_KEY
CONTACT_FROM
CONTACT_TO
```

The frontend challenge in `scripts/human-challenge.js` gates the submit button before the request is sent.

### Page Views

Global page views are handled by:

```text
/api/views
```

The function uses a Cloudflare KV namespace bound as:

```text
VIEWS_KV
```

Optional variables:

```text
UNIQUE_VIEWS=1
IP_SALT=<random string>
```

When unique view mode is enabled, the function stores only salted temporary IP hashes, not raw IP addresses.

### Writing Feed

The writing section fetches:

```text
/api/infinitecurios-latest
```

That function proxies the RSS feed from:

```text
https://infinite-curios.pages.dev/feed.xml
```

It returns the latest posts as JSON and rewrites legacy `infinitecurios.blog`, `404cache.blog`, and `404cache.net` links to `infinite-curios.pages.dev`.

### GitHub Activity

Recent contribution cards are read from:

```text
public/contributions.json
```

The frontend renderer lives in:

```text
scripts/gh-contribs.js
```

The JSON file is generated outside this site and committed as static data, so the homepage can display recent activity without requiring a server-side GitHub token at request time.

## Repository Map

```text
.
├── index.html                  # Main one-page experience
├── about.html                  # Public identity/trust page
├── contact.html                # Standalone contact/trust page
├── privacy.html                # Privacy policy
├── terms.html                  # Terms
├── site-info.html              # Classifier/legitimacy information
├── functions/api/              # Cloudflare Pages Functions
├── scripts/                    # Browser-side behaviour
├── styles/main.css             # Custom visual system
├── public/                     # Images, icons, favicons, GIF previews, static data
├── docs/                       # Operational notes
└── context/                    # Project direction, brand, architecture, roadmap notes
```

## Local Development

This is a static site, so most visual work can be checked by opening `index.html` directly or serving the repository root with any simple static server.

Cloudflare Pages Functions require a Pages-compatible local runtime if you need to test `/api/contact`, `/api/views`, or `/api/infinitecurios-latest` locally.

## Deployment

Cloudflare Pages settings:

```text
Framework preset: None
Build command: empty
Build output directory: /
```

Required production bindings and environment variables:

```text
VIEWS_KV
RESEND_API_KEY
CONTACT_FROM
CONTACT_TO
```

Optional production variables:

```text
UNIQUE_VIEWS
IP_SALT
```

## Maintenance Notes

- Keep `public/contributions.json` fresh when GitHub activity should change on the homepage.
- Update `sitemap.xml` when adding or removing public pages.
- Keep trust and classifier-support pages aligned with the live site: `about.html`, `contact.html`, `privacy.html`, `terms.html`, and `site-info.html`.
- Large GIF previews in `public/gifs/` are intentionally lazy-loaded after the core page experience.
- Project direction and design intent live in `context/vision.md`, `context/ux-direction.md`, `context/brand.md`, and `context/architecture.md`.

## Legitimacy Resources

If the domain is misclassified by network filters, use:

- `site-info.html`
- `docs/legitimacy-checklist.md`
- `robots.txt`
- `sitemap.xml`

The intended category is portfolio / technology / business. The site is a personal creative developer hub and does not host adult, malware, gambling, or deceptive content.
