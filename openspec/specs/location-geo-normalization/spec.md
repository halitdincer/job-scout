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
