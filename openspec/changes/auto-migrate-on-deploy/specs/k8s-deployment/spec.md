## ADDED Requirements

### Requirement: INGEST_API_KEY environment variable
The K8s Deployment SHALL inject the `INGEST_API_KEY` environment variable from the `job-scout-secret` K8s secret into the main application container.

#### Scenario: INGEST_API_KEY available in pod
- **WHEN** the job-scout pod starts
- **THEN** the `INGEST_API_KEY` environment variable is set from the `job-scout-secret` secret
