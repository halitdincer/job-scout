## MODIFIED Requirements

### Requirement: Tabulator powered jobs table
The jobs page at `/` SHALL render a Tabulator table that fetches all job listings from `/api/jobs/` and displays them client-side with all available columns. Default visible columns: Title, Company, Location (Raw), Type, Published At, First Seen. Hidden by default: Department, Workplace, Country, Region, City, Status, Last Seen, Team, Updated At Source, Expired At, External ID, Source ID, ID. The Country column SHALL derive its values from LocationTag `country_code` fields (via the locations M2M). The Region column SHALL derive its values from `region_code` fields. The City column SHALL derive its values from `city` fields.

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
