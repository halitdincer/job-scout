## Why

The app has API endpoints and models but no way to manage data visually or browse job listings. Adding Django admin registration gives immediate CRUD for sources, listings, and runs. A minimal server-rendered frontend with Django templates gives a professional, browsable interface for job listings without introducing a JS framework.

## What Changes

- Register Source, JobListing, and Run models in Django admin with search/filter
- Add a K8s init container that runs Django's `createsuperuser` command (idempotent, skips if user exists)
- Add three server-rendered pages using Django templates:
  - **Jobs page** (`/`) — table of job listings with search bar and status/source filters
  - **Sources page** (`/sources/`) — table of configured sources
  - **Runs page** (`/runs/`) — table of ingestion run history
- Minimal, professional styling (dark neutral palette, clean typography) — single CSS file, no JS framework

## Capabilities

### New Capabilities
- `django-admin`: Admin site registration for all models with search, list filters, and display columns
- `frontend-pages`: Server-rendered HTML pages for jobs, sources, and runs with search/filter and professional styling
- `seed-admin-user`: K8s init container running `createsuperuser --noinput` with env vars for credentials

### Modified Capabilities

None.

## Impact

- **New files**: `core/admin.py` (register models), `core/templates/` (HTML templates), `core/static/` (CSS), updated `core/views.py` and `core/urls.py`
- **K8s changes**: New init container in deployment.yaml for `createsuperuser`
- **No new dependencies** — uses Django's built-in template engine and static files
- **URL changes**: `/` now serves the jobs page instead of 404; `/sources/` and `/runs/` added as HTML pages; API endpoints unchanged under `/api/`
