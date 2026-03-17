## Why

Location data from job boards arrives as free-text strings ("Toronto, ON", "New York, NY", "Remote - Canada") with no standard format. There's no way to filter hierarchically — searching for "Canada" won't surface Toronto-based jobs. Adding structured geo fields (country, region, city) to `LocationTag` enables hierarchical location filtering while preserving the raw platform strings.

## What Changes

- Add `country_code`, `region_code`, and `city` fields to `LocationTag` for normalized geo data
- Add a `geo_key` computed property for hierarchical filtering (format: `CA`, `CA-ON`, `CA-ON-Toronto`)
- Update the `/api/jobs/` response to include normalized geo fields alongside raw location names
- Add a `/api/locations/` endpoint returning all LocationTags with their geo mappings
- Add a Django admin interface for manually mapping LocationTags to geo entities
- Update the jobs grid to show a "Normalized Location" column and support geo-based filtering
- Remove the flat `country` field from `JobListing` (redundant once LocationTag has `country_code`)  **BREAKING**

## Capabilities

### New Capabilities
- `location-geo-normalization`: Structured geo fields on LocationTag, admin mapping UI, and the /api/locations/ endpoint

### Modified Capabilities
- `location-tags`: LocationTag gains `country_code`, `region_code`, `city` fields; `JobListing.country` removed
- `enriched-listing-display`: Jobs grid gains a normalized location column and geo-based filtering
- `interactive-jobs-table`: Location filter uses normalized geo hierarchy instead of raw strings

## Impact

- **Models**: `LocationTag` gets 3 new nullable fields; `JobListing.country` dropped (migration needed)
- **API**: `/api/jobs/` response shape changes (location objects instead of flat `country`); new `/api/locations/` endpoint
- **Admin**: LocationTag admin gains editable geo fields
- **Frontend**: Jobs grid gets new column and updated filter behavior
- **Adapters**: No changes — they continue outputting raw location strings
