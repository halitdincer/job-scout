## ADDED Requirements

### Requirement: AG Grid powered jobs table
The jobs page at `/` SHALL render an AG Grid Community table that fetches all job listings from `/api/jobs/` and displays them client-side with columns: Title, Company, Department, Locations, Type, Workplace, Country, Status, First Seen.

#### Scenario: Grid loads data from API
- **WHEN** a user visits `/`
- **THEN** the page fetches `/api/jobs/` and renders all listings in an AG Grid table

#### Scenario: Grid displays all columns
- **WHEN** the grid loads with data
- **THEN** all 9 columns are visible: Title, Company, Department, Locations, Type, Workplace, Country, Status, First Seen

### Requirement: Column sorting
Every column in the jobs grid SHALL be sortable by clicking the column header. Clicking once sorts ascending, clicking again sorts descending, clicking a third time clears the sort.

#### Scenario: Sort by title ascending
- **WHEN** a user clicks the Title column header
- **THEN** listings are sorted alphabetically by title (A-Z)

#### Scenario: Sort by first seen descending
- **WHEN** a user clicks the First Seen column header twice
- **THEN** listings are sorted by first seen date, newest first

### Requirement: Text column filters
The Title, Department, Locations, and Country columns SHALL have text-based filters that match case-insensitively.

#### Scenario: Filter by title text
- **WHEN** a user opens the Title column filter and types "engineer"
- **THEN** only listings whose title contains "engineer" (case-insensitive) are shown

### Requirement: Multi-select set filters
The Company, Type, Workplace, Country, and Status columns SHALL have set filters allowing selection of multiple values.

#### Scenario: Multi-select company filter
- **WHEN** a user opens the Company filter and selects "Stripe" and "Spotify"
- **THEN** only listings from Stripe or Spotify are shown

#### Scenario: Multi-select status filter
- **WHEN** a user opens the Status filter and selects "active"
- **THEN** only active listings are shown

### Requirement: Client-side pagination
The grid SHALL paginate results with 50 rows per page, with navigation controls to move between pages.

#### Scenario: Pagination with more than 50 listings
- **WHEN** there are 100 listings loaded
- **THEN** the first page shows 50 rows and pagination controls allow navigating to page 2

### Requirement: Title links to external URL
The Title column SHALL render each title as a clickable link that opens the job's external URL in a new tab.

#### Scenario: Click job title
- **WHEN** a user clicks a job title in the grid
- **THEN** the external job posting URL opens in a new browser tab

### Requirement: Display label mapping
Employment type and workplace type columns SHALL display human-readable labels instead of internal values (e.g., "Full-time" instead of "full_time", "Remote" instead of "remote").

#### Scenario: Employment type displays label
- **WHEN** a listing has `employment_type="full_time"`
- **THEN** the grid displays "Full-time"

#### Scenario: Workplace type displays label
- **WHEN** a listing has `workplace_type="on_site"`
- **THEN** the grid displays "On-site"

### Requirement: Mobile responsive grid
The grid SHALL be usable on mobile devices with horizontal scrolling for columns that don't fit the viewport.

#### Scenario: Grid on mobile viewport
- **WHEN** a user views the jobs page on a 375px wide screen
- **THEN** the grid is scrollable horizontally and all data is accessible

### Requirement: Dark theme
The grid SHALL use AG Grid's dark theme, customized to match the existing site's dark neutral color palette.

#### Scenario: Grid matches site theme
- **WHEN** the grid renders
- **THEN** it uses a dark background consistent with the site's existing color scheme
