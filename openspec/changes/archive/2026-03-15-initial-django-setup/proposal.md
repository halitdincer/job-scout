## Why

The job-scout project needs to be rebuilt from scratch as a Django application. The existing K3s deployment infrastructure (namespace, ingress at `jobs.halitdincer.com`, ArgoCD app, external-secrets) already exists in `homeserver-iac` but currently targets a Node.js/SQLite stack. This change sets up the Django project foundation, Docker containerization, and updates the homeserver deployment to use Django + PostgreSQL.

## What Changes

- Initialize a Django project with a basic configuration (settings, URLs, wsgi/asgi)
- Set up PostgreSQL as the database (replacing SQLite)
- Create a Dockerfile and docker-compose.yml for local development
- Create a GitHub Actions workflow to build and push the Docker image to GHCR
- Update the existing K3s manifests in `homeserver-iac` for the Django + PostgreSQL stack
- Update the deployment to serve on port 8000 (Gunicorn) instead of 3000

## Capabilities

### New Capabilities
- `django-project`: Django project skeleton with settings, URL config, and Gunicorn production server
- `docker-setup`: Dockerfile, docker-compose.yml for local dev, and CI/CD pipeline for GHCR
- `k8s-deployment`: Updated K3s manifests for Django + PostgreSQL deployment on homeserver

### Modified Capabilities

_None — this is a greenfield setup._

## Impact

- **This repo**: New Django project files, Dockerfile, docker-compose.yml, GitHub Actions workflow
- **homeserver-iac**: Updated K3s manifests (deployment, service, PVC, secret) and kustomization for Django + PostgreSQL
- **Dependencies**: Python 3.14, Django, psycopg, Gunicorn, PostgreSQL 16
- **Infrastructure**: Existing `job-scout` namespace and `jobs.halitdincer.com` ingress remain; deployment config changes to target Django container on port 8000 with PostgreSQL sidecar or separate pod
