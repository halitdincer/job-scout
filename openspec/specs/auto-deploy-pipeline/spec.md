## ADDED Requirements

### Requirement: CI workflow named ci.yml
The GitHub Actions workflow SHALL be named `ci.yml` and trigger on pushes to `main` and on pull requests to `main`.

#### Scenario: Workflow triggers on main push
- **WHEN** code is pushed to the `main` branch
- **THEN** the `ci.yml` workflow builds the Docker image and pushes it to GHCR with `latest` and commit SHA tags

#### Scenario: Workflow triggers on PR
- **WHEN** a pull request is opened against `main`
- **THEN** the `ci.yml` workflow builds the Docker image but does not push it

### Requirement: ArgoCD Image Updater auto-deploys
The ArgoCD Image Updater SHALL detect new image digests at `ghcr.io/halitdincer/job-scout:latest` and trigger ArgoCD to redeploy the job-scout application.

#### Scenario: New image triggers redeployment
- **WHEN** a new Docker image is pushed to `ghcr.io/halitdincer/job-scout:latest`
- **THEN** the ArgoCD Image Updater detects the digest change and ArgoCD redeploys the job-scout pods

### Requirement: End-to-end deployment flow documented
The README SHALL document the full deployment pipeline: merge to main → GHA builds/pushes → Image Updater detects → ArgoCD redeploys.

#### Scenario: Deployment flow is documented
- **WHEN** a developer reads the README
- **THEN** they understand how code reaches production

### Requirement: Ingest workflow alongside CI
The system SHALL have a separate `ingest.yml` workflow that operates independently from `ci.yml`. The CI workflow handles build/test/deploy; the ingest workflow handles scheduled data ingestion.

#### Scenario: Ingest workflow does not trigger CI
- **WHEN** the ingest workflow runs on schedule
- **THEN** it only calls the ingest API endpoint and does not trigger a Docker build or deployment
