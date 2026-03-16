## Context

The job-scout app runs on K3s as a single-replica Deployment with Recreate strategy. PostgreSQL runs as a separate Deployment with PVC. Secrets are managed via Vault → ExternalSecret → K8s Secret (`job-scout-secret`). The app image is `ghcr.io/halitdincer/job-scout:latest`, built and pushed by GitHub Actions CI. ArgoCD auto-syncs manifests from `homeserver-iac/k3s-manifests/job-scout/`.

Currently there is no automated migration step. The `INGEST_API_KEY` secret exists in Vault but is not referenced in the deployment env vars.

## Goals / Non-Goals

**Goals:**
- Run `python manage.py migrate --noinput` automatically before the app starts on every deploy
- Wire `INGEST_API_KEY` into the deployment env vars
- Keep it simple — no separate Job resources, no migration tracking, no canary deploys

**Non-Goals:**
- Zero-downtime deploys (would require rolling strategy + multiple replicas + migration compatibility checks)
- Migration rollback automation (Django's `migrate` is forward-only in practice)
- Changing the deploy strategy from Recreate

## Decisions

### 1. Init container over entrypoint script

**Choice**: Use a Kubernetes init container that runs `python manage.py migrate --noinput`.

**Rationale**: Init containers are the K8s-native way to run pre-start tasks. If migration fails, the pod stays in `Init:Error` and the main container never starts — clear failure signal. An entrypoint script would require custom error handling and makes the Dockerfile more complex.

**Alternative considered**: Entrypoint wrapper script (`migrate && gunicorn`) — mixes concerns, harder to debug, migration failure is less visible.

**Alternative considered**: Separate K8s Job triggered by CI — adds complexity (Job lifecycle, RBAC, image pull), overkill for a single-replica app.

### 2. Same image for init container

**Choice**: The init container uses the same `ghcr.io/halitdincer/job-scout:latest` image as the main container, with only the command overridden.

**Rationale**: Guarantees the migration code matches the app code exactly. No additional image to build or manage.

### 3. Add INGEST_API_KEY to deployment

**Choice**: Add an env var referencing `job-scout-secret.INGEST_API_KEY` alongside the existing `SECRET_KEY` and `DATABASE_URL`.

**Rationale**: The key is already in Vault and synced to the K8s secret. Just needs to be wired into the pod env.

## Risks / Trade-offs

- **Migration blocks deploy** → By design. If a migration fails, the pod stays in init state and the old pod is already stopped (Recreate strategy). This means downtime until fixed. Acceptable for a personal project with single replica.
- **Long migrations slow deploy** → Acceptable. Django migrations for this project are fast (small schema). Monitor if this becomes an issue.
