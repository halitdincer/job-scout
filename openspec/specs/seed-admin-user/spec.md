## ADDED Requirements

### Requirement: Admin superuser creation via K8s init container
The K8s Deployment SHALL include an init container that runs `python manage.py createsuperuser --noinput` with environment variables `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_USERNAME`, and `DJANGO_SUPERUSER_PASSWORD` sourced from the `job-scout-secret` K8s secret. The container SHALL not block pod startup if the user already exists.

#### Scenario: First deployment creates superuser
- **WHEN** the pod starts for the first time
- **THEN** the init container creates the superuser account and the main container starts

#### Scenario: Subsequent deployments skip user creation
- **WHEN** the pod starts and the superuser already exists
- **THEN** the init container completes without error and the main container starts
