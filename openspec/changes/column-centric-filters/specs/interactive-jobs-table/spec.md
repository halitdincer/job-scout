## MODIFIED Requirements

### Requirement: Header filters
Categorical columns (Company, Type, Workplace, Country, Region, City, Status) SHALL keep value-list dropdown header filters auto-populated from column data. Date columns SHALL keep preset range dropdown header filters. Header filter selections SHALL create corresponding per-column rules in the unified rule list and vice versa.

#### Scenario: Filter by company dropdown
- **WHEN** a user clicks the Company header filter and selects "Stripe"
- **THEN** only listings from Stripe are shown and a corresponding rule appears in the per-column rule list

#### Scenario: Value-list shows actual values
- **WHEN** a user clicks the Type header filter dropdown
- **THEN** the dropdown shows "Full-time", "Part-time", etc. populated from the actual data

#### Scenario: Header filter syncs from rule list
- **WHEN** a user adds a rule for Company equals "Stripe" in the Filters panel
- **THEN** the Company header filter dropdown reflects "Stripe" as selected

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

### Requirement: Active filter expression visibility
The jobs page SHALL display a compact active-filter summary in the toolbar derived from all active per-column rules.

#### Scenario: Summary reflects active rules
- **WHEN** a user has three active rules across two columns
- **THEN** the toolbar shows a readable summary of all active conditions

#### Scenario: No filters shows default text
- **WHEN** no filter rules are active
- **THEN** the toolbar displays "No filters applied"

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
