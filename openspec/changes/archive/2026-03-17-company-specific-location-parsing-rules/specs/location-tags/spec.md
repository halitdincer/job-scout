## MODIFIED Requirements

### Requirement: JobListing locations relationship
The JobListing model SHALL have a many-to-many relationship to LocationTag via the `locations` field. A listing MAY have zero or more locations. The `JobListing.country` field SHALL be removed; country information is derived from LocationTag `country_code`. Before `LocationTag` association, location values SHALL be tokenized by a source-aware normalization layer so each associated tag represents one logical location token for that source.

#### Scenario: Listing with multiple locations
- **WHEN** a JobListing is associated with LocationTags "Toronto", "New York", and "San Francisco"
- **THEN** `listing.locations.count()` returns 3

#### Scenario: Shared location tag across listings
- **WHEN** two JobListings from different sources are both associated with the "Toronto" LocationTag
- **THEN** both listings share the same LocationTag instance

#### Scenario: Source-specific parsing splits Stripe comma blobs
- **WHEN** a Stripe listing location value is `"SF, NYC, CHI, SEA"`
- **THEN** normalization associates separate LocationTags for each parsed token rather than one combined raw tag

#### Scenario: Source-specific parsing preserves Pinterest city-state-country
- **WHEN** a Pinterest listing location value is `"San Francisco, CA, US"`
- **THEN** normalization keeps it as a single location token
