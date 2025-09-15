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

## GitHub contributions cache

Recent GitHub activity is pre-fetched and stored in `public/contributions.json` to
avoid runtime API calls. A scheduled GitHub Actions workflow refreshes this file
twice daily. To update manually, run:

```
node scripts/update-contribs.js
```

The script fetches the latest events for the configured user and keeps only the
most recent items. Requests authenticate with a GitHub token from the
`GITHUB_TOKEN` or `TOKEN_KEY` environment variables (the scheduled workflow uses
the `TOKEN_KEY` repository secret).

## Contact form

The contact form posts to `/api/contact` and uses [Resend](https://resend.com/) to send
emails. Configure these environment variables in the Cloudflare Pages project:

- `RESEND_API_KEY` – API key for Resend
- `CONTACT_FROM` – verified sender address
- `CONTACT_TO` – destination email address

## Tiny analytics

Page views are counted globally using Cloudflare KV. Bind a namespace named
`VIEWS_KV` to the Pages project:

1. Cloudflare Dashboard → **Pages** → your project
2. Settings → Functions → KV namespaces → **Bind** `VIEWS_KV`

For local development, `wrangler.toml` can include:

```toml
[[kv_namespaces]]
binding = "VIEWS_KV"
id = "dummy"
preview_id = "dummy"
```

Optional environment variables:

- `UNIQUE_VIEWS=1` – count one view per IP per 24h
- `IP_SALT=<random string>` – salt used to hash IP addresses

API examples:

```sh
curl -X POST 'https://adamj.link/api/views?path=/'
curl 'https://adamj.link/api/views?path=/'
```

The API stores counters under `count:<path>` and, when unique mode is on,
stamps `seen:<path>:<day>:<ipHash>` with a 24 h TTL. Plain IPs are never
stored; only a salted hash is kept temporarily. KV increments aren't
strictly atomic—use Durable Objects if precision is critical.
