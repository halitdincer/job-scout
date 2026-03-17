## MODIFIED Requirements

### Requirement: Locations API endpoint
The system SHALL provide a `GET /api/locations/` endpoint returning all LocationTags with their geo fields as JSON.

#### Scenario: List all locations
- **WHEN** a GET request is made to `/api/locations/`
- **THEN** the response is a JSON array where each object has `id`, `name`, `country_code`, `region_code`, `city`, and `geo_key`

#### Scenario: Empty locations
- **WHEN** no LocationTags exist
- **THEN** the response is an empty JSON array

## ADDED Requirements

### Requirement: Jobs API geo computed fields
The `GET /api/jobs/` endpoint SHALL include `region` and `city` computed fields on each job listing object. The `region` field SHALL be a comma-separated string of unique non-null `region_code` values from the listing's LocationTags. The `city` field SHALL be a comma-separated string of unique non-null `city` values from the listing's LocationTags. Both fields SHALL be empty string when no geo data is available, matching the existing `country` field pattern.

#### Scenario: Job with geo-enriched locations
- **WHEN** a job listing has LocationTags with `region_code="CA-ON"`, `city="Toronto"` and `region_code="CA-BC"`, `city="Vancouver"`
- **THEN** the API response includes `"region": "CA-ON, CA-BC"` and `"city": "Toronto, Vancouver"`

#### Scenario: Job with no geo data
- **WHEN** a job listing has LocationTags with all geo fields null
- **THEN** the API response includes `"region": ""` and `"city": ""`

#### Scenario: Job with partial geo data
- **WHEN** a job listing has one LocationTag with `region_code="US-CA"`, `city="San Francisco"` and another with all geo fields null
- **THEN** the API response includes `"region": "US-CA"` and `"city": "San Francisco"`
