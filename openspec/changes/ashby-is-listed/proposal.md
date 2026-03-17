## Why

Two gaps in job listing tracking:

1. Ashby's public API returns `isListed` (boolean) on each posting — unlisted jobs should be marked expired rather than staying active.
2. When a listing disappears from the API or is unlisted, we mark it `status="expired"`, but we don't record *when* that happened. An `expired_at` timestamp enables tracking how long jobs stay open.

## What Changes

- Add `expired_at` DateTimeField to `JobListing` (nullable — set when status transitions to `expired`)
- Update `AshbyAdapter` to return `is_listed` from the `isListed` API field
- Update `ingest_sources()` to mark `is_listed=False` listings as expired (with `expired_at`) and set `expired_at` when bulk-expiring missing listings

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `job-listing-model`: Add `expired_at` nullable datetime field
- `platform-adapters`: AshbyAdapter returns `is_listed`; Greenhouse/Lever return `None`

## Impact

- `core/models.py` — new field + migration
- `core/adapters.py` — AshbyAdapter returns `is_listed`
- `core/ingestion.py` — expire unlisted jobs, set `expired_at` on expiration
- `core/views.py` — include `expired_at` in API response
- `core/admin.py` — add `expired_at` to list_display
- `core/templates/core/jobs.html` — display expired_at column
