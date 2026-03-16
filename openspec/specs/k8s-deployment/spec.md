## ADDED Requirements

### Requirement: Django deployment manifest
The K3s deployment SHALL run the Django container (`ghcr.io/halitdincer/job-scout:latest`) with Gunicorn on port 8000, with environment variables for `DATABASE_URL`, `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS` sourced from the existing external-secret.

#### Scenario: Deployment runs Django container
- **WHEN** the deployment is applied to K3s
- **THEN** a pod runs with the Django container serving on port 8000

#### Scenario: Health checks work
- **WHEN** the pod is running
- **THEN** liveness and readiness probes hit `/api/health` on port 8000

### Requirement: PostgreSQL deployment
The K3s namespace SHALL include a PostgreSQL 16 deployment with a PersistentVolumeClaim for data storage.

#### Scenario: PostgreSQL pod runs
- **WHEN** the PostgreSQL deployment is applied
- **THEN** a PostgreSQL 16 pod starts with data stored on a PVC

#### Scenario: Django connects to PostgreSQL
- **WHEN** both deployments are running
- **THEN** the Django container connects to PostgreSQL via the `postgres` service on port 5432

### Requirement: Service configuration
The K3s namespace SHALL have services for both Django (port 8000) and PostgreSQL (port 5432).

#### Scenario: Django service routes to pod
- **WHEN** a request is sent to the `job-scout` service on port 8000
- **THEN** it is routed to the Django container

#### Scenario: PostgreSQL service routes to pod
- **WHEN** a connection is made to the `postgres` service on port 5432
- **THEN** it is routed to the PostgreSQL container

### Requirement: Ingress unchanged
The existing ingress at `jobs.halitdincer.com` SHALL be updated only to point to port 8000 instead of port 3000.

#### Scenario: Ingress routes to Django
- **WHEN** a request hits `jobs.halitdincer.com`
- **THEN** it is routed to the `job-scout` service on port 8000

### Requirement: Vault secrets updated
The Vault path `secret/job-scout/config` SHALL contain `SECRET_KEY`, `DATABASE_URL`, and `ALLOWED_HOSTS` keys for the Django application.

#### Scenario: External secret resolves
- **WHEN** the external-secret syncs from Vault
- **THEN** the Kubernetes secret contains `SECRET_KEY`, `DATABASE_URL`, and `ALLOWED_HOSTS`

### Requirement: INGEST_API_KEY environment variable
The K8s Deployment SHALL inject the `INGEST_API_KEY` environment variable from the `job-scout-secret` K8s secret into the main application container.

#### Scenario: INGEST_API_KEY available in pod
- **WHEN** the job-scout pod starts
- **THEN** the `INGEST_API_KEY` environment variable is set from the `job-scout-secret` secret
