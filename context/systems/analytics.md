# Analytics

## Page Views

Page views are handled independently from the other counters.

The website uses:

Cloudflare Pages Functions

combined with

Cloudflare KV

to store page view totals.

---

## Process

Browser
    ↓
POST /api/views
    ↓
Cloudflare Function
    ↓
Cloudflare KV
    ↓
GET current value
    ↓
Display counter

---

## Caching

The browser stores recent values in sessionStorage to reduce requests.

---

## Unique Views

The system supports optional unique view counting.

When enabled:

- visitor IP is hashed
- daily keys are stored
- raw IP addresses are never retained

---

## Principles

Analytics should remain lightweight.

Avoid:

- invasive tracking
- unnecessary cookies
- third-party analytics where possible

The goal is simple operational metrics rather than user profiling.