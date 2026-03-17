## Why

The AG Grid table works but has several UX gaps: not all API fields are shown as columns, users can't choose which columns to display, the table is constrained to 1200px max-width leaving wasted space, date columns lack time-of-day and relative timestamps, and set filter values don't populate correctly making multi-select filters non-functional.

## What Changes

- Add all missing columns from the API response: Team, Last Seen, Published At, Updated At Source, External ID, Expired At
- Add AG Grid column chooser (side panel or column menu) so users can show/hide any column
- Remove `max-width: 1200px` constraint — navbar and grid span full viewport width
- Remove the "Job Listings" `<h1>` page title to maximize vertical space
- Set grid height to fill remaining viewport below navbar
- Date/time columns show time of day (e.g., "Mar 15, 2026 3:45 PM")
- First Seen and Last Seen columns show relative time (e.g., "1d ago", "3h ago") with full timestamp on hover
- Fix set filter values not appearing — ensure `valueGetter` or `filterValueGetter` provides raw values for set filters

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `interactive-jobs-table`: Add column chooser, full-width layout, all columns, relative time display, fix set filters
- `enriched-listing-display`: Show all API fields as available columns, relative timestamps

## Impact

- `core/templates/core/jobs.html` — column definitions, grid options, data transform, relative time formatter
- `core/templates/core/base.html` — remove `max-width` on `<main>`, possibly `<header>` too
- `core/static/core/style.css` — full-width layout, full-height grid
- `core/tests/test_pages.py` — update assertions (no h1, still has grid)
