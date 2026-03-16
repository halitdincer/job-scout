## ADDED Requirements

### Requirement: Ingest management command
The system SHALL provide a Django management command `ingest` that fetches listings from all active sources, upserts job listings, and marks expired listings. The management command is a lightweight alternative to the API endpoint and does not create a Run record.

#### Scenario: Ingest all active sources
- **WHEN** `python manage.py ingest` is run with two active sources
- **THEN** listings are fetched from both sources and upserted into the database

#### Scenario: Inactive sources are skipped
- **WHEN** `python manage.py ingest` is run and one source has `is_active=False`
- **THEN** that source is not fetched

### Requirement: Ingest single source
The management command SHALL accept an optional `--source-id` argument to ingest only one specific source.

#### Scenario: Ingest specific source
- **WHEN** `python manage.py ingest --source-id 1` is run
- **THEN** only the source with id 1 is fetched

#### Scenario: Source not found
- **WHEN** `python manage.py ingest --source-id 999` is run and no source with id 999 exists
- **THEN** the command exits with an error message

### Requirement: Upsert listings
During ingestion, the system SHALL create new listings for external IDs not yet in the database and update `title`, `department`, `location`, `url`, `last_seen_at` for existing listings.

#### Scenario: New listing created
- **WHEN** a fetched listing has an external_id not in the database for that source
- **THEN** a new JobListing is created with `status="active"` and `first_seen_at` set to now

#### Scenario: Existing listing updated
- **WHEN** a fetched listing has an external_id that already exists for that source
- **THEN** the existing JobListing's `title`, `department`, `location`, `url`, and `last_seen_at` are updated

### Requirement: Mark expired listings
After ingesting a source, any active listings for that source whose `external_id` was NOT in the fetched results SHALL be marked as `status="expired"`.

#### Scenario: Listing disappears from API
- **WHEN** a previously active listing's external_id is not in the latest fetch results
- **THEN** that listing's status is changed to `"expired"`

#### Scenario: Already expired listings stay expired
- **WHEN** a listing is already `status="expired"` and is not in the fetch results
- **THEN** its status remains `"expired"` (no unnecessary update)

### Requirement: Ingestion continues on source failure
If fetching a source fails (HTTP error, network error), the system SHALL log the error and continue to the next source instead of aborting.

#### Scenario: One source fails
- **WHEN** ingestion is run for 3 sources and the second source's API returns an error
- **THEN** the first and third sources are ingested successfully, and the error is logged

### Requirement: Shared ingestion function
The ingestion logic (fetch, upsert, expire) SHALL be in a shared function callable from both the management command and the API view. The function SHALL accept a queryset of sources and return a dict with counters: `sources_processed`, `listings_created`, `listings_updated`, `listings_expired`, and `errors` (list of error messages).

#### Scenario: Ingestion function returns counters
- **WHEN** the ingestion function processes 2 sources with 5 new listings and 1 expired
- **THEN** it returns `{"sources_processed": 2, "listings_created": 5, "listings_updated": 0, "listings_expired": 1, "errors": []}`
