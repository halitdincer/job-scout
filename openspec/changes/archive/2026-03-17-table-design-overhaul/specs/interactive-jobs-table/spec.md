## MODIFIED Requirements

### Requirement: Tabulator powered jobs table
The jobs page at `/` SHALL render a Tabulator table that fetches all job listings from `/api/jobs/` and displays them client-side with all available columns. Default visible columns: Title, Company, Country, City, Published At, First Seen. Hidden by default: Location (Raw), Type, Department, Workplace, Region, Status, Last Seen, Team, Updated At Source, Expired At, External ID, Source ID, ID. The Country column SHALL derive its values from LocationTag `country_code` fields (via the locations M2M). The Region column SHALL derive its values from `region_code` fields. The City column SHALL derive its values from `city` fields. Country, Region, and City cells SHALL display array values joined with ", " for readability.

#### Scenario: Table loads data from API
- **WHEN** a user visits `/`
- **THEN** the page fetches `/api/jobs/` and renders all listings in a Tabulator table

#### Scenario: Table displays default visible columns
- **WHEN** the table loads with data
- **THEN** 6 columns are visible: Title, Company, Country, City, Published At, First Seen

#### Scenario: Hidden columns accessible via column chooser
- **WHEN** a user opens the column chooser
- **THEN** all columns are listed with checkboxes and hidden columns (including Location (Raw), Type, Region) can be toggled on

### Requirement: Full-width contained layout
The navbar and table SHALL span the available viewport width with consistent padding/margins. The table height SHALL fill the viewport below the navbar and toolbar without causing page-level scroll. Only the table body SHALL scroll internally.

#### Scenario: Table fills viewport with margins
- **WHEN** a user visits `/`
- **THEN** the table sits within the viewport with visible padding around all edges and the page does not scroll

#### Scenario: Only table scrolls
- **WHEN** there are more rows than fit in the visible table area
- **THEN** the table body scrolls internally and the page itself does not scroll

### Requirement: Dark theme readability
The table SHALL use Tabulator's midnight theme with CSS overrides for improved contrast and readability. Links in cells SHALL be clearly distinguishable from surrounding text. Header cells, filter inputs, pagination controls, and row hover states SHALL be styled to match the site's dark neutral palette with sufficient contrast.

#### Scenario: Links are visible
- **WHEN** a listing title renders as a link
- **THEN** the link color is clearly distinguishable from cell text and underlines on hover

#### Scenario: Header filters match dark theme
- **WHEN** header filter inputs and dropdowns render
- **THEN** they use dark backgrounds with visible borders and readable text matching the site palette

#### Scenario: Pagination controls are readable
- **WHEN** pagination controls render below the table
- **THEN** buttons and page info text are visible and styled consistently with the dark theme

### Requirement: Mobile responsive grid
The grid SHALL be usable on mobile devices with horizontal scrolling for columns that don't fit the viewport. The toolbar and column chooser SHALL remain usable on narrow screens.

#### Scenario: Grid on mobile viewport
- **WHEN** a user views the jobs page on a 375px wide screen
- **THEN** the grid is scrollable horizontally and all data is accessible

#### Scenario: Toolbar usable on mobile
- **WHEN** a user views the jobs page on a narrow screen
- **THEN** the Columns button and chooser panel are accessible and functional
