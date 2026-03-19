## MODIFIED Requirements

### Requirement: Header filters
Each column SHALL have a header filter. Categorical columns (Company, Type, Workplace, Country, Region, City, Status) SHALL use a value-list dropdown auto-populated from column data. Text columns (Title, Department, Location (Raw)) SHALL use a text input filter. Existing header filters SHALL remain available as quick filters after advanced filtering is introduced.

#### Scenario: Filter by company dropdown
- **WHEN** a user clicks the Company header filter and selects "Stripe"
- **THEN** only listings from Stripe are shown

#### Scenario: Filter by title text
- **WHEN** a user types "engineer" in the Title header filter
- **THEN** only listings whose title contains "engineer" (case-insensitive) are shown

#### Scenario: Value-list shows actual values
- **WHEN** a user clicks the Type header filter dropdown
- **THEN** the dropdown shows "Full-time", "Part-time", etc. populated from the actual data

#### Scenario: Quick filters compose with advanced filters
- **WHEN** a user has active quick filters and also applies an advanced filter expression
- **THEN** the table applies both using logical `AND`

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

### Requirement: Mobile responsive grid
The grid SHALL be usable on mobile devices with horizontal scrolling for columns that don't fit the viewport. Advanced filters and columns controls SHALL be accessible through slide-over side panels optimized for small screens.

#### Scenario: Grid on mobile viewport
- **WHEN** a user views the jobs page on a 375px wide screen
- **THEN** the grid is scrollable horizontally and all data is accessible

#### Scenario: Mobile filters panel
- **WHEN** a user opens the filters panel on a mobile viewport
- **THEN** filter builder controls render in a single-column layout with visible apply and clear actions

## ADDED Requirements

### Requirement: Advanced filter builder panel
The jobs page SHALL provide an AG Grid-style filters side panel that lets users build nested boolean filter expressions with `AND`, `OR`, and `NOT`, including multiple predicates for the same field.

#### Scenario: Multiple predicates on one field
- **WHEN** a user adds two title predicates (`contains engineer` and `not_contains senior`)
- **THEN** both predicates are represented and applied in the active expression

#### Scenario: Nested group editing
- **WHEN** a user adds an `OR` subgroup inside an `AND` root group
- **THEN** the builder displays group hierarchy and applies the nested logic correctly

### Requirement: Active filter expression visibility
The jobs page SHALL display a compact active-filter summary derived from the current advanced expression and quick filters.

#### Scenario: Summary reflects active expression
- **WHEN** a user applies an advanced expression with three predicates
- **THEN** the UI shows a readable summary of active conditions and logical grouping
