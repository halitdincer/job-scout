## ADDED Requirements

### Requirement: GitHub Actions ingest workflow
The system SHALL have a GitHub Actions workflow at `.github/workflows/ingest.yml` that triggers on a cron schedule every 4 hours and can also be triggered manually via `workflow_dispatch`.

#### Scenario: Scheduled trigger
- **WHEN** 4 hours have elapsed since the last cron trigger
- **THEN** the workflow runs and calls `POST https://jobs.halitdincer.com/api/runs/` with the API key

#### Scenario: Manual trigger
- **WHEN** a user triggers the workflow manually via GitHub Actions UI
- **THEN** the workflow runs and calls the ingest endpoint

### Requirement: Workflow uses secret for API key
The workflow SHALL read the API key from the `INGEST_API_KEY` GitHub secret and pass it as `Authorization: Bearer <key>` in the curl request.

#### Scenario: API key passed correctly
- **WHEN** the workflow runs
- **THEN** it sends a POST request with the correct Authorization header and receives HTTP 201

### Requirement: Workflow reports failure
The workflow SHALL fail if the curl request returns a non-2xx status code.

#### Scenario: Ingest endpoint returns error
- **WHEN** the curl request returns HTTP 500
- **THEN** the workflow step fails and the workflow is marked as failed
