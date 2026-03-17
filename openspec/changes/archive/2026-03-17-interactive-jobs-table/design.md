## Context

The jobs page currently uses a Django-template-rendered `<table>` with server-side query-string filters. The `/api/jobs/` endpoint already returns all listing data as JSON with enriched fields. AG Grid Community (free, MIT-licensed) will be loaded via CDN — no build step, no JS framework.

## Goals / Non-Goals

**Goals:**
- Full client-side table: sort, filter, paginate all columns
- Multi-select set filters for categorical columns (source, status, employment type, workplace type)
- Text filters for free-text columns (title, department, locations, country)
- Mobile responsive — usable on phone screens
- Match existing dark theme

**Non-Goals:**
- Server-side pagination or filtering (data fits in memory)
- Adding a JS build tool or framework
- Changing the API response shape

## Decisions

### 1. AG Grid Community via CDN

Load AG Grid from `unpkg` CDN directly in `base.html`. No npm, no bundler, no build step. AG Grid Community includes all needed features: sorting, text/set column filters, pagination, responsive sizing.

**Version:** Pin to latest stable (v33.x). Use ES module CDN URL.

### 2. Column configuration

| Column | Field | Filter Type | Notes |
|--------|-------|-------------|-------|
| Title | `title` | Text | Links to external URL |
| Company | `source_name` | Set (multi-select) | |
| Department | `department` | Text | |
| Locations | `locations` | Text | Join array to comma-separated string |
| Type | `employment_type` | Set (multi-select) | Display labels (Full-time, etc.) |
| Workplace | `workplace_type` | Set (multi-select) | Display labels (Remote, etc.) |
| Country | `country` | Set (multi-select) | |
| Status | `status` | Set (multi-select) | |
| First Seen | `first_seen_at` | Date | Format as "Mar 17, 2026" |

### 3. Data transformation

Fetch from `/api/jobs/`, then transform before passing to AG Grid:
- `locations`: join array → comma-separated string for display/filtering
- `employment_type` / `workplace_type`: map internal values to display labels
- `first_seen_at`: parse ISO → display format
- `title`: rendered as link via AG Grid `cellRenderer`

### 4. Simplify `jobs_page` view

Remove all server-side filter logic. The view just renders the template — all filtering/sorting/pagination happens client-side in the browser.

### 5. AG Grid dark theme

AG Grid ships with `ag-theme-alpine-dark`. Apply it to the grid container and add CSS overrides to match existing site palette.

### 6. Mobile responsiveness

- Grid container set to `width: 100%; height: 80vh`
- Use AG Grid's `autoSizeStrategy: { type: 'fitGridWidth' }` on desktop
- On small screens, columns overflow with horizontal scroll (AG Grid handles this natively)
- Navigation already responsive (stacks via flexbox)

## Risks / Trade-offs

- [CDN dependency] → If CDN is down, grid won't load. Acceptable for a personal tool; could vendor the file later.
- [~200KB JS payload] → One-time load, cached by browser. Negligible for this use case.
- [No server-side filter tests] → Filters are now AG Grid's responsibility. Page test just verifies template renders and grid container exists.
