## 1. Model Changes

- [x] 1.1 Add `LocationTag` model with unique `name` field and `__str__` method
- [x] 1.2 Add new fields to JobListing: `locations` (M2M to LocationTag), `team`, `employment_type` (choices), `workplace_type` (choices), `country`, `published_at`, `updated_at_source` — remove old `location` CharField
- [x] 1.3 Generate migration that creates LocationTag, adds new fields, migrates existing `location` data to LocationTag M2M, and drops the old `location` column
- [x] 1.4 Write tests for LocationTag model and new JobListing fields

## 2. Adapter Changes

- [x] 2.1 Add normalization helpers: `normalize_employment_type()` and `normalize_workplace_type()` mapping platform values to unified choices
- [x] 2.2 Update GreenhouseAdapter: return `locations` as list, add `published_at`, `updated_at_source`, set `team`/`employment_type`/`workplace_type`/`country` to None
- [x] 2.3 Update LeverAdapter: return `locations` from `allLocations`, add `team`, `employment_type`, `workplace_type`, `country`, `published_at`
- [x] 2.4 Update AshbyAdapter: return `locations` from `location` + `secondaryLocations`, add `team`, `employment_type`, `workplace_type`, `country`, `published_at`
- [x] 2.5 Write/update adapter tests for all new fields, normalization helpers, and multi-location scenarios

## 3. Ingestion Changes

- [x] 3.1 Update `ingest_sources()` to persist new scalar fields and sync LocationTag M2M (get_or_create tags, set on listing)
- [x] 3.2 Write/update ingestion tests for new fields and location tag creation

## 4. API and Frontend Changes

- [x] 4.1 Update `list_jobs` API view to include new fields (locations as list of strings) in JSON response
- [x] 4.2 Update `jobs_page` view to support `workplace_type`, `employment_type`, and `location` query filters
- [x] 4.3 Update `jobs.html` template: replace location column with locations, add columns for workplace type and country, add filter dropdowns
- [x] 4.4 Update `JobListingAdmin` to include new fields in list_display and list_filter; register `LocationTag` in admin
- [x] 4.5 Write/update tests for API, page views, and admin

## 5. Verification

- [x] 5.1 Run full test suite — all tests pass with 100% coverage
