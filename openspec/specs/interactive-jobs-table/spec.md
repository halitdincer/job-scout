## ADDED Requirements

### Requirement: Tabulator powered jobs table
The jobs page at `/` SHALL render a Tabulator table that fetches all job listings from `/api/jobs/` and displays them client-side with all available columns. The table SHALL support drag-and-drop column reordering via Tabulator's `movableColumns` option. Default visible columns: Title, Company, Location (Raw), Type, Published At, First Seen. Hidden by default: Department, Workplace, Country, Region, City, Status, Last Seen, Team, Updated At Source, Expired At, External ID, Source ID, ID. The Country column SHALL derive its values from LocationTag `country_code` fields (via the locations M2M). The Region column SHALL derive its values from `region_code` fields. The City column SHALL derive its values from `city` fields.

#### Scenario: Table loads data from API
- **WHEN** a user visits `/`
- **THEN** the page fetches `/api/jobs/` and renders all listings in a Tabulator table

#### Scenario: Table displays default visible columns
- **WHEN** the table loads with data
- **THEN** 6 columns are visible: Title, Company, Location (Raw), Type, Published At, First Seen

#### Scenario: Hidden columns accessible via column chooser
- **WHEN** a user opens the column chooser
- **THEN** all columns are listed with checkboxes and hidden columns (including Region and City) can be toggled on

#### Scenario: Region column shows region codes
- **WHEN** a listing has locations with `region_code` values "CA-ON" and "CA-BC"
- **THEN** the Region column displays "CA-ON, CA-BC"

#### Scenario: City column shows city names
- **WHEN** a listing has locations with `city` values "Toronto" and "Vancouver"
- **THEN** the City column displays "Toronto, Vancouver"

#### Scenario: Filter by region dropdown
- **WHEN** a user clicks the Region header filter and selects "CA-ON"
- **THEN** only listings with a location in region "CA-ON" are shown

#### Scenario: Filter by city dropdown
- **WHEN** a user clicks the City header filter and selects "Toronto"
- **THEN** only listings with a location in city "Toronto" are shown

#### Scenario: Columns are reorderable by drag and drop
- **WHEN** a user drags a column header to a new position
- **THEN** the column moves to the new position in the table

### Requirement: Column chooser
The table SHALL include a custom column chooser button above the grid that opens a dropdown panel listing all columns with checkboxes to toggle visibility. The jobs page SHALL also provide an AG Grid-style columns side panel that exposes the same visibility controls in a mobile-responsive layout.

#### Scenario: Open column chooser
- **WHEN** a user clicks the "Columns" button
- **THEN** a dropdown panel appears listing all available columns with visibility toggles

#### Scenario: Hide a visible column
- **WHEN** a user unchecks "Company" in the column chooser
- **THEN** the Company column is removed from the table

#### Scenario: Show a hidden column
- **WHEN** a user checks "Team" in the column chooser
- **THEN** the Team column appears in the table

#### Scenario: Open columns side panel on mobile
- **WHEN** a user on a 375px wide viewport opens the columns panel
- **THEN** the panel is usable with touch controls and can toggle column visibility without horizontal clipping

### Requirement: Full-width full-height layout
The navbar and table SHALL span the full viewport width and height. No page title SHALL be displayed. The table height SHALL fill the viewport below the navbar and toolbar.

#### Scenario: Table fills viewport
- **WHEN** a user visits `/`
- **THEN** the table fills the full width and the remaining height below the 56px navbar and toolbar

#### Scenario: No page title shown
- **WHEN** a user visits `/`
- **THEN** no `<h1>` heading is displayed above the table

### Requirement: Column sorting
Every column in the jobs table SHALL be sortable by clicking the column header.

#### Scenario: Sort by title ascending
- **WHEN** a user clicks the Title column header
- **THEN** listings are sorted alphabetically by title (A-Z)

#### Scenario: Sort by first seen descending
- **WHEN** a user clicks the First Seen column header twice
- **THEN** listings are sorted by first seen date, newest first

