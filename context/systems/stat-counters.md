# Stat Counters

## Purpose

The statistics displayed throughout adamj.link are powered by real data.

Counters should represent genuine activity rather than decorative numbers.

---

## Architecture

External APIs
        ↓
GitHub Actions (uxillary/automated)
        ↓
Generated TXT / JSON files
        ↓
GitHub Pages
        ↓
adamj.link
        ↓
Animated counters

---

## Current Counters

Current live counters include:

- GitHub public repositories
- GitHub contributions
- Total blog posts
- Total YouTube videos
- Total subscribers
- Page views

---

## Data Sources

The majority of counters are generated inside:

uxillary/automated

GitHub Actions periodically collect data from external APIs and write simple output files into the repository's `/docs` folder.

The website downloads these small files rather than calling external APIs directly.

This approach:

- protects API keys
- reduces rate limits
- improves performance
- simplifies the frontend

---

## Frontend Loading

Counters are configured inside:

scripts/main.js

Each counter maps:

- DOM element
- remote TXT file

The loading process:

1. Wait until the activity section becomes visible.
2. Check sessionStorage cache.
3. Fetch latest value if required.
4. Animate the number.
5. Cache for future page visits.

---

## Principles

Counters should always represent real information.

Avoid:

- fake statistics
- placeholder values
- decorative dashboards

Real data is always preferred.