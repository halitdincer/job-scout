## Context

LocationTag currently stores only a raw `name` string from job board platforms. JobListing has a flat `country` field populated by some adapters. There's no way to do hierarchical geo filtering (e.g., "show all Canadian jobs" including Toronto, Vancouver, etc.). The raw platform strings have no consistent format across Greenhouse, Lever, and Ashby.

## Goals / Non-Goals

**Goals:**
- Add structured geo fields to LocationTag so each raw location string can be mapped to a country/region/city
- Enable hierarchical filtering: selecting "Canada" shows all jobs with LocationTags mapped to CA-*
- Provide a Django admin UI for manually mapping LocationTags to geo entities
- Preserve raw location strings as-is (no modification to adapter output)
- Remove redundant `JobListing.country` field

**Non-Goals:**
- Automatic geocoding / geo-inference (manual mapping only for now)
- Handling "Remote" as a location (separate concern — workplace_type)
- Geo search autocomplete on the frontend (future enhancement)
- Changing adapter output format

## Decisions

### D1: Add fields to LocationTag rather than a separate GeoEntity model

Rationale: LocationTag already has a 1:1 conceptual relationship with a geo location. Adding `country_code`, `region_code`, and `city` directly avoids an extra join and keeps the model simple. If the geo hierarchy becomes complex later, we can refactor.

Fields:
```
LocationTag
├── name: CharField (existing, raw platform string)
├── country_code: CharField(max_length=2, null, blank) — ISO 3166-1 alpha-2
├── region_code: CharField(max_length=10, null, blank) — format: "CA-ON", "US-NY"
├── city: CharField(max_length=255, null, blank)
```

### D2: Drop JobListing.country, derive from LocationTag

The current `JobListing.country` field is populated inconsistently (only Lever and Ashby). Once LocationTags have `country_code`, the flat field is redundant. Remove it and derive country from the M2M through LocationTag.

Migration strategy: Before dropping the column, migrate any existing `country` values to the corresponding LocationTag's `country_code` where possible (best-effort data migration).

### D3: API response changes

`/api/jobs/` changes the `locations` field from a flat string array to an array of objects:
```json
{
  "locations": [
    {
      "name": "Toronto, ON",
      "country_code": "CA",
      "region_code": "CA-ON",
      "city": "Toronto"
    }
  ]
}
```

Remove the top-level `country` field from the response.

New endpoint `GET /api/locations/` returns all LocationTags with geo fields for populating filter dropdowns:
```json
[
  {"id": 1, "name": "Toronto, ON", "country_code": "CA", "region_code": "CA-ON", "city": "Toronto"},
  {"id": 2, "name": "New York, NY", "country_code": "US", "region_code": "US-NY", "city": "New York"}
]
```

### D4: Admin mapping UI

Use Django admin's built-in field editing. Add `country_code`, `region_code`, `city` to `LocationTagAdmin.list_display` and `list_editable` so tags can be mapped in bulk from the list view. Add `list_filter` by `country_code` to group unmapped tags.

### D5: Frontend geo filtering

Add a "Normalized Location" column to the grid showing `city, region_code` or `country_code` (the most specific available). The existing "Locations" column keeps showing raw strings.

For filtering, the Country column filter uses `country_code` values from LocationTags (via the M2M). This enables "select CA → see all Canadian jobs" behavior through AG Grid's set filter.

### D6: Geo key format

Use a hierarchical key format for filtering convenience:
- Country only: `CA`
- Country + region: `CA-ON`
- Country + region + city: `CA-ON-Toronto`

This is a computed property on LocationTag, not a stored field. Derived from the most specific fields available.

## Risks / Trade-offs

- **Manual mapping burden**: Every new LocationTag needs manual geo mapping in the admin. Mitigated by: most job boards reuse the same location strings, so the unique set grows slowly. Future enhancement could add auto-suggestion.
- **Breaking API change**: Removing `country` and changing `locations` format will break any clients depending on the current shape. Mitigated by: no external consumers — only the internal jobs grid.
- **Nullable geo fields**: Unmapped LocationTags will have null geo fields, meaning some jobs won't appear in geo-filtered results. This is acceptable — mapping happens incrementally.
