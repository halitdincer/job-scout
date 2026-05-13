## Why

`POST /api/runs/` currently runs ingestion synchronously in the request handler. A full scrape across all active sources takes well over 100 seconds, which is Cloudflare's free-tier edge timeout for the proxied origin at `jobs.halitdincer.com`. The result: GitHub Actions sees HTTP 524 on every scheduled run and marks the workflow red, even when the scrape itself completes successfully on the backend and the Run row ends up `status="completed"` in the DB. Operator trust in the GHA signal erodes — a red run could mean "real failure" or "Cloudflare timed out a successful run."

## What Changes

- `POST /api/runs/` SHALL queue a background worker and return immediately with HTTP 202 and the new Run row's id + `status="running"`. The caller (currently the GHA workflow) now sees green when the ingestion has been successfully queued.
- The actual ingestion runs in a daemon thread (no broker dependency added). The thread updates the Run row to `completed` or `failed` on its own, observable via `GET /api/runs/`.
- The existing stale-run sweep (`status="running"` rows are marked failed on next trigger) remains the safety net for crashed workers.

## Non-goals

- A real task queue (Celery, django-q, etc.). Threading is sufficient for one ingestion at a time on a single pod; we will revisit if we need retries, fanout, or cross-pod scheduling.
- Changing the schedule cadence or the GHA workflow itself — that still hits `POST /api/runs/` and will just see 202 instead of 524.
- A polling/webhook mechanism for completion. Operators check the runs UI / `GET /api/runs/`.

## Capabilities

### Modified Capabilities

- `run-tracker`: `POST /api/runs/` returns HTTP 202 with a `status="running"` Run row instead of running ingestion in-band and returning HTTP 201 with the terminal state.
