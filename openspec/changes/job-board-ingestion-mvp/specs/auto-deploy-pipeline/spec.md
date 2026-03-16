## ADDED Requirements

### Requirement: Ingest workflow alongside CI
The system SHALL have a separate `ingest.yml` workflow that operates independently from `ci.yml`. The CI workflow handles build/test/deploy; the ingest workflow handles scheduled data ingestion.

#### Scenario: Ingest workflow does not trigger CI
- **WHEN** the ingest workflow runs on schedule
- **THEN** it only calls the ingest API endpoint and does not trigger a Docker build or deployment
