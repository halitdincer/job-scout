## Why

LocationTag has `country_code`, `region_code`, and `city` fields but they're only populated manually via Django admin. The adapters extract raw location strings from job boards and some even return a `country` field that gets discarded. Every new LocationTag starts with null geo fields — there's no automated parsing.

## What Changes

- Create a `core/geo.py` helper that geocodes a location name into structured geo fields using geopy/Nominatim
- Auto-geocode new LocationTags during ingestion in `_sync_locations()`
- Add a `backfill_geo` management command to retroactively parse all existing unmapped LocationTags
- Add Region and City columns to the Tabulator jobs table (hidden by default) and expose `region`/`city` computed fields in the `/api/jobs/` response

## Capabilities

### New Capabilities

- `auto-geo-parse`: Automatic geocoding of LocationTag names during ingestion and via backfill command

### Modified Capabilities

- `interactive-jobs-table`: Add Region and City columns; rename Location to Location (Raw)
- `location-geo-normalization`: Add `region` and `city` computed fields to jobs API response; auto-populate geo fields on ingestion

## Impact

- `core/geo.py` — new geocoding helper module
- `core/ingestion.py` — `_sync_locations()` triggers geocoding for newly created LocationTags
- `core/management/commands/backfill_geo.py` — new management command for existing data
- `core/views.py` — `list_jobs` adds `region` and `city` computed fields
- `core/templates/core/jobs.html` — Tabulator config adds Region/City columns, renames Location
- `requirements.txt` — add `geopy`
- `core/tests/` — ingestion geo tests, backfill command tests, API field tests
