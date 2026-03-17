## ADDED Requirements

### Requirement: Geocoding helper module
The system SHALL provide a `core/geo.py` module with a `geocode_location(name: str)` function that uses geopy's Nominatim geocoder to parse a location name into `country_code` (ISO 3166-1 alpha-2), `region_code` (format "XX-YY"), and `city`. The function SHALL return a dict with all three keys, using None for any field that cannot be determined. The function SHALL return all-None values if geocoding fails entirely.

#### Scenario: Parse full location
- **WHEN** `geocode_location("Toronto, ON, Canada")` is called
- **THEN** it returns `{"country_code": "CA", "region_code": "CA-ON", "city": "Toronto"}`

#### Scenario: Parse country only
- **WHEN** `geocode_location("United States")` is called
- **THEN** it returns `{"country_code": "US", "region_code": None, "city": None}`

#### Scenario: Unparseable location
- **WHEN** `geocode_location("Remote")` is called and Nominatim returns no result
- **THEN** it returns `{"country_code": None, "region_code": None, "city": None}`

### Requirement: Auto-geocode on ingestion
The ingestion pipeline SHALL auto-geocode newly created LocationTags. When `_sync_locations()` creates a new LocationTag via `get_or_create`, it SHALL call `geocode_location()` and populate the tag's `country_code`, `region_code`, and `city` fields before saving.

#### Scenario: New location created during ingestion
- **WHEN** a job listing is ingested with a location name "Vancouver, BC, Canada" that does not yet exist as a LocationTag
- **THEN** a new LocationTag is created with `name="Vancouver, BC, Canada"`, `country_code="CA"`, `region_code="CA-BC"`, `city="Vancouver"`

#### Scenario: Existing location reused during ingestion
- **WHEN** a job listing is ingested with a location name that already exists as a LocationTag
- **THEN** the existing tag is reused without re-geocoding

#### Scenario: Geocoding failure during ingestion
- **WHEN** geocoding fails for a new LocationTag
- **THEN** the tag is still created with `name` set but geo fields left null

### Requirement: Backfill geo fields management command
The system SHALL provide a Django management command `backfill_geo` that iterates all LocationTags with null `country_code`, geocodes the `name` field using `geocode_location()`, and populates geo fields. The command SHALL be idempotent — only updating tags where geo fields are currently null.

#### Scenario: Backfill parseable location
- **WHEN** a LocationTag has `name="Toronto, ON, Canada"` and `country_code=None`
- **THEN** after running `backfill_geo`, `country_code="CA"`, `region_code="CA-ON"`, `city="Toronto"` are set

#### Scenario: Backfill country-only location
- **WHEN** a LocationTag has `name="United States"` and `country_code=None`
- **THEN** after running `backfill_geo`, `country_code="US"` is set, `region_code` and `city` remain null

#### Scenario: Skip already-mapped tags
- **WHEN** a LocationTag has `country_code="CA"` already set
- **THEN** `backfill_geo` skips it without modification

#### Scenario: Skip unparseable location
- **WHEN** a LocationTag has `name="Remote"` which cannot be geocoded
- **THEN** `backfill_geo` logs a warning and leaves geo fields null

### Requirement: Dry-run mode
The `backfill_geo` command SHALL accept a `--dry-run` flag that prints what would be updated without writing to the database.

#### Scenario: Dry run output
- **WHEN** `backfill_geo --dry-run` is run with unmapped LocationTags
- **THEN** the command prints each tag name and the geo values it would set, but does not save changes

### Requirement: Rate limiting
The `backfill_geo` command SHALL wait at least 1 second between geocode API calls to respect Nominatim's usage policy.

#### Scenario: Multiple tags geocoded
- **WHEN** 5 unmapped LocationTags exist
- **THEN** the command takes at least 4 seconds to complete (1-second delay between calls)
