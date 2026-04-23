## Context

The jobs page started as a small Tabulator grid and accumulated filter pills, per-column rules, header popovers, saved views, and dirty tracking over a dozen iterations. The bootstrap lived in a 1500-line inline `<script>` and relied on two separate recursion guards (`isSyncingHeader`, `isApplyingView`) to keep mutations from echoing through Tabulator callbacks. Sort and pagination were Tabulator's responsibility, which meant "sort all results" silently only sorted the current page. The saved-view feature persists columns, sort, and a free-form `config` dict — but there was no canonical contract for what each field must contain, and the existing `frontend-pages` spec locked in a client-only posture that contradicts the shipped behavior.

## Goals / Non-Goals

**Goals:**
- Move sort and pagination to the server so they cover the entire result set, not just the current page.
- Make the jobs page deterministic: one store, one reducer, one fetch effect, renderers that idempotently rebuild DOM from state.
- Ratify the saved-views contract (what is persisted, how dirty is computed, how legacy payloads migrate).
- Keep the OpenSpec specs aligned with what actually ships.

**Non-Goals:**
- Replacing Tabulator. It stays as a presentation-only grid for cell rendering, column reordering, and horizontal scroll.
- A server-side filter expression builder UI. Filter expression shape is unchanged; only sort and pagination move to the server.
- A design-time build step. ES modules are served directly via `<script type="module">`.
- Saved-view sharing, versioning, or templates. The capability covers per-user round-trip only.

## Decisions

1. **Response envelope over flat array.**
   - Decision: `GET /api/jobs/` returns `{results, count, page, page_size, total_pages, sort}`.
   - Rationale: Pagination requires total count; sort echoes server-applied order back to the client so renderers do not speculate.
   - Alternative considered: HTTP `Link` headers for pagination. Rejected because the client also needs the applied sort in the response body for dirty tracking.

2. **Allowlists over free-form fields.**
   - Decision: `sort` field must come from a fixed allowlist; `page_size` must come from `{25, 50, 100, 250}`.
   - Rationale: Prevents arbitrary ORDER BY injection across relations and keeps pagination windows predictable.
   - Alternative considered: Accept any listing column name. Rejected because derived fields (`source_name`, `country`, `region`, `city`, `seen`) require annotation and not every column is indexable.

3. **Unidirectional store as the only source of truth.**
   - Decision: All UI events dispatch actions through a pure reducer; Tabulator callbacks dispatch only, renderers re-paint from state.
   - Rationale: Kills echo loops, recursion flags, and ad-hoc dirty-check calls by construction.
   - Alternative considered: Keep mutable module state and wrap callbacks in flags. Rejected because that is exactly the pattern we are leaving behind.

4. **Reuse `SavedView.sort` and `SavedView.config` as-is.**
   - Decision: Tighten validation but do not migrate the schema; legacy `{column, dir}` items migrate client-side on load.
   - Rationale: Zero-downtime with no risk of partial migration state.
   - Alternative considered: Data migration that rewrites existing rows. Rejected because it is irreversible and the client migration is trivial.

5. **`renderToken` replaces per-subsystem recursion flags.**
   - Decision: The store keeps a `ui.renderToken` that increments when renderers mutate Tabulator; Tabulator callbacks compare against the last-seen token and no-op on stale ticks.
   - Rationale: One guard replaces `isSyncingHeader`, `isApplyingView`, and `lastHeaderSyncSignature`.

## Risks / Trade-offs

- **Composite-array sort cost.** `country`/`region`/`city` sort via `Min()` on the `locations` M2M. Mitigation: LocationTag columns are already indexed; fall back to stable `first_seen_at desc` secondary so result order is deterministic even when the primary key is NULL.
- **Legacy SavedView payloads.** Clients may have rows with `[{column, dir}]` sort items. Mitigation: client-side `normalizeLegacySort` on `LOAD_VIEW`; legacy rows do not mark the view as dirty on load.
- **Tabulator in "dumb grid" mode** is inverted from its docs. Mitigation: narrow usage to `setColumns` / `setData` / `setSort` / `movableColumns` — all well-supported primitives; `renderToken` guards callback echoes.
- **Fetch races.** Rapid state changes (typing in a filter, paging, sorting) could overlap. Mitigation: `AbortController` aborts in-flight requests on new dispatches; `requestId` drops stale responses that resolve after a newer request.
- **100% Python coverage gate.** Mitigation: every new code branch has a red test first.

## Migration Plan

1. Backend envelope and allowlists land first; frontend bridges to `data.results` without changing UX.
2. JS harness + pure modules land with vitest coverage; template still works.
3. Template is replaced with the module entry; Tabulator switches to presentation-only.
4. Saved-view validators tighten; legacy sort migration in the client.
5. OpenSpec update (this change) ratifies the new contract.
6. Rollback: revert template to the archived inline script; envelope is backwards-compatible because `results` is always present.

## Open Questions

- Should the server emit the sort-field allowlist as part of the API response so the client can render column-sort affordances without duplicating the constant?
- Do we want saved-view export/import (JSON) as a follow-up, or is round-trip persistence enough for now?
