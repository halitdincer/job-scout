## ADDED Requirements

### Requirement: Saved view round-trip contract
The system SHALL persist named saved views per authenticated user via `POST /api/views/` (create), `GET /api/views/` (list), `PUT /api/views/<id>/` (update), and `DELETE /api/views/<id>/` (delete). Each saved view SHALL persist exactly four user-configured fields:

- `filter_expression`: the canonical filter expression JSON (AND/OR/NOT tree with typed predicates), or `null` when no filter is active.
- `columns`: a list of `{field: string, visible: boolean}` objects giving both column order (list order) and per-column visibility (`visible`, defaulting to `true` when omitted).
- `sort`: a list of `{field: string, dir: "asc"|"desc"}` objects with left-to-right precedence. `field` SHALL belong to the server sort allowlist; `dir` SHALL be one of `"asc"` / `"desc"`.
- `config`: a free-form dict. The client SHALL place the active page size at `config.page_size`, which SHALL be one of `{25, 50, 100, 250}`. Additional keys SHALL be preserved untouched to leave room for future fields.

Names SHALL be unique per user. A duplicate name SHALL return HTTP 409. Invalid `sort`, `columns`, or `config.page_size` payloads SHALL return HTTP 400 with a message identifying the offending field.

#### Scenario: Round-trip preserves filter, columns, sort, and page size
- **WHEN** a user saves a view with a filter expression, a custom column order with two hidden columns, a two-column sort, and `config.page_size = 100`, reloads the page, and loads the view
- **THEN** the Filters panel, column order, column visibility, sort, and page-size selector match the saved-view payload exactly

#### Scenario: Missing visible defaults to true
- **WHEN** a client saves a view with `columns: [{field: "title"}]` (no `visible` key)
- **THEN** the server persists that column with `visible` defaulting to `true`

#### Scenario: Unknown config keys are preserved
- **WHEN** a client saves a view with `config: {page_size: 50, future_key: "..." }`
- **THEN** a subsequent `GET /api/views/<id>/` returns the same `config` with `future_key` preserved verbatim

#### Scenario: Invalid sort field is rejected
- **WHEN** a client saves a view with a `sort` item whose `field` is not in the server allowlist
- **THEN** the server responds with HTTP 400 and the error message lists the valid sort fields

#### Scenario: Invalid sort direction is rejected
- **WHEN** a client saves a view with `sort: [{field: "title", dir: "sideways"}]`
- **THEN** the server responds with HTTP 400

#### Scenario: Invalid page_size is rejected
- **WHEN** a client saves a view with `config.page_size = 37`
- **THEN** the server responds with HTTP 400 and the error message lists `{25, 50, 100, 250}`

#### Scenario: Duplicate name returns 409
- **WHEN** a user attempts to save a view with a name that already exists for that user
- **THEN** the server responds with HTTP 409

### Requirement: Dirty-state tracking against the loaded view
The client SHALL track whether the currently-loaded view is "dirty" (modified since load). Dirty state SHALL be a deterministic comparison of the current `{filter, columns (order + visibility), sort, pagination.size}` against the snapshot captured when the view was loaded. When dirty, the view selector SHALL display a "Modified" badge; when clean, the badge SHALL be hidden. Saving a view (create or overwrite) SHALL reset the snapshot to the newly persisted state, clearing the badge.

#### Scenario: Modified badge appears on drift
- **WHEN** a user loads a view and then reorders a column
- **THEN** the "Modified" badge appears in the view selector

#### Scenario: Reverting drift clears the badge
- **WHEN** a user loads a view, reorders a column, and then drags the column back to its original position
- **THEN** the "Modified" badge is hidden

#### Scenario: Saving clears the badge
- **WHEN** a user has a dirty view and clicks "Save" (overwrite)
- **THEN** the server returns HTTP 200 with the new representation and the "Modified" badge is hidden

#### Scenario: No view loaded means not dirty
- **WHEN** no saved view is active
- **THEN** the "Modified" badge is hidden regardless of the current filter/columns/sort state

### Requirement: Legacy sort payload compatibility
Saved views persisted with a legacy `sort` item shape of `{column, dir}` SHALL be migrated at load-time in the client by treating `column` as `field`. The migration SHALL NOT mark the view as dirty on load — loading an unmodified legacy view SHALL leave the "Modified" badge hidden. Saving any view (create or overwrite) SHALL write the new `{field, dir}` shape going forward.

#### Scenario: Legacy sort is migrated on load
- **WHEN** a user loads a view whose stored `sort` is `[{column: "title", dir: "asc"}]`
- **THEN** the client applies a sort of `[{field: "title", dir: "asc"}]` without error

#### Scenario: Legacy view is not dirty on load
- **WHEN** a user loads an unmodified view with a legacy `sort` shape
- **THEN** the "Modified" badge is hidden

#### Scenario: Overwriting a legacy view upgrades the stored shape
- **WHEN** a user loads a legacy view and then clicks "Save" (overwrite)
- **THEN** the server persists `sort` in the new `{field, dir}` shape
