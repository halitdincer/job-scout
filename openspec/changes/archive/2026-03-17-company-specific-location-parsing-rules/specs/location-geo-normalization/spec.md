## MODIFIED Requirements

### Requirement: Auto-geocode on ingestion
The ingestion pipeline SHALL auto-geocode newly created LocationTags. When `_sync_locations()` creates a new LocationTag via `get_or_create`, it SHALL call `geocode_location()` and populate the tag's `country_code`, `region_code`, and `city` fields before saving. `_sync_locations()` SHALL apply source-aware location normalization before tag creation so geocoding is attempted on parsed single-location tokens for that source profile.

#### Scenario: New location created during ingestion
- **WHEN** a job listing is ingested with a location name that does not yet exist as a LocationTag
- **THEN** a new LocationTag is created with geo fields populated via geocoding

#### Scenario: Existing location reused during ingestion
- **WHEN** a job listing is ingested with a location name that already exists as a LocationTag
- **THEN** the existing tag is reused without re-geocoding

#### Scenario: Geocoding failure during ingestion
- **WHEN** geocoding fails for a new LocationTag
- **THEN** the tag is still created with `name` set but geo fields left null

#### Scenario: Source-aware parsing improves geocode eligibility
- **WHEN** a source-specific profile splits one multi-location raw value into multiple location tokens
- **THEN** geocoding runs for each parsed token instead of a single combined blob
