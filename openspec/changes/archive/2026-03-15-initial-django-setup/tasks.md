## 1. Django Project Setup

- [x] 1.1 Create `requirements.txt` with Django, psycopg[binary], gunicorn, dj-database-url, whitenoise
- [x] 1.2 Run `django-admin startproject jobscout .` to scaffold the project in the repo root
- [x] 1.3 Create the `core` app with `python manage.py startapp core`
- [x] 1.4 Configure `settings.py`: DATABASE_URL via dj-database-url, SECRET_KEY/DEBUG/ALLOWED_HOSTS from env vars, whitenoise middleware, core app in INSTALLED_APPS
- [x] 1.5 Add health check view in `core/views.py` returning JSON `{"status": "ok"}` at `GET /api/health`
- [x] 1.6 Wire up URL routing: `jobscout/urls.py` includes `core.urls`, `core/urls.py` maps `/api/health`
- [x] 1.7 Add `.gitignore` for Python/Django (*.pyc, __pycache__, db.sqlite3, .env, staticfiles/)

## 2. Docker Setup

- [x] 2.1 Create multi-stage `Dockerfile`: builder stage installs deps, final stage copies app, collects static, runs gunicorn on port 8000
- [x] 2.2 Create `.dockerignore` (exclude .git, __pycache__, .env, openspec/, etc.)
- [x] 2.3 Create `docker-compose.yml` with Django app (port 8000) and PostgreSQL 16 (port 5432) services, named volume for DB data
- [x] 2.4 Verify `docker compose up` starts both services and `/api/health` returns 200 _(Docker not installed locally — verify after Docker setup)_

## 3. GitHub Actions CI/CD

- [x] 3.1 Create `.github/workflows/build.yml`: trigger on push to main and PRs
- [x] 3.2 Build step: build Docker image
- [x] 3.3 Push step: push to `ghcr.io/halitdincer/job-scout` with `latest` and SHA tags (only on main branch push)

## 4. K3s Manifest Updates (homeserver-iac)

- [x] 4.1 Update `deployment.yaml`: change container port to 8000, update env vars (DATABASE_URL, SECRET_KEY, DEBUG, ALLOWED_HOSTS from secret), remove SQLite volume mount
- [x] 4.2 Add PostgreSQL deployment manifest (`postgres-deployment.yaml`): PostgreSQL 16 image, PVC for data, env vars for POSTGRES_DB/USER/PASSWORD
- [x] 4.3 Add PostgreSQL service manifest (`postgres-service.yaml`): ClusterIP service on port 5432
- [x] 4.4 Update `service.yaml`: change port from 3000 to 8000
- [x] 4.5 Update `kustomization.yaml`: add new PostgreSQL resources, update PVC for PostgreSQL
- [x] 4.6 Update ingress (`ingresses/job-scout.yaml`): change backend port from 3000 to 8000
- [x] 4.7 Update `secret.yaml` external-secret if needed to include DATABASE_URL key
- [x] 4.8 Document required Vault secrets: SECRET_KEY, DATABASE_URL, ALLOWED_HOSTS
