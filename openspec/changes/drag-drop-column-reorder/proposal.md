## Why

The jobs table has 19 columns, and users can toggle their visibility via the Columns panel, but there is no way to change column order. When users show hidden columns, they appear in the fixed definition order, which may not match how the user wants to scan listings. Drag-and-drop column reordering lets users arrange columns to match their workflow — putting the most important fields side by side.

## What Changes

- Enable drag-and-drop column reordering on the jobs table via Tabulator's `movableColumns` option
- Persist the user's custom column order in `localStorage` so it survives page reloads
- Restore persisted column order on page load, falling back to the default order for new visitors
- Add a "Reset Order" control to restore the default column arrangement

## Capabilities

### New Capabilities

- `column-reorder`: Drag-and-drop column reordering with persistence and reset for the jobs table

### Modified Capabilities

- `interactive-jobs-table`: Add column reorder behavior to the table's feature set

## Impact

- **Frontend**: `core/templates/core/jobs.html` — Tabulator config changes, new JS for persistence and restore logic
- **CSS**: `core/static/core/style.css` — possible minor styling for drag cursor / reset button
- **No backend changes** — this is entirely client-side
- **No new dependencies** — Tabulator natively supports `movableColumns`
