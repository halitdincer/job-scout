# job-scout

Job scouting application built with Django and PostgreSQL. Monitors company job boards via public APIs (Greenhouse, Lever, Ashby) and tracks new/expired listings.

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

### Management Commands

```bash
# Ingest all active sources
python manage.py ingest

# Ingest a specific source
python manage.py ingest --source-id 1
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/sources/` | No | List all sources |
| GET | `/api/jobs/` | No | List job listings (legacy quick filters plus advanced filter expression) |
| GET | `/api/runs/` | No | List ingestion runs |
| POST | `/api/runs/` | Bearer token | Trigger ingestion run |

### Running Tests

```bash
pip install -r requirements-dev.txt
pytest
```

## Advanced Filter Expression Contract

`GET /api/jobs/` accepts the optional `filter` query parameter containing JSON for a canonical filter expression AST.

Shape:

- Group nodes:
  - `{ "op": "and", "children": [<node>, ...] }`
  - `{ "op": "or", "children": [<node>, ...] }`
  - `{ "op": "not", "child": <node> }`
- Predicate nodes:
  - `{ "field": "title", "operator": "contains", "value": "engineer" }`

Example:

```json
{
  "op": "and",
  "children": [
    { "field": "title", "operator": "contains", "value": "engineer" },
    {
      "op": "not",
      "child": { "field": "title", "operator": "contains", "value": "senior" }
    }
  ]
}
```

Compatibility notes:

- Existing quick filters (`source_id`, `status`) remain supported.
- Effective query semantics are `quick_filters AND advanced_filter` when both are present.
- The AST format is intentionally deterministic so it can be reused by future notifications without changing filter meaning.

## Deployment

Deployed to K3s homeserver at `jobs.halitdincer.com` via ArgoCD.

### Deployment Flow

1. Code merges to `main`
2. GitHub Actions (`ci.yml`) builds the Docker image and pushes to `ghcr.io/halitdincer/job-scout` with `latest` and SHA tags
3. ArgoCD Image Updater detects the new image digest
4. ArgoCD auto-syncs and redeploys the job-scout pods on K3s

### Scheduled Ingestion

GitHub Actions (`ingest.yml`) runs every 4 hours via cron, calling `POST /api/runs/` with the `INGEST_API_KEY` secret. Can also be triggered manually from the Actions tab.

### Required Vault Secrets

Set these at `secret/job-scout/config` in Vault:

| Key | Description |
|-----|-------------|
| `SECRET_KEY` | Django secret key (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`) |
| `DATABASE_URL` | PostgreSQL connection string: `postgres://postgres:<password>@postgres:5432/jobscout` |
| `POSTGRES_PASSWORD` | PostgreSQL password (must match the password in DATABASE_URL) |
| `INGEST_API_KEY` | API key for triggering ingestion (also set as GitHub repo secret `INGEST_API_KEY`) |
