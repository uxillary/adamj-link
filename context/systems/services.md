# Services

## Purpose

This document describes external services used by adamj.link.

---

## Current Services

Cloudflare

- Pages
- Pages Functions
- KV

GitHub

- Actions
- Pages
- Repository APIs

YouTube

- Data API

---

## Principles

Services should:

- be lightweight
- minimise dependencies
- support automation
- fail gracefully

Whenever possible, static generation should be preferred over runtime API requests.