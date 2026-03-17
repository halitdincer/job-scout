## ADDED Requirements

### Requirement: LocationTag model
The system SHALL have a `LocationTag` model with a unique `name` field (string, max 255). Each tag represents a distinct location string as provided by a job board platform.

#### Scenario: Create a location tag
- **WHEN** a LocationTag is created with `name="Toronto"`
- **THEN** the tag is persisted

#### Scenario: Duplicate location tag rejected
- **WHEN** a LocationTag with `name="Toronto"` already exists and another is created with the same name
- **THEN** an integrity error is raised

#### Scenario: LocationTag string representation
- **WHEN** `str()` is called on a LocationTag with `name="Toronto"`
- **THEN** the result is `"Toronto"`

### Requirement: JobListing locations relationship
The JobListing model SHALL have a many-to-many relationship to LocationTag via the `locations` field. A listing MAY have zero or more locations.

#### Scenario: Listing with multiple locations
- **WHEN** a JobListing is associated with LocationTags "Toronto", "New York", and "San Francisco"
- **THEN** `listing.locations.count()` returns 3

#### Scenario: Shared location tag across listings
- **WHEN** two JobListings from different sources are both associated with the "Toronto" LocationTag
- **THEN** both listings share the same LocationTag instance

### Requirement: Location filter on jobs page
The jobs page SHALL include a location filter dropdown populated with all LocationTags that have at least one associated listing.

#### Scenario: Filter by location
- **WHEN** a user selects "Toronto" from the location filter
- **THEN** only listings that have "Toronto" in their locations are shown
