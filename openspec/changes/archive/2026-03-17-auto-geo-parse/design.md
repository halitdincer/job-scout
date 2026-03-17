## Context

LocationTag has geo fields (`country_code`, `region_code`, `city`) added in the geo normalization change, but they're only populated manually via Django admin. The ingestion pipeline in `_sync_locations()` does `get_or_create(name=name)` and leaves geo fields null. Meanwhile, the jobs table only shows raw location names and a `country` column — no region or city columns exist.

## Goals / Non-Goals

**Goals:**
- Auto-populate LocationTag geo fields when new tags are created during ingestion
- Provide a backfill command to geocode all existing unmapped LocationTags
- Surface `region` and `city` as columns in the jobs table

**Non-Goals:**
- Adding geo-based server-side filtering to `/api/jobs/`
- Restructuring the Location column to use geo data instead of raw names
- 100% parse accuracy — best-effort; unparseable names are skipped and can be manually enriched via admin

## Decisions

**1. geopy with Nominatim for geocoding**
`geopy` with Nominatim provides free geocoding without API keys. It returns structured address components (country code, state, city) which map directly to our fields. Alternative considered: manual regex heuristics — rejected because location name formats vary too much across job boards (e.g., "Toronto, ON", "San Francisco, California, United States", "London").

**2. Extract geocoding into `core/geo.py` helper**
Create a `geocode_location(name) -> dict` function that returns `{country_code, region_code, city}` or all-None on failure. Used by both the ingestion pipeline and the backfill command. Keeps geocoding logic in one place.

**3. Geocode at ingestion time in `_sync_locations()`**
When `get_or_create` creates a new LocationTag, immediately geocode the `name` and populate geo fields. New locations are geo-enriched from the first ingestion run. The geocode call adds latency per new tag, but new tags are rare after the initial backfill (most runs reuse existing tags).

**4. Backfill command for existing data**
A `backfill_geo` management command iterates LocationTags with null `country_code`, geocodes each, and saves. Idempotent — skips already-mapped tags. Includes `--dry-run` for preview. Rate-limited at 1 req/sec per Nominatim policy.

**5. Region/City columns follow existing Country pattern**
Compute `region` and `city` fields in the API response the same way as `country` — collect unique non-null values from a listing's LocationTags, comma-join them. Add hidden Tabulator columns with value-list filters. Rename "Location" to "Location (Raw)" for clarity.

## Risks / Trade-offs

- **Nominatim rate limits** — Free Nominatim has a 1 req/sec limit. → Add 1-second delay between geocode calls in the backfill command. Ingestion creates few new tags per run so rate limiting isn't needed there.
- **Parse accuracy** — Some location names are non-geographic (e.g., "Remote", "Multiple Locations"). → Return null fields for unparseable names, log warnings for manual review.
- **Ingestion latency** — Geocoding adds ~1 second per new LocationTag during ingestion. → Acceptable since new tags are rare after initial backfill; most ingestion runs create 0-2 new tags.
- **Nominatim availability** — If Nominatim is down, geocoding fails silently and geo fields stay null. → Tags can be backfilled later or manually enriched via admin.
