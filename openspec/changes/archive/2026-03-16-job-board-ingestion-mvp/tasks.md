## 1. Dependencies

- [x] 1.1 Add `requests>=2.32,<3` to `requirements.txt` and install via `pip install -r requirements-dev.txt`

## 2. Models (TDD: write tests first)

- [x] 2.1 Write tests for Source model in `core/tests/test_models.py`: creation, str representation, platform choices validation, unique constraint on (platform, board_id)
- [x] 2.2 Write tests for JobListing model: creation with defaults, str representation, unique constraint on (source, external_id), status field defaults
- [x] 2.3 Write tests for Run model: creation with defaults, str representation, status transitions, counter fields
- [x] 2.4 Implement `Source`, `JobListing`, and `Run` models in `core/models.py`
- [x] 2.5 Create and run migration

## 3. Platform Adapters (TDD: write tests first)

- [x] 3.1 Write tests for adapter registry in `core/tests/test_adapters.py`: get adapter by platform slug, unknown platform raises ValueError
- [x] 3.2 Write tests for Greenhouse adapter: mocked HTTP response, normalized output, empty departments handling, HTTP error handling
- [x] 3.3 Write tests for Lever adapter: mocked HTTP response, normalized output, missing department handling, HTTP error handling
- [x] 3.4 Write tests for Ashby adapter: mocked HTTP response, normalized output, HTTP error handling
- [x] 3.5 Implement adapter base, registry, and Greenhouse/Lever/Ashby adapters in `core/adapters.py`

## 4. Ingestion Logic (TDD: write tests first)

- [x] 4.1 Write tests for shared ingestion function in `core/tests/test_ingestion.py`: new listings created, existing listings updated, missing listings marked expired, already-expired unchanged, returns counters dict, continues on source failure
- [x] 4.2 Implement shared ingestion function in `core/ingestion.py`
- [x] 4.3 Write tests for `ingest` management command in `core/tests/test_commands.py`: all sources ingested, inactive skipped, --source-id flag, source not found error, outputs errors
- [x] 4.4 Implement `ingest` management command at `core/management/commands/ingest.py`

## 5. API Views (TDD: write tests first)

- [x] 5.1 Add tests for `GET /api/sources/` in `core/tests/test_views.py` — returns list of sources
- [x] 5.2 Add tests for `GET /api/jobs/` — returns list of listings, filter by source_id, filter by status
- [x] 5.3 Add tests for `GET /api/runs/` — returns list of runs ordered by created_at desc
- [x] 5.4 Add tests for `POST /api/runs/` — triggers ingestion, creates Run, returns 201; test API key auth (valid, missing, invalid), test completed/failed run states
- [x] 5.5 Implement source, job listing, and run views in `core/views.py`
- [x] 5.6 Add URL routes in `core/urls.py`

## 6. GitHub Actions Ingest Workflow

- [x] 6.1 Create `.github/workflows/ingest.yml` with cron schedule (every 4 hours), workflow_dispatch, curl to POST /api/runs/ with INGEST_API_KEY secret

## 7. Configuration and Documentation

- [x] 7.1 Add `INGEST_API_KEY` to `jobscout/settings.py` reading from environment variable
- [x] 7.2 Update README with new API endpoints, management command usage, and INGEST_API_KEY secret setup
- [x] 7.3 Document `INGEST_API_KEY` in Vault secrets table in README

## 8. Coverage and Verification

- [x] 8.1 Run `pytest` — all tests pass with 100% coverage
- [x] 8.2 Run `python manage.py migrate` — migration applies cleanly (verified via test DB)
