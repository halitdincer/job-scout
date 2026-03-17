## ADDED Requirements

### Requirement: Tabulator powered jobs table
The jobs page at `/` SHALL render a Tabulator table that fetches all job listings from `/api/jobs/` and displays them client-side with all available columns. Default visible columns: Title, Company, Location, Type, Published At, First Seen. Hidden by default: Department, Workplace, Country, Status, Last Seen, Team, Updated At Source, Expired At, External ID, Source ID, ID. The Country column SHALL derive its values from LocationTag `country_code` fields (via the locations M2M).

#### Scenario: Table loads data from API
- **WHEN** a user visits `/`
- **THEN** the page fetches `/api/jobs/` and renders all listings in a Tabulator table

#### Scenario: Table displays default visible columns
- **WHEN** the table loads with data
- **THEN** 6 columns are visible: Title, Company, Location, Type, Published At, First Seen

#### Scenario: Hidden columns accessible via column chooser
- **WHEN** a user opens the column chooser
- **THEN** all columns are listed with checkboxes and hidden columns can be toggled on

### Requirement: Column chooser
The table SHALL include a custom column chooser button above the grid that opens a dropdown panel listing all columns with checkboxes to toggle visibility.

#### Scenario: Open column chooser
- **WHEN** a user clicks the "Columns" button
- **THEN** a dropdown panel appears listing all available columns with visibility toggles

#### Scenario: Hide a visible column
- **WHEN** a user unchecks "Company" in the column chooser
- **THEN** the Company column is removed from the table

#### Scenario: Show a hidden column
- **WHEN** a user checks "Team" in the column chooser
- **THEN** the Team column appears in the table

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
Each column SHALL have a header filter. Categorical columns (Company, Type, Workplace, Country, Status) SHALL use a value-list dropdown auto-populated from column data. Text columns (Title, Department, Locations) SHALL use a text input filter.

#### Scenario: Filter by company dropdown
- **WHEN** a user clicks the Company header filter and selects "Stripe"
- **THEN** only listings from Stripe are shown

#### Scenario: Filter by title text
- **WHEN** a user types "engineer" in the Title header filter
- **THEN** only listings whose title contains "engineer" (case-insensitive) are shown

#### Scenario: Value-list shows actual values
- **WHEN** a user clicks the Type header filter dropdown
- **THEN** the dropdown shows "Full-time", "Part-time", etc. populated from the actual data

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
The grid SHALL be usable on mobile devices with horizontal scrolling for columns that don't fit the viewport.

#### Scenario: Grid on mobile viewport
- **WHEN** a user views the jobs page on a 375px wide screen
- **THEN** the grid is scrollable horizontally and all data is accessible

### Requirement: Dark theme
The table SHALL use Tabulator's midnight theme, with CSS overrides as needed to match the site's dark neutral color palette.

#### Scenario: Table matches site theme
- **WHEN** the table renders
- **THEN** it uses a dark background consistent with the site's existing color scheme
