## MODIFIED Requirements

### Requirement: LocationTag model
The system SHALL have a `LocationTag` model with a unique `name` field (string, max 255), plus nullable `country_code` (CharField, max 2), `region_code` (CharField, max 10), and `city` (CharField, max 255) fields. Each tag represents a distinct location string as provided by a job board platform, optionally mapped to a normalized geographic entity.

#### Scenario: Create a location tag
- **WHEN** a LocationTag is created with `name="Toronto"`
- **THEN** the tag is persisted with geo fields defaulting to null

#### Scenario: Duplicate location tag rejected
- **WHEN** a LocationTag with `name="Toronto"` already exists and another is created with the same name
- **THEN** an integrity error is raised

#### Scenario: LocationTag string representation
- **WHEN** `str()` is called on a LocationTag with `name="Toronto"`
- **THEN** the result is `"Toronto"`

### Requirement: JobListing locations relationship
The JobListing model SHALL have a many-to-many relationship to LocationTag via the `locations` field. A listing MAY have zero or more locations. The `JobListing.country` field SHALL be removed; country information is derived from LocationTag `country_code`.

#### Scenario: Listing with multiple locations
- **WHEN** a JobListing is associated with LocationTags "Toronto", "New York", and "San Francisco"
- **THEN** `listing.locations.count()` returns 3

#### Scenario: Shared location tag across listings
- **WHEN** two JobListings from different sources are both associated with the "Toronto" LocationTag
- **THEN** both listings share the same LocationTag instance

## REMOVED Requirements

### Requirement: Location filter on jobs page
**Reason**: Replaced by geo-based hierarchical filtering defined in the `interactive-jobs-table` spec.
**Migration**: Use the new Country column set filter which filters through LocationTag geo fields.
