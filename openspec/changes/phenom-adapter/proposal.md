## Why

The platform-adapters capability now covers Greenhouse, Lever, Ashby, Workday, and BambooHR — but three high-priority companies in the user's target list (RBC, BMO, OMERS) publish jobs through Phenom People career sites. Without a Phenom adapter, those three sources cannot be ingested.

Reverse-engineering Phenom showed that the canonical `/api/job/jobs` endpoint requires opaque tenant identification not reproducible from `curl` (likely a JS-bootstrapped fingerprint). However, Phenom also exposes a public widget endpoint — `POST /widgets` with `ddoKey: "refineSearch"` and a per-tenant `refNum` — which returns clean JSON with full pagination. The `refNum` is embedded as `"refNum":"..."` in every search-results page (e.g. `RBCAA0088`, `BOMOGLOBAL`, `OMEOMECA`). All three target tenants were verified live: RBC=1470 jobs, BMO=1218 jobs, OMERS=86 jobs.

## What Changes

- Add `PhenomAdapter` that POSTs to `https://{domain}/widgets`, paginates by `from` until `totalHits` is reached, and normalizes `data.jobs[]` items into the standard listing dict.
- Add `phenom` to `Source.PLATFORM_CHOICES` and the adapter registry.
- Use `board_id` format `"{base_path}:{refNum}"` (e.g. `"jobs.rbc.com/ca/en:RBCAA0088"`), parsed analogously to Workday's `tenant:cluster:site` convention. The base_path provides both the POST domain and the canonical job-detail URL prefix; refNum is the widget tenant identifier.
- Seed Source rows for the 3 confirmed tenants: RBC, BMO, OMERS.

## Non-goals

- Phenom Developer API integration (`https://api.phenom.com/jobs-api/v1/jobs`) — requires OAuth via `api-management@phenom.com` and is not appropriate for unauthenticated ingestion.
- Per-job detail fetches (full description body). The widget response includes `descriptionTeaser` and all required listing fields.
- Tenants whose `refNum` differs by locale path. We seed the canonical `ca/en` (or equivalent) path per source; per-locale segmentation is a follow-up if needed.
- HTML scraping fallback. The widget endpoint has been verified across three independent tenants and is a contracted public surface.

## Capabilities

### Modified Capabilities

- `platform-adapters`: Add `phenom` adapter alongside the existing five. Returns `is_listed: None` (Phenom does not expose a listed/unlisted flag in the widget response).
- `source-registry`: Extend `Source.platform` choices to `{greenhouse, lever, ashby, workday, bamboohr, phenom}`.
