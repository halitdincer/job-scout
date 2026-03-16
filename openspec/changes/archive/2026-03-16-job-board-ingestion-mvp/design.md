## Context

The job-scout app is a barebones Django project with a health endpoint and PostgreSQL. No domain models exist yet. The goal is to build the MVP data layer: store sources (company job boards) and their listings, fetched from public platform APIs, tracked by run records, and scheduled via GitHub Actions cron.

Three platforms have official, documented, unauthenticated public APIs:
- **Greenhouse**: `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` — returns all jobs in one response
- **Lever**: `GET https://api.lever.co/v0/postings/{account}?mode=json` — flat array, supports pagination via `skip`/`limit`
- **Ashby**: `GET https://api.ashbyhq.com/posting-api/job-board/{board}` — returns all jobs in one response

## Goals / Non-Goals

**Goals:**
- Define `Source`, `JobListing`, and `Run` models with proper indexing
- Build a pluggable adapter pattern so adding new platforms is isolated
- Fetch and normalize listings from Greenhouse, Lever, and Ashby
- Track listing status: active listings are upserted, missing listings are marked expired
- Record each ingestion cycle as a `Run` with status, timing, and counters
- Expose REST endpoints for sources, jobs, and runs
- Trigger ingestion via `POST /api/runs/` (API key protected) or `python manage.py ingest`
- Schedule ingestion every 4 hours via GitHub Actions cron
- Full TDD: tests first, 100% coverage maintained

**Non-Goals:**
- User accounts, authentication, or multi-tenancy (API key is a simple shared secret, not user auth)
- Email/push notifications
- Custom scraping logic or Workday (undocumented API, fragile)
- Job description parsing or keyword matching
- Frontend UI

## Decisions

### 1. Single `core` app — no new Django apps

**Choice**: Add models, views, adapters all within `core/`.

**Rationale**: The project is small. Splitting into apps adds overhead without benefit at this stage. Can extract later if needed.

### 2. Adapter pattern with a registry

**Choice**: Each platform gets an adapter class implementing a common interface (`fetch_listings(board_id) -> list[dict]`). A registry maps platform slug to adapter class.

**Rationale**: Adding a new platform means writing one new adapter class and registering it. No changes to ingestion logic.

### 3. Upsert by `(source, external_id)` compound key

**Choice**: Each listing is uniquely identified by its source + the platform's external job ID. On each ingestion run, existing listings are updated, new ones are created, and any active listings not in the response are marked expired.

**Rationale**: Handles job updates (title changes, etc.) and removals cleanly. The compound key prevents duplicates across sources.

### 4. `requests` library for HTTP

**Choice**: Use `requests` (synchronous) for API calls.

**Rationale**: Simple, well-tested, sufficient for ingestion. Async adds complexity without benefit since ingestion runs sequentially.

### 5. Django REST Framework is NOT added

**Choice**: Use plain Django `JsonResponse` views for the read-only API.

**Rationale**: MVP only needs a few list endpoints and one POST. Adding DRF is overkill. Can add DRF later when CRUD or pagination becomes needed.

### 6. Run model for tracking ingestion cycles

**Choice**: A `Run` model records each ingestion cycle with fields: `status` (pending → running → completed/failed), `started_at`, `finished_at`, `sources_processed`, `listings_created`, `listings_updated`, `listings_expired`, and `error_message`.

**Rationale**: Provides observability — you can see when the last run happened, whether it succeeded, and what changed. Essential for debugging a scheduled system.

### 7. API key authentication for `POST /api/runs/`

**Choice**: Protect the ingest trigger with a simple `Authorization: Bearer <token>` header. The token is read from the `INGEST_API_KEY` environment variable. No user auth system needed.

**Rationale**: Prevents unauthorized triggering of ingestion. Simple enough for MVP — the key is stored in Vault (for the Django pod) and GitHub secrets (for the cron workflow).

**Alternative considered**: No auth (rely on network isolation) — risky since the endpoint is public. Django's session auth — overkill for a machine-to-machine call.

### 8. GitHub Actions cron for scheduling

**Choice**: A separate `ingest.yml` workflow with `schedule: cron: '0 */4 * * *'` that curls `POST https://jobs.halitdincer.com/api/runs/` with the API key from GitHub secrets.

**Rationale**: No need for Celery, Redis, or K8s CronJobs. GitHub Actions is free for this usage and the user already has the CI/CD pipeline there. The ingest endpoint does the actual work inside the running Django container.

**Alternative considered**: K8s CronJob running `manage.py ingest` — requires building/pulling the image, setting up DB access, more infrastructure. GH Actions cron + API call is simpler.

### 9. Management command kept as alternative

**Choice**: Keep `python manage.py ingest` alongside the API endpoint. Both call the same ingestion function.

**Rationale**: Useful for local dev, debugging, and one-off runs. The management command doesn't create a Run record (lightweight), while the API endpoint does (for production tracking).

## Risks / Trade-offs

- **Platform API changes without notice** → Adapters are isolated; a breaking change only affects one adapter. Tests mock HTTP responses so we detect schema mismatches early.
- **Large job boards (1000+ listings) may be slow** → Greenhouse and Ashby return all at once, Lever paginates. Acceptable for MVP; can add concurrency later.
- **No retry/backoff on API failures** → MVP logs the error and continues to next source. Acceptable; add retries later.
- **GitHub Actions cron can be delayed** → GH Actions cron has no SLA on exact timing. Acceptable — 4-hour interval doesn't need precision.
- **API key in GitHub secrets** → Single shared secret. Acceptable for MVP; rotate periodically.

## Migration Plan

1. Add `requests` to `requirements.txt`
2. Create models + migration
3. Add `INGEST_API_KEY` to Vault at `secret/job-scout/config`
4. Add `INGEST_API_KEY` to GitHub repo secrets
5. Deploy — new tables created by migration, new endpoints available
6. Create `ingest.yml` workflow — starts triggering every 4 hours
7. Rollback: delete workflow, drop tables, revert migration
