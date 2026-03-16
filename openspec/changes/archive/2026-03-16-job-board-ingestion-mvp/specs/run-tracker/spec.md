## ADDED Requirements

### Requirement: Run model
The system SHALL have a `Run` model with fields: `status` (choice of `pending`, `running`, `completed`, `failed`, default `pending`), `started_at` (nullable datetime), `finished_at` (nullable datetime), `sources_processed` (integer, default 0), `listings_created` (integer, default 0), `listings_updated` (integer, default 0), `listings_expired` (integer, default 0), `error_message` (text, nullable), and `created_at` timestamp.

#### Scenario: Create a pending run
- **WHEN** a Run is created with no arguments
- **THEN** it is persisted with `status="pending"`, all counters at 0, and `started_at`/`finished_at` as null

#### Scenario: Run transitions to completed
- **WHEN** a Run's status is set to `"completed"` with `finished_at` set
- **THEN** the counters reflect the ingestion results

### Requirement: Run string representation
The system SHALL represent a Run as `"Run #{id} ({status})"` when converted to string.

#### Scenario: Run str
- **WHEN** `str()` is called on a Run with `id=5` and `status="completed"`
- **THEN** the result is `"Run #5 (completed)"`

### Requirement: List runs API
The system SHALL expose `GET /api/runs/` that returns all runs as a JSON array ordered by `created_at` descending, with fields: `id`, `status`, `started_at`, `finished_at`, `sources_processed`, `listings_created`, `listings_updated`, `listings_expired`, `error_message`, `created_at`.

#### Scenario: List all runs
- **WHEN** a GET request is made to `/api/runs/`
- **THEN** the response is HTTP 200 with a JSON array of all runs, most recent first

### Requirement: Trigger ingestion via API
The system SHALL expose `POST /api/runs/` that creates a new Run, executes ingestion, updates the Run with results, and returns the completed Run as JSON.

#### Scenario: Trigger ingestion successfully
- **WHEN** a POST request is made to `/api/runs/` with a valid API key
- **THEN** a Run is created, ingestion executes, the Run is updated to `status="completed"` with counters, and HTTP 201 is returned

#### Scenario: Ingestion fails partially
- **WHEN** a POST triggers ingestion and one source fails
- **THEN** the Run is still `status="completed"` with an `error_message` noting the failed source, and counters reflect the successful sources

#### Scenario: Ingestion fails completely
- **WHEN** a POST triggers ingestion and all sources fail
- **THEN** the Run is updated to `status="failed"` with `error_message` and HTTP 201 is returned

### Requirement: API key authentication for POST /api/runs/
The `POST /api/runs/` endpoint SHALL require an `Authorization: Bearer <token>` header where the token matches the `INGEST_API_KEY` environment variable.

#### Scenario: Valid API key
- **WHEN** a POST is made with `Authorization: Bearer <correct-key>`
- **THEN** ingestion proceeds normally

#### Scenario: Missing API key
- **WHEN** a POST is made without an Authorization header
- **THEN** HTTP 401 is returned with an error message

#### Scenario: Invalid API key
- **WHEN** a POST is made with `Authorization: Bearer wrong-key`
- **THEN** HTTP 401 is returned with an error message

### Requirement: GET /api/runs/ does not require authentication
The `GET /api/runs/` endpoint SHALL be publicly accessible without authentication.

#### Scenario: List runs without auth
- **WHEN** a GET request is made to `/api/runs/` without an Authorization header
- **THEN** HTTP 200 is returned with the runs list
