## ADDED Requirements

### Requirement: LocationTag geo fields
The LocationTag model SHALL have nullable fields `country_code` (CharField, max 2, ISO 3166-1 alpha-2), `region_code` (CharField, max 10, format "XX-YY"), and `city` (CharField, max 255) for normalized geographic data.

#### Scenario: LocationTag with full geo mapping
- **WHEN** a LocationTag has `name="Toronto, ON"`, `country_code="CA"`, `region_code="CA-ON"`, `city="Toronto"`
- **THEN** all four fields are accessible and persisted

#### Scenario: LocationTag with partial geo mapping
- **WHEN** a LocationTag has `name="Canada"`, `country_code="CA"`, `region_code=None`, `city=None`
- **THEN** only `country_code` is set; `region_code` and `city` are null

#### Scenario: Unmapped LocationTag
- **WHEN** a LocationTag has `name="Some Office"` with no geo fields set
- **THEN** `country_code`, `region_code`, and `city` are all null

### Requirement: LocationTag geo_key property
The LocationTag model SHALL have a `geo_key` read-only property that returns the most specific hierarchical key. Format: `"CA"` (country only), `"CA-ON"` (country + region), `"CA-ON-Toronto"` (country + region + city). Returns `None` if no geo fields are set.

#### Scenario: geo_key with full mapping
- **WHEN** a LocationTag has `country_code="CA"`, `region_code="CA-ON"`, `city="Toronto"`
- **THEN** `geo_key` returns `"CA-ON-Toronto"`

#### Scenario: geo_key with country only
- **WHEN** a LocationTag has `country_code="US"`, `region_code=None`, `city=None`
- **THEN** `geo_key` returns `"US"`

#### Scenario: geo_key with no geo fields
- **WHEN** a LocationTag has all geo fields null
- **THEN** `geo_key` returns `None`

### Requirement: LocationTag admin geo editing
The Django admin for LocationTag SHALL display `country_code`, `region_code`, and `city` as list-editable fields. The list view SHALL include `list_filter` by `country_code` to enable bulk mapping of unmapped tags.

#### Scenario: Edit geo fields in admin list view
- **WHEN** an admin views the LocationTag list
- **THEN** `country_code`, `region_code`, and `city` columns are editable inline

#### Scenario: Filter unmapped tags
- **WHEN** an admin filters LocationTags by `country_code` with value empty/null
- **THEN** only LocationTags with no `country_code` are shown

### Requirement: Locations API endpoint
The system SHALL provide a `GET /api/locations/` endpoint returning all LocationTags with their geo fields as JSON.

#### Scenario: List all locations
- **WHEN** a GET request is made to `/api/locations/`
- **THEN** the response is a JSON array where each object has `id`, `name`, `country_code`, `region_code`, `city`, and `geo_key`

#### Scenario: Empty locations
- **WHEN** no LocationTags exist
- **THEN** the response is an empty JSON array

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

### Requirement: Auto-geocode on ingestion
The ingestion pipeline SHALL auto-geocode newly created LocationTags. When `_sync_locations()` creates a new LocationTag via `get_or_create`, it SHALL call `geocode_location()` and populate the tag's `country_code`, `region_code`, and `city` fields before saving.

#### Scenario: New location created during ingestion
- **WHEN** a job listing is ingested with a location name that does not yet exist as a LocationTag
- **THEN** a new LocationTag is created with geo fields populated via geocoding

#### Scenario: Existing location reused during ingestion
- **WHEN** a job listing is ingested with a location name that already exists as a LocationTag
- **THEN** the existing tag is reused without re-geocoding

#### Scenario: Geocoding failure during ingestion
- **WHEN** geocoding fails for a new LocationTag
- **THEN** the tag is still created with `name` set but geo fields left null

### Requirement: Backfill geo fields management command
The system SHALL provide a Django management command `backfill_geo` that iterates all LocationTags with null `country_code`, geocodes the `name` field, and populates geo fields. The command SHALL be idempotent, support `--dry-run`, and rate-limit at 1 req/sec.

#### Scenario: Backfill parseable location
- **WHEN** a LocationTag has `name="Toronto, ON, Canada"` and `country_code=None`
- **THEN** after running `backfill_geo`, geo fields are populated

#### Scenario: Skip already-mapped tags
- **WHEN** a LocationTag has `country_code="CA"` already set
- **THEN** `backfill_geo` skips it without modification

#### Scenario: Dry run
- **WHEN** `backfill_geo --dry-run` is run
- **THEN** the command prints what would be updated but does not save changes
