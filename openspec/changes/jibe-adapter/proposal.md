## Why

Two more companies in the user's target list — AON (`jobs.aon.com`) and S&P Global (`careers.spglobal.com`) — publish jobs through career sites fronted by **Jibe**, a hosted search/discovery layer (now part of Phenom). Both expose a clean public JSON endpoint at `https://{host}/api/jobs?from=N&size=10` with rich, normalized fields (title, req_id, full_location, employment_type, posted_date, categories, apply_url, ats_code, slug, lat/lng, country).

AON is iCIMS-backed (`ats_code: icims`, applies to `us-careers-aon.icims.com`). Pure iCIMS exposes only an RSS feed with sparse fields, so Jibe is a strict superset for ingestion purposes.

S&P is **Workday-backed** (`ats_code: spgi-prod-workday`, applies to `spgi.wd5.myworkdayjobs.com`). Adding S&P via Jibe would duplicate transport for content already reachable through the existing `WorkdayAdapter`. Therefore S&P is seeded as a **Workday** source (`spgi:wd5:SPGI_Careers`), not a Jibe source.

## What Changes

- Add `JibeAdapter` that GETs `https://{host}/api/jobs?from=N&size=10`, increments `from` by the returned job count until the response's `jobs[]` is empty or `totalCount` is reached, and normalizes each `jobs[].data` item into the standard listing dict.
- Add `jibe` to `Source.PLATFORM_CHOICES` and the adapter registry. `board_id` is the careers hostname (e.g. `jobs.aon.com`).
- Seed Source rows: AON (`jibe`, `jobs.aon.com`) and S&P Global (`workday`, `spgi:wd5:SPGI_Careers`).

## Non-goals

- iCIMS RSS/HTML adapter. The Jibe API gives a strict superset of fields; reaching iCIMS directly is unnecessary for AON.
- A pure-iCIMS adapter for tenants that do **not** front through Jibe. None of those are in the current target list.
- Apply-flow ingestion (`apply_url` is captured but not followed).
- SuccessFactors (Scotiabank, Fitch). Tracked separately — currently blocked on Scotiabank's career-site outage and SF's lack of a public JSON API.

## Capabilities

### Modified Capabilities

- `platform-adapters`: Add `jibe` adapter alongside the existing six. Returns `is_listed: None` (Jibe does not expose a listed/unlisted flag — `searchable: True` on every job).
- `source-registry`: Extend `Source.platform` choices to `{greenhouse, lever, ashby, workday, bamboohr, phenom, jibe}`. Add S&P as a Workday source — no new platform required.
