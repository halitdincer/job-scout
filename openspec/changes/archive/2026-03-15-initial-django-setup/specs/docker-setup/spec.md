## ADDED Requirements

### Requirement: Dockerfile for production
The system SHALL have a multi-stage Dockerfile that produces a minimal production image with Django, Gunicorn, and all dependencies installed.

#### Scenario: Docker image builds successfully
- **WHEN** `docker build -t job-scout .` is run from the project root
- **THEN** a Docker image is created that runs the Django application via Gunicorn on port 8000

#### Scenario: Docker container starts and serves requests
- **WHEN** the Docker container is started
- **THEN** the health check at `/api/health` returns HTTP 200

### Requirement: docker-compose for local development
The system SHALL have a `docker-compose.yml` that starts both the Django application and a PostgreSQL database for local development.

#### Scenario: Local stack starts with docker-compose
- **WHEN** `docker compose up` is run from the project root
- **THEN** PostgreSQL starts on port 5432 and Django starts on port 8000, connected to the PostgreSQL database

#### Scenario: Database data persists across restarts
- **WHEN** `docker compose down` and `docker compose up` are run
- **THEN** PostgreSQL data is preserved via a named volume

### Requirement: GitHub Actions CI/CD pipeline
The system SHALL have a GitHub Actions workflow that builds the Docker image and pushes it to `ghcr.io/halitdincer/job-scout` on pushes to the `main` branch.

#### Scenario: Image pushed on main branch push
- **WHEN** code is pushed to the `main` branch
- **THEN** GitHub Actions builds the Docker image and pushes it to GHCR with `latest` and commit SHA tags

#### Scenario: PR builds do not push
- **WHEN** a pull request is opened
- **THEN** the Docker image is built (to verify it works) but not pushed to GHCR
