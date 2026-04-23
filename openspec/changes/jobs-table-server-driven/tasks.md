## 1. Backend: server-side sort and pagination envelope

- [x] 1.1 Extend `GET /api/jobs/` to accept `sort`, `page`, and `page_size` query parameters with allowlists.
- [x] 1.2 Wrap the response in `{results, count, page, page_size, total_pages, sort}`.
- [x] 1.3 Support composite-array sort (`country`, `region`, `city`) via `Min()` annotations and a `seen` sort via `Exists()`.
- [x] 1.4 Reject invalid sort field, invalid direction, out-of-range page, and page_size outside the allowlist with 400 responses.
- [x] 1.5 Add `core/tests/test_list_jobs_sort_pagination.py` covering sort, pagination, envelope shape, and error paths; migrate existing tests that consumed the flat-array response.

## 2. Backend: saved-views round-trip

- [x] 2.1 Tighten `POST`/`PUT /api/views/` validation to require `{field, dir}` sort items with field from the server sort allowlist.
- [x] 2.2 Validate `columns` as `[{field, visible}]` with string field and optional boolean visible.
- [x] 2.3 Validate `config` as a dict with optional `page_size` from the page-size allowlist; preserve unknown keys unchanged.
- [x] 2.4 Add `core/tests/test_saved_view_sort_pagination.py` covering the new validation rules and round-trip persistence.

## 3. Frontend: client store and module split

- [x] 3.1 Add `package.json`, `vitest.config.js`, and `core/static/js/__tests__/` harness.
- [x] 3.2 Implement `store.js`, `reducer.js`, `actions.js`, `selectors.js`, `constants.js`, `filterExpression.js` as pure ES modules with vitest coverage.
- [x] 3.3 Implement `effects/fetch.js` with `AbortController` + `requestId` race protection.
- [x] 3.4 Implement renderers for filters panel, filter pills, header filters, columns panel, view selector, table, and pagination bar.
- [x] 3.5 Replace the inline `<script>` in `core/templates/core/jobs.html` with `<script type="module" src="{% static 'js/jobs.js' %}">`; reduce template to semantic DOM only.
- [x] 3.6 Migrate `core/tests/test_pages.py` to assert the new DOM (pagination bar, module script tag, no inline bootstrap).

## 4. Frontend: server-driven sort and pagination wiring

- [x] 4.1 Disable Tabulator pagination; render a custom pagination bar bound to store state.
- [x] 4.2 Drive sort from store via `selectSortQueryParam` and the new `/api/jobs/` query string; support multi-column sort (click replaces, shift-click extends).
- [x] 4.3 Saved-view payloads serialize through `selectSavedViewPayload({filter_expression, columns, sort, config: {page_size}})`.
- [x] 4.4 Migrate legacy `{column, dir}` sort items on `LOAD_VIEW` via `normalizeLegacySort`.

## 5. OpenSpec updates

- [ ] 5.1 Modify `frontend-pages` to remove the client-only clause and describe the server-driven contract.
- [ ] 5.2 Modify `interactive-jobs-table` to replace client-side pagination with server-side pagination over `{25, 50, 100, 250}` and multi-column server-side sort.
- [ ] 5.3 Modify `column-reorder` to version the persistence key as `jobscout_column_order_v2` and clarify interaction with saved views.
- [ ] 5.4 Add `saved-views` capability with round-trip requirements, dirty rules, and legacy sort back-compat.
- [ ] 5.5 Run `openspec validate jobs-table-server-driven --strict`.

## 6. Verification

- [x] 6.1 `pytest --cov --cov-fail-under=100` green on the full suite.
- [x] 6.2 `npx vitest run --coverage` green on all JS unit tests.
- [x] 6.3 `npx playwright test` green: sort spans all 6 pages; pagination bar drives server paging; saved-view round-trip restores filter/columns/sort/page_size and dirty badge tracks drift.
