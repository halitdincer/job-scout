## Why

Sort and pagination were previously handled entirely in the browser by Tabulator. "Sort all results" was incoherent under client pagination because only the currently-loaded page was sorted. The existing `frontend-pages` and `interactive-jobs-table` specs lock in that client-only posture and contradict the shipped behavior now that the jobs page fetches, sorts, and paginates from the server.

At the same time, the saved-views feature shipped without an OpenSpec capability, so there is no canonical contract for what a saved view persists or how it round-trips across reloads and schema changes.

This change ratifies the server-driven jobs table, captures the client-side store as the one source of truth, and documents the saved-views contract.

## What Changes

- Replace client-side sort and pagination with server-side sort and pagination driven by a client store.
- Update the jobs API to return a `{results, count, page, page_size, total_pages, sort}` envelope and accept `sort`, `page`, and `page_size` query params.
- Enforce a page-size allowlist of `{25, 50, 100, 250}` and a sort-field allowlist across listing and derived fields (`source_name`, `country`, `region`, `city`, `seen`).
- Replace the 1500-line inline bootstrap in `jobs.html` with an ES-module entry point backed by a unidirectional store, pure reducer, selectors, a fetch effect with abort/request-id race protection, and per-subsystem renderers.
- Reduce Tabulator to a presentation-only grid: `pagination: false`, headers driven by store state, all mutations dispatched as actions.
- Reset the column-order localStorage key to `jobscout_column_order_v2` to reflect the new column definitions.
- Add a `saved-views` capability specifying the round-trip contract for `filter_expression`, `columns` (order + visibility), `sort`, and `config.page_size`, plus back-compat for the legacy `{column, dir}` sort shape.

## Capabilities

### New Capabilities

- `saved-views`: Persist and round-trip a user's per-page view configuration (filter, columns, sort, page size); expose dirty tracking against a loaded view; migrate legacy payloads on read.

### Modified Capabilities

- `frontend-pages`: Remove the "all filtering, sorting, and pagination is handled by AG Grid in the browser" clause; replace with the server-driven contract.
- `interactive-jobs-table`: Replace client-side pagination with server-side pagination over `{25, 50, 100, 250}`; replace single-column sort with multi-column server-side sort.
- `column-reorder`: Version the localStorage key to `jobscout_column_order_v2` to reflect the new column definitions; clarify that saved views own column order when a view is active.

## Impact

- Affected code: `core/views.py` (jobs list + saved-views validators), `core/static/js/*` (store, reducer, selectors, renderers, effects), `core/templates/core/jobs.html` (reduced to semantic DOM), `core/tests/test_list_jobs_sort_pagination.py`, `core/tests/test_saved_view_sort_pagination.py`.
- APIs: `GET /api/jobs/` now returns an envelope and accepts `sort`, `page`, `page_size`; `POST`/`PUT /api/views/` tighten `sort` shape validation and persist `config.page_size`.
- Data: no model migration; `SavedView.sort` and `SavedView.config` already exist as JSONFields.
- UX: multi-column sort via click (replace) and shift-click (extend); server-wide sort across all pages; custom pagination bar below the grid.
