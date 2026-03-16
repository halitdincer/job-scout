## Why

Deployments currently require manual `kubectl exec` to run migrations, and the new `INGEST_API_KEY` env var isn't wired into the K8s deployment. Every schema change risks a broken deploy if someone forgets to migrate. Automating migrations on deploy makes the CI/CD pipeline fully hands-off: push to main → tests pass → image built → pod starts → migrations run → app serves traffic.

## What Changes

- Add an init container to the job-scout K8s Deployment that runs `python manage.py migrate --noinput` before the main app container starts
- Add `INGEST_API_KEY` env var to the deployment (from the existing `job-scout-secret`)
- The init container uses the same image and secrets as the main container, so it has DB access

## Capabilities

### New Capabilities
- `auto-migration`: Init container in K8s Deployment that runs Django migrations before the app starts

### Modified Capabilities
- `k8s-deployment`: Adding init container and `INGEST_API_KEY` env var to the existing deployment manifest

## Impact

- **Modified files**: `k3s-manifests/job-scout/deployment.yaml` in the homeserver-iac repo
- **No app code changes** — this is purely infrastructure
- **Zero downtime risk**: Recreate strategy means old pod stops, init container migrates, new pod starts. Single replica means brief downtime during deploy (already the case)
- **Rollback**: Remove init container from deployment, ArgoCD syncs
