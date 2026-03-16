# job-scout

Job scouting application built with Django and PostgreSQL.

## Local Development

```bash
# With Docker
docker compose up

# Without Docker (requires local PostgreSQL)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The app runs at http://localhost:8000. Health check: http://localhost:8000/api/health

## Deployment

Deployed to K3s homeserver at `jobs.halitdincer.com` via ArgoCD.

### Deployment Flow

1. Code merges to `main`
2. GitHub Actions (`ci.yml`) builds the Docker image and pushes to `ghcr.io/halitdincer/job-scout` with `latest` and SHA tags
3. ArgoCD Image Updater detects the new image digest
4. ArgoCD auto-syncs and redeploys the job-scout pods on K3s

### Required Vault Secrets

Set these at `secret/job-scout/config` in Vault:

| Key | Description |
|-----|-------------|
| `SECRET_KEY` | Django secret key (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
| `DATABASE_URL` | PostgreSQL connection string: `postgres://postgres:<password>@postgres:5432/jobscout` |
| `POSTGRES_PASSWORD` | PostgreSQL password (must match the password in DATABASE_URL) |