### Requirement: Header filters
Categorical columns (Company, Type, Workplace, Country, Region, City, Status) SHALL use custom multi-select checkbox dropdown header filters populated from column data. Each dropdown SHALL include a "Select All" toggle at the top and an "(Empty)" option to filter for rows with blank/missing values. Selecting multiple values SHALL filter the table to show rows matching any of the selected values (OR logic within the column). Date columns SHALL keep preset range dropdown header filters (unchanged). Header filter selections SHALL create corresponding per-column rules in the unified rule list: multi-value selections SHALL use the `in` operator, single-value selections SHALL use `eq`, and "(Empty)" selections SHALL use `is_empty`. Clearing all selections in a header filter dropdown SHALL remove the corresponding rule from the rule list and re-apply the filter expression to the server. The multi-select dropdown SHALL display a summary label showing the count of selected values (e.g., "2 selected") or the single selected value name when only one is chosen.

#### Scenario: Filter by company dropdown with multiple values
- **WHEN** a user opens the Company header filter and checks "Stripe" and "Google"
- **THEN** only listings from Stripe or Google are shown and a corresponding `in` rule appears in the per-column rule list

#### Scenario: Filter by single company value
- **WHEN** a user opens the Company header filter and checks only "Stripe"
- **THEN** only listings from Stripe are shown and a corresponding `eq` rule appears in the per-column rule list

#### Scenario: Select All toggle checks all values
- **WHEN** a user clicks "Select All" in the Country header filter dropdown
- **THEN** all country checkboxes are checked and the filter is effectively cleared (all rows shown)

#### Scenario: Select All toggle unchecks all values
- **WHEN** a user unchecks "Select All" in the Country header filter dropdown where all values were selected
- **THEN** all country checkboxes are unchecked

#### Scenario: Empty option filters for missing values
- **WHEN** a user checks only "(Empty)" in the Country header filter dropdown
- **THEN** only listings with no country data are shown and an `is_empty` rule appears in the rule list

#### Scenario: Multi-select with Empty option
- **WHEN** a user checks "US" and "(Empty)" in the Country header filter
- **THEN** listings with country "US" or with no country data are shown

#### Scenario: Value-list shows actual values with checkboxes
- **WHEN** a user clicks the Type header filter dropdown
- **THEN** the dropdown shows checkboxes for "Full-time", "Part-time", etc. populated from the actual data, plus "Select All" and "(Empty)"

#### Scenario: Header filter summary label shows count
- **WHEN** a user selects 3 values in the Country header filter
- **THEN** the header filter cell displays "3 selected" as the summary

#### Scenario: Header filter summary label shows single value
- **WHEN** a user selects only "US" in the Country header filter
- **THEN** the header filter cell displays "US"

#### Scenario: Header filter syncs from rule list
- **WHEN** a user adds an `in` rule for Country with values "US, DE" in the Filters panel and clicks Apply
- **THEN** the Country header filter dropdown shows "US" and "DE" checked

#### Scenario: Clearing header filter removes rule
- **WHEN** a user had "Stripe" selected in the Company header filter and then unchecks it (clearing the filter)
- **THEN** the Company rule is removed from the rule list and the table re-fetches unfiltered data from the server

#### Scenario: Date column header filters unchanged
- **WHEN** a user clicks the Published At header filter
- **THEN** the dropdown shows single-select preset ranges ("Today", "Last 7 days", etc.) as before

#### Scenario: Array column multi-select
- **WHEN** a user opens the City header filter and checks "Toronto" and "Vancouver"
- **THEN** only listings with a location in Toronto or Vancouver are shown

#### Scenario: Dropdown has max height with scroll
- **WHEN** a column has more than 15 unique values
- **THEN** the dropdown shows a scrollable list with a maximum height constraint

### Requirement: Column header filter popover
Each filterable column header SHALL support a click interaction that opens a popover showing that column's active filter rules and an option to add a new rule. The popover SHALL display the same rule rows as the Filters panel for that column.

#### Scenario: Open column filter popover
- **WHEN** a user clicks the filter icon on the Title column header
- **THEN** a popover appears showing any active Title rules and an "Add Rule" action

#### Scenario: Add rule from popover
- **WHEN** a user adds a rule via the column header popover
- **THEN** the rule appears in both the popover and the Filters panel

#### Scenario: Popover reflects panel state
- **WHEN** a user has rules set via the Filters panel for the Company column
- **THEN** opening the Company column popover shows those same rules

