## MODIFIED Requirements

### Requirement: Trigger ingestion via API
The system SHALL expose `POST /api/runs/` that creates a new Run row with `status="running"`, queues ingestion to a background worker, and returns HTTP 202 with the Run's id, `status="running"`, `started_at`, and zeroed counters. The background worker SHALL update the Run row to its terminal state (`completed` or `failed`) with counters and any `error_message`, observable via `GET /api/runs/`.

#### Scenario: Trigger ingestion successfully
- **WHEN** a POST request is made to `/api/runs/` with a valid API key
- **THEN** a Run is created with `status="running"`, the background worker is spawned, and HTTP 202 is returned with `status="running"`, `finished_at=null`, and all counters at 0

#### Scenario: Response returns before ingestion runs
- **WHEN** a POST is made to `/api/runs/` with a valid API key
- **THEN** the request handler returns before `ingest_sources` is invoked — ingestion is deferred to the background worker so request timeouts (e.g. Cloudflare's 100s edge limit) cannot mark successful scrapes as failures

#### Scenario: Background worker records completion
- **WHEN** the background worker finishes a successful ingestion
- **THEN** the Run row is updated with `status="completed"`, populated counters, and `finished_at` set

#### Scenario: Ingestion fails partially
- **WHEN** the worker runs ingestion and at least one source succeeds but others fail
- **THEN** the Run row is updated with `status="completed"`, an `error_message` listing the failed sources, and counters reflecting the successful sources

#### Scenario: Ingestion fails completely
- **WHEN** the worker runs ingestion and every source fails (or `ingest_sources` raises)
- **THEN** the Run row is updated with `status="failed"` and `error_message` populated

#### Scenario: Stale running runs are reaped on next trigger
- **WHEN** a POST is made to `/api/runs/` and a prior Run is still `status="running"` (e.g. the worker died mid-flight)
- **THEN** the prior Run is updated to `status="failed"` with `error_message="Marked as failed: stale running state"` before the new Run is created
