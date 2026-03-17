## MODIFIED Requirements

### Requirement: Jobs page displays enriched fields
The jobs grid at `/` SHALL display columns: Title, Company (source name), Department, Locations (comma-separated), Type (employment type with display label), Workplace (workplace type with display label), Country, Status, and First Seen (formatted date). All filtering is handled by AG Grid's built-in column filters instead of server-side query parameters.

#### Scenario: Grid shows locations
- **WHEN** a job listing has locations ["Toronto", "New York"]
- **THEN** the grid displays "Toronto, New York" in the Locations column

#### Scenario: Grid shows employment type label
- **WHEN** a job listing has `employment_type="full_time"`
- **THEN** the grid displays "Full-time" in the Type column

#### Scenario: Grid shows workplace type label
- **WHEN** a job listing has `workplace_type="remote"`
- **THEN** the grid displays "Remote" in the Workplace column

### Requirement: Jobs page workplace type filter
The Workplace column SHALL include an AG Grid set filter with multi-select, replacing the previous server-side dropdown.

#### Scenario: Filter by workplace type
- **WHEN** a user opens the Workplace column filter and selects "Remote"
- **THEN** only listings with `workplace_type="remote"` are shown

### Requirement: Jobs page employment type filter
The Type column SHALL include an AG Grid set filter with multi-select, replacing the previous server-side dropdown.

#### Scenario: Filter by employment type
- **WHEN** a user opens the Type column filter and selects "Full-time"
- **THEN** only listings with `employment_type="full_time"` are shown
