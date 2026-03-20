## Why

Header filter removal is broken — clearing a header filter dropdown does not remove the corresponding rule from the unified rule list, so the filter stays active even after the user deselects it. Additionally, columns like Company, Country, Region, and City only support single-value selection in their header filter dropdowns, but users need to filter by multiple values simultaneously (e.g., show jobs in both US and DE). These columns also lack "Select All" and "(Empty)" options that would let users quickly reset or find rows with missing data.

## What Changes

- **Fix header filter removal**: When a header filter dropdown is cleared (value set to empty/null), the corresponding rule in the `rules[]` array must be removed and the active filter expression must be re-applied to the server.
- **Convert categorical/array header filters to multi-select**: Company, Country, Region, City, Type, Workplace, and Status header filter dropdowns will support selecting multiple values simultaneously instead of just one.
- **Add "Select All" and "(Empty)" options**: Multi-select dropdowns will include a "Select All" toggle at the top and an "(Empty)" option to filter for rows where the field is blank/empty.
- **Update rule sync**: The bidirectional sync between header filters and the rule list will use the `in` operator for multi-select fields instead of `eq`, and correctly handle arrays of selected values.

## Capabilities

### New Capabilities

_None — this change enhances existing capabilities._

### Modified Capabilities

- `interactive-jobs-table`: Header filters will support multi-select with "Select All" and "(Empty)" options, and clearing a header filter will correctly remove the associated rule and re-apply filters.

## Impact

- **Frontend JS** (`core/templates/core/jobs.html`): Major changes to the inline JavaScript — new custom multi-select header filter editor, updated `headerFilterToRule`/`syncHeaderFromRules` functions, fix for the `dataFiltered` event handler to handle filter removal.
- **CSS** (`core/static/core/style.css`): New styles for multi-select dropdown checkboxes, "Select All" toggle, and "(Empty)" option.
- **No backend changes**: The filter expression engine already supports `in`, `not_in`, `is_empty` operators. No model or API changes needed.
- **No breaking changes**: Existing rule-based filtering in the Filters panel continues to work as before.
