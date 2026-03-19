## Context

The jobs page renders a Tabulator 6.3.1 table with 19 column definitions. Users can toggle column visibility through the Columns side panel, but column order is fixed to the definition order in `COLUMN_DEFS`. Tabulator natively supports drag-and-drop column reordering via the `movableColumns: true` configuration option, which makes this a low-effort, high-value improvement.

The Columns side panel currently lists columns using `table.getColumns()` and provides checkbox toggles. The column filter popover, header filters, and the Filters panel all reference columns by field name, so reordering columns does not affect filter behavior.

## Goals / Non-Goals

**Goals:**
- Enable drag-and-drop column reordering in the Tabulator table
- Persist custom column order in `localStorage` so it survives page reloads
- Restore persisted order on page load
- Provide a reset mechanism to restore default column order

**Non-Goals:**
- Column pinning (freezing columns to left/right)
- Reordering columns via the Columns side panel (drag handles in the panel)
- Syncing column order across devices or users
- Server-side persistence of column order

## Decisions

### 1. Use Tabulator's built-in `movableColumns` option

**Decision:** Enable `movableColumns: true` on the Tabulator constructor.

**Rationale:** Tabulator provides native drag-and-drop column reordering with visual feedback (drag ghost, drop indicator). No custom drag logic or third-party libraries are needed.

**Alternatives considered:**
- Custom drag-and-drop implementation: unnecessary complexity when Tabulator provides this out of the box.

### 2. Persist column order as a field-name array in `localStorage`

**Decision:** Listen to Tabulator's `columnMoved` event, capture the current column order as an array of field names, and store it under a `localStorage` key (`jobscout_column_order`).

**Rationale:** Field names are stable identifiers. Storing just the ordered list of fields is compact and resilient to other column definition changes (like title renames or formatter updates). On page load, the persisted order is applied by redefining `COLUMN_DEFS` in the stored sequence before passing them to Tabulator.

**Alternatives considered:**
- Store full column definitions: fragile — any code change to a column def would conflict with the stored version.
- Use cookies: `localStorage` is simpler, has more capacity, and doesn't get sent with requests.

### 3. Apply persisted order by resorting `COLUMN_DEFS` before table init

**Decision:** On page load, read the persisted field-name array from `localStorage`. Re-sort `COLUMN_DEFS` to match that order, appending any new columns (not in the persisted list) at the end. Pass the re-sorted array to the Tabulator constructor.

**Rationale:** Applying order before init avoids a visible column-shift after the table renders. New columns added in future code changes will naturally appear at the end rather than being lost.

### 4. Add a "Reset Columns" button to the toolbar

**Decision:** Add a button in the toolbar (next to the existing "Columns" button) that clears the persisted order from `localStorage` and reloads the table with the default `COLUMN_DEFS` order.

**Rationale:** Users need a way to undo a bad arrangement without manually dragging every column back. A toolbar button is discoverable and consistent with the existing "Columns" and "Filters" buttons.

**Alternatives considered:**
- Put reset inside the Columns side panel: less discoverable, and the panel is about visibility not order.
- Context menu on column header: not consistent with existing UI patterns.

## Risks / Trade-offs

- **[Stale persisted order]** If column definitions change (fields added/removed/renamed), the persisted order could reference stale fields. → Mitigation: Filter out unknown fields on load and append new fields at the end.
- **[Mobile usability]** Drag-and-drop column reordering may be difficult on touch devices. → Mitigation: Tabulator's `movableColumns` supports touch events natively. Accept that touch reordering is inherently less precise — this is a power-user feature.
- **[Column visibility interaction]** Hiding and re-showing a column should preserve its position in the custom order. → Mitigation: Tabulator handles this internally — toggling visibility doesn't change column position.
