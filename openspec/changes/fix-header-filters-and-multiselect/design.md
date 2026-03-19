## Context

The jobs table uses Tabulator 6.3.1 with built-in `headerFilter: "list"` dropdowns for categorical and array columns. These dropdowns are single-select only. A bidirectional sync layer converts header filter selections into rules in a unified `rules[]` array, which serializes to a filter expression sent to the server via `?filter=<JSON>`.

Two bugs exist:
1. **Filter removal is broken**: The `dataFiltered` event handler only processes filters with non-empty values. When a user clears a header filter dropdown, no code removes the corresponding rule from `rules[]`, so the old filter persists in the active expression.
2. **No multi-select**: Tabulator's built-in `"list"` header filter only supports single selection. Users cannot filter by multiple values (e.g., "US" and "DE" in Country) without manually typing comma-separated values in the Filters panel using the `in` operator.

All filtering operators needed (`in`, `is_empty`, `is_not_empty`) already exist in the backend filter expression engine. No server-side changes are required.

## Goals / Non-Goals

**Goals:**
- Fix header filter removal so clearing a dropdown removes the rule and re-fetches filtered data from the server
- Replace single-select header filter dropdowns with custom multi-select checkbox dropdowns for categorical/array columns (Company, Country, Region, City, Type, Workplace, Status)
- Include "Select All" toggle and "(Empty)" option in each multi-select dropdown
- Maintain bidirectional sync between multi-select header filters and the rule list (using `in` operator for multi-value, `eq` for single-value, `is_empty` for the "(Empty)" option)
- Keep date column header filters as single-select preset dropdowns (unchanged)

**Non-Goals:**
- Rewriting the filter expression engine or adding new backend operators
- Adding multi-select to the Filters panel rule builder (it already supports `in`/`not_in` with comma-separated values)
- Migrating away from inline JavaScript or introducing a JS framework
- Changing the server-side filter API contract

## Decisions

### 1. Custom multi-select dropdown component (not a Tabulator plugin)

Tabulator's built-in `headerFilter: "list"` does not support multi-select. Rather than writing a Tabulator editor module (which requires conforming to Tabulator's editor API and lifecycle), we'll build a standalone dropdown component that renders inside the header filter cell.

**Approach**: Use Tabulator's `headerFilter` as a custom editor function. The function returns a container element with a summary label (e.g., "2 selected") and, on click, shows an absolutely-positioned dropdown with checkboxes. The component calls `success()` with an array of selected values when the selection changes.

**Alternative considered**: Using a third-party multi-select library (e.g., Choices.js). Rejected because it adds a dependency for a narrow use case, and our needs (static value list, checkbox style) are simple enough to implement in ~100 lines of vanilla JS.

### 2. Value population strategy: derive from table data

Multi-select dropdowns will populate their value lists from the current table data (same as the current `valuesLookup` approach). For array fields (Country, Region, City), values are flattened from arrays across all rows. For scalar fields (Company, Type, Workplace, Status), values are collected from unique cell values.

This means the dropdown only shows values present in the current dataset. This is consistent with current behavior and avoids an extra API call.

### 3. "(Empty)" option: client-side filter + rule sync

The "(Empty)" checkbox will filter for rows where the field value is empty/null/`[]`. When selected alongside other values, it combines with OR logic (show rows matching any selected value OR rows with empty values).

When syncing to rules: if only "(Empty)" is selected, create an `is_empty` rule. If "(Empty)" plus other values are selected, create both an `in` rule and an `is_empty` rule for that field. The existing AND combiner in `serializeRules` will need a small adjustment — rules from a single multi-select header should combine with OR within the field.

**Simpler approach chosen**: The header filter will perform client-side filtering (Tabulator's `headerFilterFunc`). The rule sync will create the appropriate server-side rules only when "Apply" is triggered. This avoids complex OR-group construction in the rule list for header filter interactions.

### 4. Fix filter removal: handle empty values in `dataFiltered`

The `dataFiltered` event handler currently skips filters with empty values. The fix: when a header filter value is empty/null, find and remove any rule in `rules[]` that was created by that header filter (identified by matching `field` and operator type `eq`/`in`/`in_last_days`/`is_empty`). Then re-serialize and re-apply.

### 5. "Select All" toggle behavior

"Select All" checks all value checkboxes (effectively clearing the filter, since selecting all values = no filter). Unchecking "Select All" unchecks all values. This matches spreadsheet filter UX conventions (Excel, Google Sheets).

## Risks / Trade-offs

- **Custom dropdown positioning**: Absolutely-positioned dropdown inside Tabulator header cells may clip against table edges or overflow. → Mitigation: Use `position: fixed` with calculated coordinates (same pattern as the existing popover), and add a max-height with scroll.
- **Performance with many unique values**: Columns like Company or City could have hundreds of unique values. → Mitigation: Set a max-height on the dropdown with overflow-y scroll. No search/filter input in V1 (can add later if needed).
- **Client-side vs server-side filtering mismatch**: Header filter multi-select operates client-side (Tabulator filters loaded data), while the rule list applies server-side. → Mitigation: Keep current pattern — header filters do immediate client-side filtering for responsiveness, and sync to rules for server-side persistence when "Apply" is clicked. The `dataFiltered` handler syncs selections into rules, and `applyFilters` sends them to the server.
