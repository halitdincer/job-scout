## Context

The jobs page uses AG Grid Community v35.1.0 via CDN with 9 columns. The grid is constrained within a 1200px max-width container. Several API fields (team, last_seen_at, published_at, updated_at_source, expired_at, external_id) are returned by `/api/jobs/` but not shown. Set filters (Company, Type, Workplace, Country, Status) don't populate values because the grid uses display labels in `valueGetter` but AG Grid set filters need raw values via `filterValueGetter`. Date columns only show date without time.

## Goals / Non-Goals

**Goals:**
- All API fields available as grid columns with sensible defaults for visibility
- Column chooser for users to show/hide columns
- Full-width, full-height layout (navbar + grid fill viewport)
- Relative time display with tooltip for absolute time
- Working set filters that show correct values

**Non-Goals:**
- Persisting column visibility preferences (localStorage) — future enhancement
- Server-side filtering or pagination
- Custom column ordering or pinning

## Decisions

### Full-width layout
Remove `max-width: 1200px` from `main` and `nav` containers. The grid benefits from horizontal space. The navbar stretches edge-to-edge (keep horizontal padding for brand/links). The grid fills `100vw` minus padding.

**Alternative**: Keep max-width on navbar only → rejected because it creates visual inconsistency.

### Grid height: calc(100vh - navbar height)
Set `#jobs-grid` height to `calc(100vh - 56px)` where 56px is the navbar height. Remove the `<h1>` and `<main>` padding to maximize vertical space. On mobile, same approach with reduced padding.

### Column chooser via AG Grid side bar
AG Grid Community supports `sideBar: "columns"` which adds a panel toggle for column visibility. This is the standard AG Grid UX for column management.

**Alternative**: Custom dropdown checkbox menu → rejected, reinventing the wheel when AG Grid has built-in support.

### Default visible vs hidden columns
Visible by default: Title, Company, Department, Locations, Type, Workplace, Country, Status, First Seen, Last Seen
Hidden by default (accessible via column chooser): Team, Published At, Updated At Source, Expired At, External ID, Source ID, ID

### Relative time formatting
Write a `timeAgo(iso)` JS function that returns strings like "2h ago", "1d ago", "3mo ago". Use `cellRenderer` for First Seen and Last Seen to show relative time as text with a `title` attribute for the full ISO timestamp on hover.

Thresholds: <1h → "Xm ago", <24h → "Xh ago", <30d → "Xd ago", <365d → "Xmo ago", else "Xy ago"

### Fix set filters
For columns using display labels (Type, Workplace), set `filterValueGetter` to return the display label so the set filter shows "Full-time" not "full_time". This ensures the filter dropdown populates with the same values the user sees in the cells.

### Date-time format
For date columns that show absolute time, format as "Mar 15, 2026 3:45 PM" using `toLocaleString` with `hour` and `minute` options.

## Risks / Trade-offs

- [All data client-side] With thousands of listings, the initial fetch could be slow → acceptable per user decision; data volume is manageable
- [Column chooser adds sidebar UI] Takes horizontal space when open → it's toggleable, doesn't persist
- [Relative time not auto-updating] The "2h ago" text won't update in real-time → acceptable, page refresh is fine