### Requirement: Relative time display for all date columns
ALL date/time columns (First Seen, Last Seen, Published At, Updated At Source, Expired At) SHALL display relative timestamps (e.g., "2h ago", "1d ago") with the full date-time available on hover via tooltip.

#### Scenario: Recent listing shows relative time
- **WHEN** a listing was first seen 3 hours ago
- **THEN** the First Seen column displays "3h ago"

#### Scenario: Published at shows relative time
- **WHEN** a listing was published 2 days ago
- **THEN** the Published At column displays "2d ago"

#### Scenario: Hover shows full date-time
- **WHEN** a user hovers over a relative time cell
- **THEN** a tooltip shows the full date-time (e.g., "Mar 15, 2026 3:45 PM")

### Requirement: Client-side pagination
The table SHALL paginate results with 50 rows per page, with navigation controls and a page size selector.

#### Scenario: Pagination with more than 50 listings
- **WHEN** there are 100 listings loaded
- **THEN** the first page shows 50 rows and pagination controls allow navigating to page 2

### Requirement: Title links to external URL
The Title column SHALL render each title as a clickable link that opens the job's external URL in a new tab.

#### Scenario: Click job title
- **WHEN** a user clicks a job title in the table
- **THEN** the external job posting URL opens in a new browser tab

### Requirement: Display label mapping
Employment type and workplace type columns SHALL display human-readable labels instead of internal values.

#### Scenario: Employment type displays label
- **WHEN** a listing has `employment_type="full_time"`
- **THEN** the table displays "Full-time"

#### Scenario: Workplace type displays label
- **WHEN** a listing has `workplace_type="on_site"`
- **THEN** the table displays "On-site"

### Requirement: Mobile responsive grid
The grid SHALL be usable on mobile devices with horizontal scrolling for columns that don't fit the viewport. Filter rules SHALL be accessible through the slide-over Filters side panel optimized for small screens. Column header popovers SHALL fall back to opening the Filters panel on narrow viewports.

#### Scenario: Grid on mobile viewport
- **WHEN** a user views the jobs page on a 375px wide screen
- **THEN** the grid is scrollable horizontally and all data is accessible

#### Scenario: Mobile filters panel
- **WHEN** a user opens the filters panel on a mobile viewport
- **THEN** per-column rule controls render in a single-column layout with visible apply and clear actions

#### Scenario: Mobile column filter falls back to panel
- **WHEN** a user taps a column filter icon on a mobile viewport
- **THEN** the Filters panel opens scrolled to that column's section instead of showing a popover

### Requirement: Advanced filter builder panel
The jobs page SHALL provide a Filters side panel that lists all active filter rules grouped by column name. Each rule SHALL display the operator and value. Users SHALL be able to add new rules for any column and remove existing rules. All rules SHALL combine with logical AND. The panel SHALL NOT use nested group builders.

#### Scenario: Multiple predicates on one field
- **WHEN** a user adds two title rules (`contains engineer` and `not_contains senior`)
- **THEN** both rules appear under the Title section and both are applied with AND

#### Scenario: Add rule from panel
- **WHEN** a user clicks "Add Rule" under the Title section in the Filters panel
- **THEN** a new rule row appears for the Title column with operator and value inputs

#### Scenario: Remove rule from panel
- **WHEN** a user clicks remove on a rule in the Filters panel
- **THEN** the rule is removed from the list and the table results update

#### Scenario: No group builder controls
- **WHEN** a user opens the Filters panel
- **THEN** there are no Add Group, root group operator, or nested group controls

### Requirement: Active filter expression visibility
The jobs page SHALL display a compact active-filter summary in the toolbar derived from all active per-column rules.

#### Scenario: Summary reflects active rules
- **WHEN** a user has three active rules across two columns
- **THEN** the toolbar shows a readable summary of all active conditions

#### Scenario: No filters shows default text
- **WHEN** no filter rules are active
- **THEN** the toolbar displays "No filters applied"

### Requirement: Dark theme
The table SHALL use Tabulator's midnight theme, with CSS overrides as needed to match the site's dark neutral color palette.

#### Scenario: Table matches site theme
- **WHEN** the table renders
- **THEN** it uses a dark background consistent with the site's existing color scheme
