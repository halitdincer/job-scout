## Context

The job-scout repo is currently empty (just a README). The homeserver-iac repo already has a full K3s deployment for `job-scout` — namespace, deployment, service, PVC, external-secret, ingress at `jobs.halitdincer.com` — but it targets the old Node.js/SQLite stack. We need to set up a Django project from scratch and update the infrastructure to match.

The homeserver runs K3s with ArgoCD, cert-manager (Let's Encrypt), nginx ingress, Vault-backed external-secrets, and local-path storage. Docker images are published to GHCR (`ghcr.io/halitdincer/job-scout`).

## Goals / Non-Goals

**Goals:**
- Django project skeleton that runs locally and in production
- PostgreSQL database for local dev (docker-compose) and production (K3s pod)
- Docker image that builds and pushes to GHCR via GitHub Actions
- Updated K3s manifests for Django + PostgreSQL deployment
- Health check endpoint at `/api/health`

**Non-Goals:**
- Application-specific models, views, or business logic
- Frontend setup (React, templates, etc.)
- CI test pipeline (just build + push for now)
- Custom domain DNS setup (already configured)
- Vault secret population (manual step, documented)

## Decisions

### 1. Django project structure
**Decision:** Single Django project `jobscout` with one initial app `core` (for health check).

**Rationale:** Keeps it minimal. The `core` app holds the health endpoint. Future apps can be added as needed.

**Alternative:** No apps at all — but Django needs at least a URL route for the health check, and an app is the idiomatic way to do it.

### 2. Python version and dependency management
**Decision:** Python 3.13 (latest stable with broad Docker support), pip + `requirements.txt`.

**Rationale:** Simple, well-supported. No need for Poetry/pipenv complexity for this project size. Python 3.14 is installed on the Mac but 3.13 has better Docker base image support.

### 3. PostgreSQL deployment strategy
**Decision:** Run PostgreSQL as a separate Deployment + Service in the same K3s namespace (not a sidecar).

**Rationale:** Separate pod allows independent restarts, resource limits, and PVC management. Sidecar couples lifecycle unnecessarily. A managed DB service would be overkill for a homeserver.

### 4. Production server
**Decision:** Gunicorn with 2 workers, behind nginx ingress.

**Rationale:** Standard Django production setup. Nginx ingress handles TLS and static routing. 2 workers is sufficient for personal-use traffic.

### 5. Port
**Decision:** Serve on port 8000 (Django/Gunicorn default).

**Rationale:** Replaces the old Node.js port 3000. K3s service and ingress will be updated accordingly.

### 6. Static files
**Decision:** `whitenoise` middleware to serve static files directly from Gunicorn.

**Rationale:** No need for a separate nginx container or CDN for a personal project. Whitenoise is the standard Django solution for this.

### 7. Settings management
**Decision:** Single `settings.py` with environment variable overrides for production values (SECRET_KEY, DATABASE_URL, DEBUG, ALLOWED_HOSTS).

**Rationale:** Simple. No need for split settings files at this stage.

### 8. Database connection
**Decision:** Use `dj-database-url` to parse a `DATABASE_URL` environment variable.

**Rationale:** Standard pattern, works cleanly with docker-compose and K3s environment variables.

## Risks / Trade-offs

- **[PostgreSQL adds complexity vs SQLite]** → Worth it for production reliability, concurrent access, and standard Django patterns. Docker-compose makes local setup painless.
- **[No migration from old data]** → The old Node.js app had SQLite data. This is a fresh start — no data migration needed since we're rebuilding.
- **[Single-node PostgreSQL]** → No HA, but acceptable for a personal homeserver. PVC with local-path storage persists data across pod restarts.
- **[Vault secrets need manual setup]** → The external-secret already exists at `secret/job-scout/config` in Vault. We need to add `SECRET_KEY`, `DATABASE_URL` keys. Documented as a manual step.
