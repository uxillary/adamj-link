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

## Rendering

The frontend:

- removes duplicates
- formats timestamps
- limits displayed items
- renders recent activity cards

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