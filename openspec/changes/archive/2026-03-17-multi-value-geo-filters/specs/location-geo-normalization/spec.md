## MODIFIED Requirements

### Requirement: Jobs API geo computed fields
The `GET /api/jobs/` endpoint SHALL include `country`, `region` and `city` computed fields on each job listing object. The `country` field SHALL be a JSON array of unique non-null `country_code` values from the listing's LocationTags, sorted alphabetically. The `region` field SHALL be a JSON array of unique non-null `region_code` values. The `city` field SHALL be a JSON array of unique non-null `city` values. All three fields SHALL be empty arrays when no geo data is available.

#### Scenario: Job with geo-enriched locations
- **WHEN** a job listing has LocationTags with `country_code="CA"`, `region_code="CA-ON"`, `city="Toronto"` and `country_code="CA"`, `region_code="CA-BC"`, `city="Vancouver"`
- **THEN** the API response includes `"country": ["CA"]`, `"region": ["CA-BC", "CA-ON"]` and `"city": ["Toronto", "Vancouver"]`

#### Scenario: Job with no geo data
- **WHEN** a job listing has LocationTags with all geo fields null
- **THEN** the API response includes `"country": []`, `"region": []` and `"city": []`

#### Scenario: Job with partial geo data
- **WHEN** a job listing has one LocationTag with `region_code="US-CA"`, `city="San Francisco"` and another with all geo fields null
- **THEN** the API response includes `"region": ["US-CA"]` and `"city": ["San Francisco"]`
