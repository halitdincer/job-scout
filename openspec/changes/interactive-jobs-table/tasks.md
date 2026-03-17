## 1. AG Grid Setup

- [x] 1.1 Add AG Grid Community CDN (JS + CSS) to `base.html` head
- [x] 1.2 Add AG Grid dark theme class and CSS overrides to `style.css`

## 2. Jobs Page Rewrite

- [x] 2.1 Rewrite `jobs.html` template: replace server-rendered table with AG Grid container and JS initialization
- [x] 2.2 Configure column definitions: Title (text filter, link renderer), Company (set filter), Department (text filter), Locations (text filter), Type (set filter, label mapping), Workplace (set filter, label mapping), Country (set filter), Status (set filter), First Seen (date format)
- [x] 2.3 Add data transformation: join locations array, map employment_type/workplace_type to labels, format dates
- [x] 2.4 Enable pagination (50 rows per page), default sort by First Seen descending

## 3. Simplify Backend

- [x] 3.1 Remove server-side filter logic from `jobs_page` view — just render template
- [x] 3.2 Update `test_pages.py` — remove server-side filter tests, add test for grid container rendering

## 4. Verification

- [x] 4.1 Run full test suite — all tests pass with 100% coverage
