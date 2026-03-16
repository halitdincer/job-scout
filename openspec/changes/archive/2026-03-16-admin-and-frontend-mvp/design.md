## Context

The app has three models (Source, JobListing, Run) with JSON API endpoints but no visual interface. Django admin is configured in `jobscout/urls.py` but no models are registered. The admin site at `/admin/` works but is empty. There is no frontend — `/` returns 404.

WhiteNoise is already configured for static files. Django templates engine is enabled with `APP_DIRS: True`.

## Goals / Non-Goals

**Goals:**
- Register all models in Django admin with useful search/filter/display columns
- Create an admin superuser via `createsuperuser` command in K8s init container
- Serve three HTML pages: jobs listing (/), sources (/sources/), runs (/runs/)
- Professional, minimal styling — dark neutral palette, clean typography
- Search and filter functionality on the jobs page

**Non-Goals:**
- No JavaScript framework — server-rendered HTML only
- No pagination (MVP, datasets are small)
- No user authentication for the frontend pages (public read-only)
- No edit/create forms on frontend pages (use Django admin for CRUD)
- No responsive mobile layout (desktop-first MVP)

## Decisions

### 1. Django admin with ModelAdmin classes
Register Source, JobListing, Run with `@admin.register` decorators. Each gets `list_display`, `list_filter`, and `search_fields` for practical data management.

**Alternative**: Third-party admin (django-unfold, grappelli) — rejected, unnecessary for MVP.

### 2. K8s init container for superuser creation
Use Django's `createsuperuser --noinput` with `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_PASSWORD` env vars. The command is idempotent — it fails silently if the user already exists, so the init container needs `|| true` to avoid blocking pod startup.

**Alternative**: Data migration — rejected per user preference, harder to manage credentials.

### 3. Server-rendered Django templates
Three templates in `core/templates/core/`: `jobs.html`, `sources.html`, `runs.html` extending a shared `base.html`. Views query the DB and pass context. URL routing added to `core/urls.py`.

**Alternative**: Separate frontend app (React, etc.) — rejected, too heavy for MVP.

### 4. Single CSS file, no framework
One `core/static/core/style.css` file with a dark neutral palette. Professional typography with system font stack. Table-based layouts for data display.

**Alternative**: Tailwind, Bootstrap — rejected, adds build complexity for MVP.

### 5. Search via GET query parameters
Jobs page search uses `?q=` parameter for title search and `?status=` / `?source=` for filters. Server-side filtering with Django ORM, form submits via GET (no JS needed).

## Risks / Trade-offs

- [No pagination] Large datasets will slow page load → Acceptable for MVP, add later
- [No JS] Search requires full page reload → Acceptable for MVP simplicity
- [createsuperuser idempotent hack] `|| true` masks real errors → Low risk, init container logs still visible in pod events
- [Hardcoded credentials in K8s secret] Admin password stored alongside other secrets → Same security model as existing secrets, acceptable
