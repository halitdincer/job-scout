## 1. Django Admin

- [x] 1.1 Register Source, JobListing, Run models in `core/admin.py` with list_display, search_fields, list_filter
- [x] 1.2 Write tests for admin registration (all three models registered, correct display/search/filter config)

## 2. Frontend Templates and Views

- [x] 2.1 Create `core/templates/core/base.html` with navigation header, dark professional styling, and CSS link
- [x] 2.2 Create `core/static/core/style.css` with dark neutral palette and professional typography
- [x] 2.3 Create jobs page view and template (`/`) — table with search bar and status/source filters
- [x] 2.4 Create sources page view and template (`/sources/`) — table of all sources
- [x] 2.5 Create runs page view and template (`/runs/`) — table of all runs
- [x] 2.6 Add URL routes for `/`, `/sources/`, `/runs/` in `core/urls.py`
- [x] 2.7 Write tests for all three page views (renders template, context data, search/filter on jobs page)

## 3. Admin User Setup

- [x] 3.1 Add `createsuperuser` init container to `homeserver-iac/k3s-manifests/job-scout/deployment.yaml` with env vars from secret
- [x] 3.2 Add admin credentials (`DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_PASSWORD`) to Vault and K8s ExternalSecret

## 4. Verification

- [x] 4.1 Run full test suite — all tests pass with 100% coverage
