## MODIFIED Requirements

### Requirement: Jobs page displays enriched fields
The jobs grid at `/` SHALL have columns available for all API response fields: Title, Company (source name), Department, Locations (comma-separated raw names), Type (employment type with display label), Workplace (workplace type with display label), Country (derived from LocationTag country_code), Status, First Seen, Last Seen, Team, Published At, Updated At Source, Expired At, External ID, Source ID, and ID. Default visibility is controlled by the grid configuration. The Country column SHALL display comma-separated unique `country_code` values from the listing's LocationTags.

#### Scenario: Grid shows locations
- **WHEN** a job listing has locations [{"name": "Toronto, ON", "country_code": "CA"}, {"name": "New York, NY", "country_code": "US"}]
- **THEN** the Locations column displays "Toronto, ON, New York, NY"

#### Scenario: Grid shows country from geo fields
- **WHEN** a job listing has LocationTags with `country_code="CA"` and `country_code="US"`
- **THEN** the Country column displays "CA, US"

#### Scenario: Grid shows employment type label
- **WHEN** a job listing has `employment_type="full_time"`
- **THEN** the grid displays "Full-time" in the Type column

#### Scenario: Grid shows workplace type label
- **WHEN** a job listing has `workplace_type="remote"`
- **THEN** the grid displays "Remote" in the Workplace column

#### Scenario: Grid shows team when enabled
- **WHEN** a user enables the Team column via column chooser and a listing has `team="Engineering"`
- **THEN** the Team column displays "Engineering"
