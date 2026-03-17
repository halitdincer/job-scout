## 1. Geocoding helper — `core/geo.py`

- [x] 1.1 Add `geopy` to `requirements.txt`
- [x] 1.2 Write tests for `geocode_location()` (full parse, country-only, unparseable scenarios)
- [x] 1.3 Implement `core/geo.py` with `geocode_location(name)` using Nominatim

## 2. Ingestion — Auto-geocode new LocationTags

- [x] 2.1 Write tests for ingestion auto-geocoding (new tag gets geo fields, existing tag not re-geocoded, geocode failure leaves nulls)
- [x] 2.2 Update `_sync_locations()` in `core/ingestion.py` to call `geocode_location()` on newly created tags

## 3. Backfill — Management command for existing data

- [x] 3.1 Write tests for `backfill_geo` command (parseable, already-mapped, unparseable, dry-run scenarios)
- [x] 3.2 Implement `core/management/commands/backfill_geo.py` with rate limiting and `--dry-run` flag
- [ ] 3.3 Run `backfill_geo --dry-run` against real data to verify results (requires deployed DB)

## 4. API — Add region and city computed fields

- [x] 4.1 Write tests for `region` and `city` fields in `/api/jobs/` response
- [x] 4.2 Add `region` and `city` computed fields to `list_jobs` view in `core/views.py`

## 5. Frontend — Add Region and City columns to Tabulator grid

- [x] 5.1 Add `region` and `city` to the data transform in `jobs.html`
- [x] 5.2 Add Region and City columns to Tabulator config (hidden, value-list filter)
- [x] 5.3 Rename "Location" column title to "Location (Raw)"

## 6. Specs — Sync base specs with delta changes

- [x] 6.1 Sync `openspec/specs/interactive-jobs-table/spec.md` with delta spec
- [x] 6.2 Sync `openspec/specs/location-geo-normalization/spec.md` with delta spec

## 7. Verify

- [x] 7.1 Run full test suite and confirm all tests pass
