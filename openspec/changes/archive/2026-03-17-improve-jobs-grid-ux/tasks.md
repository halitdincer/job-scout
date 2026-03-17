## 1. Full-width layout

- [x] 1.1 Update `style.css`: remove `max-width: 1200px` from `main` and `nav`, set grid height to `calc(100vh - 56px)`, remove main padding for jobs page
- [x] 1.2 Update `base.html`: add full-width class or adjust nav/main structure for edge-to-edge layout

## 2. Jobs page template overhaul

- [x] 2.1 Update `jobs.html`: remove `<h1>` page title
- [x] 2.2 Add all missing column definitions (Team, Last Seen, Published At, Updated At Source, Expired At, External ID, Source ID, ID) with appropriate filters and default `hide: true` for non-default columns
- [x] 2.3 Add `sideBar: "columns"` to grid options for column chooser
- [x] 2.4 Implement `timeAgo(iso)` function for relative time display on First Seen and Last Seen columns using `cellRenderer` with `title` attribute for hover tooltip
- [x] 2.5 Update date-time columns (Published At, Updated At Source, Expired At) to show time of day via `toLocaleString` with hour/minute
- [x] 2.6 Fix set filters: add `filterValueGetter` returning display labels for Type and Workplace columns so filter dropdowns show "Full-time" not "full_time"
- [x] 2.7 Update data transform to populate all new fields (team, last_seen_at, published_at, updated_at_source, expired_at, external_id, source_id, id)

## 3. Tests

- [x] 3.1 Update `test_pages.py`: remove h1 assertion, verify grid container and AG Grid script still present
- [x] 3.2 Run full test suite — confirm 100% coverage maintained
