## Why

The Country, Region, and City column filters show composite values like `"US-CA, US-NY"` as a single dropdown option, distinct from `"US-CA"` alone. Users cannot select an individual geo value and see all listings that include it — they must know the exact combined string. This makes geo filtering unreliable for multi-location listings.

## What Changes

- Change the API response to return `country`, `region`, and `city` as JSON arrays instead of comma-joined strings, so each individual geo value is a discrete element.
- Update the frontend Tabulator column definitions for Country, Region, and City to use a custom header filter function that matches any individual value within the array, and a custom `valuesLookup` that extracts unique individual values across all rows.
- Display the array values as comma-separated text in the cell for readability.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `interactive-jobs-table`: Header filter behavior for Country, Region, and City columns changes from exact-match on a joined string to contains-match on individual array elements.
- `location-geo-normalization`: The `GET /api/jobs/` response shape for `country`, `region`, and `city` fields changes from comma-joined string (or null) to JSON array.

## Impact

- `core/views.py` (API response shape change for `country`, `region`, `city`)
- `core/templates/core/jobs.html` (Tabulator column config, filter functions, data transform)
- `core/tests/test_views.py` (API response assertions)
- No backend model or ingestion changes required.
