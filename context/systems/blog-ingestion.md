# Blog Ingestion

## Purpose

The Writing section displays the latest content from Infinite Curios.

This system is independent from the blog counter.

---

## Source

Frontend

↓

/api/infinitecurios-latest

↓

JSON

↓

Rendered cards

---

## Displayed Information

Each article includes:

- title
- summary
- category
- publication date
- destination URL

---

## Blog Counter

The total blog post count is calculated separately inside the automated repository.

Multiple project websites expose:

posts-count.txt

These values are summed by GitHub Actions.

The result becomes:

blog-total.txt