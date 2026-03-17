## MODIFIED Requirements

### Requirement: AG Grid powered jobs table
The jobs page at `/` SHALL render an AG Grid Community table that fetches all job listings from `/api/jobs/` and displays them client-side with all available columns. Default visible columns: Title, Company, Department, Locations, Type, Workplace, Country, Status, First Seen, Last Seen. Hidden by default: Team, Published At, Updated At Source, Expired At, External ID, Source ID, ID.

#### Scenario: Grid loads data from API
- **WHEN** a user visits `/`
- **THEN** the page fetches `/api/jobs/` and renders all listings in an AG Grid table

#### Scenario: Grid displays default visible columns
- **WHEN** the grid loads with data
- **THEN** 10 columns are visible: Title, Company, Department, Locations, Type, Workplace, Country, Status, First Seen, Last Seen

#### Scenario: Hidden columns accessible via column chooser
- **WHEN** a user opens the column chooser side panel
- **THEN** all columns are listed with checkboxes and hidden columns (Team, Published At, Updated At Source, Expired At, External ID, Source ID, ID) can be toggled on

### Requirement: Column chooser
The grid SHALL include a column chooser accessible via the AG Grid side bar that allows users to show or hide any column.

#### Scenario: Open column chooser
- **WHEN** a user clicks the columns side bar toggle
- **THEN** a panel appears listing all available columns with visibility toggles

#### Scenario: Hide a visible column
- **WHEN** a user unchecks "Department" in the column chooser
- **THEN** the Department column is removed from the grid

#### Scenario: Show a hidden column
- **WHEN** a user checks "Team" in the column chooser
- **THEN** the Team column appears in the grid

### Requirement: Full-width full-height layout
The navbar and grid SHALL span the full viewport width and height. No page title SHALL be displayed. The grid height SHALL fill the viewport below the navbar.

#### Scenario: Grid fills viewport
- **WHEN** a user visits `/`
- **THEN** the grid fills the full width and the remaining height below the 56px navbar

#### Scenario: No page title shown
- **WHEN** a user visits `/`
- **THEN** no `<h1>` heading is displayed above the grid

### Requirement: Multi-select set filters
The Company, Type, Workplace, Country, and Status columns SHALL have set filters allowing selection of multiple values. Filter dropdowns SHALL display the same values shown in the grid cells.

#### Scenario: Multi-select company filter
- **WHEN** a user opens the Company filter and selects "Stripe" and "Spotify"
- **THEN** only listings from Stripe or Spotify are shown

#### Scenario: Set filter shows display labels
- **WHEN** a user opens the Type column filter
- **THEN** the filter dropdown shows "Full-time", "Part-time", etc. (not "full_time", "part_time")

### Requirement: Relative time display
The First Seen and Last Seen columns SHALL display relative timestamps (e.g., "2h ago", "1d ago") with the full date-time available on hover via tooltip.

#### Scenario: Recent listing shows relative time
- **WHEN** a listing was first seen 3 hours ago
- **THEN** the First Seen column displays "3h ago"

#### Scenario: Older listing shows relative time
- **WHEN** a listing was first seen 5 days ago
- **THEN** the First Seen column displays "5d ago"

#### Scenario: Hover shows full date-time
- **WHEN** a user hovers over a relative time cell
- **THEN** a tooltip shows the full date-time (e.g., "Mar 15, 2026 3:45 PM")

### Requirement: Date-time columns show time of day
All date-time columns (Published At, Updated At Source, Expired At) SHALL display both date and time (e.g., "Mar 15, 2026 3:45 PM").

#### Scenario: Published at shows date and time
- **WHEN** a listing has `published_at="2026-03-15T15:45:00Z"`
- **THEN** the Published At column displays "Mar 15, 2026 3:45 PM"

### Requirement: Mobile responsive grid
The grid SHALL be usable on mobile devices with horizontal scrolling for columns that don't fit the viewport.

#### Scenario: Grid on mobile viewport
- **WHEN** a user views the jobs page on a 375px wide screen
- **THEN** the grid is scrollable horizontally and all data is accessible
