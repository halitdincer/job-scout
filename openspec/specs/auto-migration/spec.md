## ADDED Requirements

### Requirement: Init container runs migrations
The K8s Deployment SHALL have an init container that runs `python manage.py migrate --noinput` using the same image as the main application container, with access to the same environment variables (DATABASE_URL, SECRET_KEY).

#### Scenario: Successful migration on deploy
- **WHEN** the job-scout pod starts after a new image is deployed
- **THEN** the init container runs migrations to completion before the main container starts

#### Scenario: Migration failure blocks app startup
- **WHEN** the init container's `migrate` command fails (non-zero exit)
- **THEN** the pod remains in `Init:Error` state and the main container does not start
