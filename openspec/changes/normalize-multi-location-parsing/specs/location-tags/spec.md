## MODIFIED Requirements

### Requirement: LocationTag model
The system SHALL have a `LocationTag` model with a unique `name` field (string, max 255), plus nullable `country_code` (CharField, max 2), `region_code` (CharField, max 10), and `city` (CharField, max 255) fields. Each tag SHALL represent one logical location token after adapter and ingestion normalization, not a serialized payload object.

#### Scenario: Create a location tag
- **WHEN** a LocationTag is created with `name="Toronto"`
- **THEN** the tag is persisted with geo fields defaulting to null

#### Scenario: Duplicate location tag rejected
- **WHEN** a LocationTag with `name="Toronto"` already exists and another is created with the same name
- **THEN** an integrity error is raised

#### Scenario: LocationTag string representation
- **WHEN** `str()` is called on a LocationTag with `name="Toronto"`
- **THEN** the result is `"Toronto"`

## ADDED Requirements

### Requirement: Composite location splitting during ingestion
Before creating or associating `LocationTag` records, ingestion SHALL split known composite location patterns into individual location tokens and de-duplicate them. Splitting SHALL support semicolon-delimited values, slash-delimited values with surrounding spaces, and standalone `or` separators.

#### Scenario: Split semicolon-delimited locations
- **WHEN** ingestion receives a location value `"New York, NY, US; Chicago, IL, US"`
- **THEN** the listing is associated with separate `LocationTag` values `"New York, NY, US"` and `"Chicago, IL, US"`

#### Scenario: Split slash-delimited locations
- **WHEN** ingestion receives a location value `"Chicago / Remote"`
- **THEN** the listing is associated with separate `LocationTag` values `"Chicago"` and `"Remote"`

#### Scenario: Split or-delimited locations
- **WHEN** ingestion receives a location value `"San Francisco or New York"`
- **THEN** the listing is associated with separate `LocationTag` values `"San Francisco"` and `"New York"`

#### Scenario: Do not split city-state comma form
- **WHEN** ingestion receives a location value `"Toronto, ON"`
- **THEN** ingestion keeps it as a single location token
