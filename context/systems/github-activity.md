# GitHub Activity

## Purpose

The GitHub activity feed helps communicate that the website is alive and actively maintained.

Activity should reflect genuine work.

---

## Source

The frontend reads:

public/contributions.json

and renders:

- commits
- pull requests
- issues
- repository activity

---

## Fetching and rendering

The `update-contribs.yml` GitHub Actions workflow runs every 12 hours (and can be
started manually). It requests up to 100 public events for the `uxillary` GitHub
account, converts supported events to the site schema, removes duplicate URLs,
and writes the nine newest unique events to `public/contributions.json`.

The frontend then:

- removes any remaining duplicates
- formats timestamps
- renders the newest item separately as **Latest Event**
- renders up to eight more items in the **Recent Events** grid

Nine source items are required to fill the eight-cell recent grid because the
newest source item is reserved for the separate latest-event card. If fewer than
nine unique public events are available, the grid intentionally renders fewer
cards rather than inventing activity.

---

## Principles

Activity should always represent genuine GitHub events.

Do not fabricate commits or development history.

source JSON
workflow
render flow
expected schema
cache behaviour
future plans