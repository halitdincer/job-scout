## ADDED Requirements

### Requirement: Jobs page displays enriched fields
The jobs page at `/` SHALL display the following columns: title, company (source name), department, locations (comma-separated), workplace type, country, status, and first seen date.

#### Scenario: Jobs page shows locations
- **WHEN** a job listing has locations "Toronto" and "New York"
- **THEN** the jobs page displays "Toronto, New York" in the location column

#### Scenario: Jobs page shows workplace type badge
- **WHEN** a job listing has `workplace_type="remote"`
- **THEN** the jobs page displays a "Remote" badge for that listing

#### Scenario: Jobs page shows country
- **WHEN** a job listing has `country="CA"`
- **THEN** the jobs page displays "CA" in the country column

### Requirement: Jobs page workplace type filter
The jobs page SHALL include a workplace type filter dropdown with options: All, On-site, Remote, Hybrid, Unknown.

#### Scenario: Filter by workplace type
- **WHEN** a user selects "Remote" from the workplace type filter
- **THEN** only listings with `workplace_type="remote"` are shown

#### Scenario: Filter by unknown workplace type
- **WHEN** a user selects "Unknown" from the workplace type filter
- **THEN** only listings with `workplace_type="unknown"` are shown (platforms that don't provide this field)

### Requirement: Jobs page employment type filter
The jobs page SHALL include an employment type filter dropdown with options: All, Full-time, Part-time, Contract, Intern, Temporary, Unknown.

#### Scenario: Filter by employment type
- **WHEN** a user selects "Full-time" from the employment type filter
- **THEN** only listings with `employment_type="full_time"` are shown
