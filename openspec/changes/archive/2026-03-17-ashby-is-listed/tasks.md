## 1. Model and Migration

- [x] 1.1 Add `expired_at` DateTimeField (null=True, blank=True) to JobListing model
- [x] 1.2 Generate migration
- [x] 1.3 Write model tests for expired_at field

## 2. Adapters

- [x] 2.1 Update GreenhouseAdapter to return `is_listed: None`
- [x] 2.2 Update LeverAdapter to return `is_listed: None`
- [x] 2.3 Update AshbyAdapter to return `is_listed` from `isListed` field
- [x] 2.4 Update adapter tests to assert is_listed in all adapters

## 3. Ingestion

- [x] 3.1 Update `_process_source()` to expire `is_listed=False` listings and set `expired_at=now()` in both expiration paths
- [x] 3.2 Update ingestion tests: verify unlisted jobs expire and `expired_at` is set

## 4. API, Admin, and Frontend

- [x] 4.1 Add `expired_at` to `list_jobs` API response
- [x] 4.2 Add `expired_at` to JobListingAdmin list_display
- [x] 4.3 Add Expired At column to jobs.html template
- [x] 4.4 Update tests for API, admin, and pages

## 5. Verification

- [x] 5.1 Run full test suite — all tests pass with 100% coverage
