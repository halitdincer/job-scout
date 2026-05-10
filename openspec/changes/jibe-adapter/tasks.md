## 1. Source registry

- [x] 1.1 Add `jibe` to `Source.PLATFORM_CHOICES`.
- [x] 1.2 Add `AlterField` migration capturing the choice update.

## 2. Jibe adapter

- [x] 2.1 Add `JibeAdapter` class. `board_id` is the careers hostname (no parsing required beyond non-empty validation).
- [x] 2.2 Implement `fetch_listings` to GET `https://{board_id}/api/jobs?from=N&size=10` starting at `from=0`, incrementing by returned job count until the response's `jobs[]` is empty or `totalCount` is reached. Default page size is fixed by the server at 10.
- [x] 2.3 Map: `req_id→external_id`, `title→title`, `category[0]→department` (stripped), locations from `full_location` split on `;` (or `[full_location]` for single location, or `[]` if missing), `meta_data.canonical_url→url` (fallback to `f"https://{host}/jobs/{req_id}?lang={language}"`), `employment_type→employment_type` via `normalize_employment_type(value.replace('_', ' '))` to handle `FULL_TIME` etc., `country→country`, `posted_date→published_at`, `update_date→updated_at_source`. `team`, `workplace_type`, `is_listed` are unsupported — set to `None`/`"unknown"`/`None`.

## 3. Adapter registry

- [x] 3.1 Register `JibeAdapter` in `_REGISTRY` under key `"jibe"`.
- [x] 3.2 Add `get_adapter("jibe")` test.

## 4. Seed companies

- [x] 4.1 Create migration `0013_seed_companies_jibe_workday.py` adding Source rows: AON (`jibe`, `jobs.aon.com`) and S&P Global (`workday`, `spgi:wd5:SPGI_Careers`). Idempotent via `get_or_create`.

## 5. Verification

- [x] 5.1 100% coverage and all unit tests pass.
- [x] 5.2 Live smoke against AON (Jibe) and S&P (Workday): each returns >0 listings with no errors and required fields populated.
