## Why

The application currently has no domain logic — just a health endpoint. To deliver its core value (alerting users to new job postings), we need a data foundation: models to store job listings, a source registry for company job boards, ingestion logic that fetches listings from platform APIs, and a run tracker that records each ingestion cycle. Scheduled runs via GitHub Actions cron ensure listings stay fresh without manual intervention.

## What Changes

- Add Django models: `Source` (a company's job board on a platform), `JobListing` (individual posting with status tracking), `Run` (tracks each ingestion cycle with timing and counters)
- Add platform adapters for three public job board APIs: Greenhouse, Lever, Ashby — all unauthenticated GET endpoints
- Add a Django management command `ingest` that fetches all active sources and upserts listings
- Add `POST /api/runs/` endpoint (protected by API key) that triggers ingestion and creates a Run record
- Add `GET /api/runs/` endpoint to view run history
- Mark listings as expired when they disappear from the API response
- Add REST API endpoints to list sources and job listings
- Add GitHub Actions scheduled workflow (`ingest.yml`) that runs every 4 hours, calling the ingest endpoint
- Add `requests` as a production dependency

## Capabilities

### New Capabilities
- `source-registry`: CRUD for job board sources — each source ties a company name to a platform (greenhouse/lever/ashby) and a board identifier (slug/token)
- `job-listing-model`: Job listing data model with fields for external ID, title, department, location, URL, and status (active/expired)
- `platform-adapters`: Adapter pattern for fetching and normalizing job listings from Greenhouse, Lever, and Ashby public APIs
- `ingestion-command`: Management command and API endpoint that runs ingestion across all active sources, upserts listings, and marks missing ones as expired
- `run-tracker`: Run data model that records each ingestion cycle with status, timing, and counters (created/updated/expired)
- `scheduled-ingestion`: GitHub Actions cron workflow that triggers ingestion every 4 hours via the API

### Modified Capabilities
- `auto-deploy-pipeline`: Adding the `ingest.yml` workflow alongside `ci.yml`

## Impact

- **New files**: models, views, adapters, management command, migrations, tests, `ingest.yml` workflow
- **Dependencies**: `requests` added to `requirements.txt`
- **Database**: New tables `core_source`, `core_joblisting`, `core_run`
- **API surface**: New endpoints `/api/sources/`, `/api/jobs/`, `/api/runs/`
- **Secrets**: `INGEST_API_KEY` needed in both Vault (for Django) and GitHub secrets (for the cron workflow)
- **CI/CD**: New `ingest.yml` workflow file
