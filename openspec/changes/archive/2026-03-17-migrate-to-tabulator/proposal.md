## Why

AG Grid Community paywalls critical features — set filters (dropdown of unique values) and the column tool panel are Enterprise-only and fail silently. Rather than working around these limitations with custom code, switch to Tabulator which provides all needed features (value-list header filters, column visibility, sorting, pagination, dark theme) for free under the MIT license.

## What Changes

- **BREAKING**: Replace AG Grid with Tabulator as the client-side table library
- Remove AG Grid CDN script from `base.html`, add Tabulator JS + CSS CDN
- Rewrite `jobs.html` grid initialization from AG Grid API to Tabulator API
- All date/time columns use relative time display ("3h ago", "2d ago") with tooltip for full date-time
- Header filters: value-list dropdowns for Company, Type, Workplace, Country, Status; text input for Title, Department, Locations
- Default visible columns: Title, Company, Location, Type, Published At, First Seen
- Hidden by default: all others (Department, Workplace, Country, Status, Last Seen, Team, Updated At Source, Expired At, External ID, Source ID, ID)
- Column chooser: custom button + dropdown (same pattern as current implementation)
- Remove AG Grid-specific CSS; add Tabulator theme overrides for dark theme
- Update page tests to verify Tabulator initialization instead of AG Grid

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
- `interactive-jobs-table`: Replace AG Grid with Tabulator; change filter types, default column visibility, and date display
- `enriched-listing-display`: Update filter references from AG Grid set filters to Tabulator header filters

## Impact

- **Frontend**: Complete rewrite of jobs.html `<script>` block (~150 lines); CSS changes for Tabulator theme
- **Templates**: `base.html` CDN swap (AG Grid → Tabulator)
- **Tests**: `test_pages.py` assertions change from `agGrid.createGrid` to `new Tabulator`
- **Backend**: No changes — API response shape unchanged
