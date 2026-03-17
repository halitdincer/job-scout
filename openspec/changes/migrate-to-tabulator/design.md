## Context

The jobs page uses AG Grid Community v35.1.0 loaded via CDN. Set filters (`agSetColumnFilter`) and the column tool panel are Enterprise-only and fail silently — filters show no values. Tabulator is a fully-featured MIT-licensed alternative with built-in value-list header filters, column visibility, dark themes, and no paywall.

## Goals / Non-Goals

**Goals:**
- Replace AG Grid with Tabulator for the jobs table
- All date/time columns display relative timestamps with full date tooltip
- Header filters: value-list dropdowns (auto-populated from column data) for categorical columns; text input for free-text columns
- Default visible columns: Title, Company, Location, Type, Published At, First Seen
- Column chooser preserves current custom button + dropdown panel pattern
- Dark theme using Tabulator's `midnight` theme with CSS variable overrides

**Non-Goals:**
- Changing the API response shape
- Adding new columns or data
- Server-side filtering or pagination
- Using Tabulator's built-in download/export features

## Decisions

### D1: CDN delivery

Use jsDelivr CDN, pinned version:
- JS: `https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.1/dist/js/tabulator.min.js`
- CSS: `https://cdn.jsdelivr.net/npm/tabulator-tables@6.3.1/dist/css/tabulator_midnight.min.css`

Replace the AG Grid CDN script in `base.html`. The `midnight` theme provides a dark background that closely matches the site's `--bg` / `--bg-surface` palette.

### D2: Column definitions

Tabulator column config maps from AG Grid like this:

| AG Grid concept | Tabulator equivalent |
|---|---|
| `field` | `field` |
| `headerName` | `title` |
| `filter: "agSetColumnFilter"` | `headerFilter: "list", headerFilterParams: {valuesLookup: true}` |
| `filter: "agTextColumnFilter"` | `headerFilter: "input"` |
| `cellRenderer` (DOM element) | `formatter` (returns HTML string or element) |
| `valueFormatter` | `formatter` |
| `hide: true` | `visible: false` |
| `minWidth` / `flex` | `minWidth` / `widthGrow` |
| `sort: "desc"` | `table.setSort("field", "desc")` after data load |

### D3: Header filters

Categorical columns use Tabulator's built-in list header filter:
```js
{
  title: "Company", field: "source_name",
  headerFilter: "list",
  headerFilterParams: { valuesLookup: true, clearable: true }
}
```

`valuesLookup: true` auto-populates the dropdown from actual column values. `clearable: true` adds an "x" to clear the filter.

Text columns use input header filter:
```js
{
  title: "Title", field: "title",
  headerFilter: "input",
  headerFilterPlaceholder: "Search..."
}
```

### D4: Relative time for ALL date columns

All date/time columns (First Seen, Last Seen, Published At, Updated At Source, Expired At) use a `timeAgo` formatter that shows relative time ("3h ago") with a `tooltip` function returning the full date-time string.

### D5: Column chooser

Keep the existing custom column chooser pattern (button + dropdown panel). Replace `gridApi.getColumns()` / `gridApi.setColumnsVisible()` with Tabulator equivalents:
- `table.getColumns()` — returns column components
- `col.isVisible()` — check visibility
- `col.toggle()` — toggle visibility

### D6: Layout

Keep current CSS: `main.full-bleed` fills viewport, `#jobs-grid` fills remaining height below toolbar. Tabulator's `height: "100%"` + `layout: "fitColumns"` handles responsive column sizing.

### D7: Pagination

```js
pagination: true,
paginationSize: 50,
paginationSizeSelector: [25, 50, 100]
```

## Risks / Trade-offs

- **Visual difference**: Tabulator's midnight theme may not exactly match AG Grid's `colorSchemeDarkBlue`. Minor CSS overrides may be needed for background colors and borders.
- **Behavior differences**: Tabulator's sort cycle is asc → desc → none (same as AG Grid). Filter behavior is similar but not identical — e.g., list filter is a single-select dropdown by default, not multi-select checkboxes like AG Grid Enterprise.
- **Column resize**: Tabulator supports resizable columns by default, matching current behavior.
