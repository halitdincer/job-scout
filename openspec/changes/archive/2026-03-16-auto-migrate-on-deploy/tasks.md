## 1. K8s Deployment Manifest

- [x] 1.1 Add init container to `homeserver-iac/k3s-manifests/job-scout/deployment.yaml` that runs `python manage.py migrate --noinput` with the same image and env vars as the main container
- [x] 1.2 Add `INGEST_API_KEY` env var to the main container from `job-scout-secret`

## 2. Verification

- [x] 2.1 Push to homeserver-iac main → ArgoCD syncs → pod restarts with init container → migrations run → app serves traffic at jobs.halitdincer.com/api/health
