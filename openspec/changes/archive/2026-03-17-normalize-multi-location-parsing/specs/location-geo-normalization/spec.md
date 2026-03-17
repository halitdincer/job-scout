## MODIFIED Requirements

### Requirement: Auto-geocode on ingestion
The ingestion pipeline SHALL auto-geocode newly created `LocationTag` values after location normalization. When `_sync_locations()` creates a new `LocationTag` via `get_or_create`, it SHALL call `geocode_location()` and populate the tag's `country_code`, `region_code`, and `city` fields before saving.

#### Scenario: New normalized location created during ingestion
- **WHEN** a job listing is ingested with a normalized location token that does not yet exist as a `LocationTag`
- **THEN** a new `LocationTag` is created with geo fields populated via geocoding

#### Scenario: Existing normalized location reused during ingestion
- **WHEN** a job listing is ingested with a normalized location token that already exists as a `LocationTag`
- **THEN** the existing tag is reused without re-geocoding

#### Scenario: Composite location input creates multiple geocode attempts
- **WHEN** a composite raw location string is split into multiple normalized tokens
- **THEN** each newly created normalized token is geocoded independently

#### Scenario: Geocoding failure during ingestion
- **WHEN** geocoding fails for a new normalized `LocationTag`
- **THEN** the tag is still created with `name` set but geo fields left null

## ADDED Requirements

### Requirement: Geo backfill after location remediation
After malformed/composite location remediation creates new normalized `LocationTag` values, those tags SHALL be eligible for the existing `backfill_geo` command and SHALL follow the same idempotent geocoding behavior.

#### Scenario: Remediation-generated tag is geocoded by backfill
- **WHEN** remediation creates a new `LocationTag` with null `country_code`
- **THEN** running `backfill_geo` can populate geo fields for that tag
