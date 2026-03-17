## Why

The jobs table looks rough: links and cell content are hard to read against the dark theme, the table extends edge-to-edge with no breathing room, the page itself scrolls instead of only the table, and the default visible columns include Location (Raw) and Type instead of the more useful geo columns. The table needs a visual overhaul for readability, layout discipline, and better default column selection.

## What Changes

- Rework Tabulator CSS overrides for better contrast, link visibility, header styling, row hover, cell padding, and filter/pagination styling against the dark theme.
- Add margins/padding around the table container so the table sits within the viewport with breathing room, and ensure only the table body scrolls (not the page).
- Update default visible columns to: Title, Company, Country, City, Published At, First Seen. Move Location (Raw), Type, and other columns to hidden-by-default.
- Ensure the layout is mobile responsive with horizontal scroll for the table on narrow viewports.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `interactive-jobs-table`: Default visible columns change; table layout gains margins and contained scrolling; visual styling is overhauled for readability.

## Impact

- `core/static/core/style.css` (Tabulator overrides, layout, spacing)
- `core/templates/core/jobs.html` (default column visibility changes, possible layout wrapper)
- No backend/API changes required.
