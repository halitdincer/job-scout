## Why

The current jobs table uses server-rendered Django templates with basic query-string filters. It lacks column sorting, multi-select filtering, client-side pagination, and mobile responsiveness. With ~1700 listings and growing, users need a fully interactive table to efficiently browse and filter jobs.

## What Changes

- Replace the server-rendered `<table>` on the jobs page with AG Grid Community (loaded via CDN)
- Fetch all data from `/api/jobs/` and render client-side — no server-side filtering needed on the page view
- Add per-column sorting (click column headers)
- Add per-column filtering: text search for title/department/country, multi-select set filters for source, status, employment type, workplace type
- Add client-side pagination (50 rows per page)
- Make the grid mobile-responsive (column auto-sizing, horizontal scroll on small screens)
- Remove server-side filter logic from `jobs_page` view (simplify to just rendering the template)
- Keep the existing `/api/jobs/` endpoint unchanged — it already returns all needed fields
- Apply AG Grid's dark theme to match existing dark palette

## Capabilities

### New Capabilities

- `interactive-jobs-table`: AG Grid-powered client-side table with sorting, filtering, pagination, and mobile responsiveness

### Modified Capabilities

- `frontend-pages`: Jobs page changes from server-rendered table to client-side AG Grid
- `enriched-listing-display`: Filters move from server-side dropdowns to AG Grid column filters

## Impact

- `core/templates/core/jobs.html` — complete rewrite: AG Grid container + JS initialization
- `core/templates/core/base.html` — add AG Grid CDN script/CSS in head
- `core/static/core/style.css` — AG Grid dark theme overrides
- `core/views.py` — simplify `jobs_page` (remove filter logic, just render template)
- `core/tests/test_pages.py` — simplify jobs page tests (no server-side filter assertions)
- No backend/API changes needed
