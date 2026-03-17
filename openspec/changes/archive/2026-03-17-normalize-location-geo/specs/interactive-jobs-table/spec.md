## MODIFIED Requirements

### Requirement: AG Grid powered jobs table
The jobs page at `/` SHALL render an AG Grid Community table that fetches all job listings from `/api/jobs/` and displays them client-side with all available columns. Default visible columns: Title, Company, Department, Locations, Type, Workplace, Country, Status, First Seen, Last Seen. Hidden by default: Team, Published At, Updated At Source, Expired At, External ID, Source ID, ID. The Country column SHALL derive its values from LocationTag `country_code` fields (via the locations M2M), not from a flat `country` field on JobListing.

#### Scenario: Grid loads data from API
- **WHEN** a user visits `/`
- **THEN** the page fetches `/api/jobs/` and renders all listings in an AG Grid table

#### Scenario: Grid displays default visible columns
- **WHEN** the grid loads with data
- **THEN** 10 columns are visible: Title, Company, Department, Locations, Type, Workplace, Country, Status, First Seen, Last Seen

#### Scenario: Hidden columns accessible via column chooser
- **WHEN** a user opens the column chooser side panel
- **THEN** all columns are listed with checkboxes and hidden columns (Team, Published At, Updated At Source, Expired At, External ID, Source ID, ID) can be toggled on

### Requirement: Multi-select set filters
The Company, Type, Workplace, Country, and Status columns SHALL have set filters allowing selection of multiple values. The Country filter SHALL use `country_code` values derived from LocationTags, enabling hierarchical geo filtering (selecting "CA" shows all jobs with any LocationTag mapped to country_code "CA").

#### Scenario: Multi-select company filter
- **WHEN** a user opens the Company filter and selects "Stripe" and "Spotify"
- **THEN** only listings from Stripe or Spotify are shown

#### Scenario: Set filter shows display labels
- **WHEN** a user opens the Type column filter
- **THEN** the filter dropdown shows "Full-time", "Part-time", etc. (not "full_time", "part_time")

#### Scenario: Country filter uses geo-mapped values
- **WHEN** a user opens the Country filter and selects "CA"
- **THEN** all listings that have at least one LocationTag with `country_code="CA"` are shown, regardless of raw location string
