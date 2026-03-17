## MODIFIED Requirements

### Requirement: Header filters
Each column SHALL have a header filter. Categorical columns (Company, Type, Workplace, Country, Region, City, Status) SHALL use a value-list dropdown auto-populated from column data. Text columns (Title, Department, Location (Raw)) SHALL use a text input filter. For Country, Region, and City columns, the dropdown SHALL list individual geo values extracted from all rows (not composite joined strings), and the filter SHALL match any row whose geo array contains the selected value.

#### Scenario: Filter by company dropdown
- **WHEN** a user clicks the Company header filter and selects "Stripe"
- **THEN** only listings from Stripe are shown

#### Scenario: Filter by title text
- **WHEN** a user types "engineer" in the Title header filter
- **THEN** only listings whose title contains "engineer" (case-insensitive) are shown

#### Scenario: Value-list shows actual values
- **WHEN** a user clicks the Type header filter dropdown
- **THEN** the dropdown shows "Full-time", "Part-time", etc. populated from the actual data

#### Scenario: Region filter lists individual values
- **WHEN** two listings exist with regions ["US-CA", "US-NY"] and ["US-CA"] respectively
- **THEN** the Region dropdown shows "US-CA" and "US-NY" as separate options (not "US-CA, US-NY")

#### Scenario: Selecting a region matches all listings containing it
- **WHEN** a user selects "US-CA" in the Region filter
- **THEN** both listings (the one with ["US-CA", "US-NY"] and the one with ["US-CA"]) are shown

#### Scenario: Country filter works the same as region
- **WHEN** a user selects "US" in the Country filter
- **THEN** all listings with "US" in their country array are shown

#### Scenario: City filter works the same as region
- **WHEN** a user selects "Toronto" in the City filter
- **THEN** all listings with "Toronto" in their city array are shown

### Requirement: Tabulator powered jobs table
The jobs page at `/` SHALL render a Tabulator table that fetches all job listings from `/api/jobs/` and displays them client-side with all available columns. Default visible columns: Title, Company, Location (Raw), Type, Published At, First Seen. Hidden by default: Department, Workplace, Country, Region, City, Status, Last Seen, Team, Updated At Source, Expired At, External ID, Source ID, ID. The Country column SHALL derive its values from LocationTag `country_code` fields (via the locations M2M). The Region column SHALL derive its values from `region_code` fields. The City column SHALL derive its values from `city` fields. Country, Region, and City cells SHALL display array values joined with ", " for readability.

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
- **THEN** the Region column displays "CA-BC, CA-ON"

#### Scenario: City column shows city names
- **WHEN** a listing has locations with `city` values "Toronto" and "Vancouver"
- **THEN** the City column displays "Toronto, Vancouver"

#### Scenario: Filter by region dropdown
- **WHEN** a user clicks the Region header filter and selects "CA-ON"
- **THEN** only listings with a location in region "CA-ON" are shown

#### Scenario: Filter by city dropdown
- **WHEN** a user clicks the City header filter and selects "Toronto"
- **THEN** only listings with a location in city "Toronto" are shown
