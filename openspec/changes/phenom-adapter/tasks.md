## 1. Source registry

- [ ] 1.1 Add `phenom` to `Source.PLATFORM_CHOICES`.
- [ ] 1.2 Run `makemigrations` to capture the choice update.

## 2. Phenom adapter

- [ ] 2.1 Add `PhenomAdapter` class with `_parse_board_id` returning `(base_path, refNum)` and raising `ValueError` on malformed input.
- [ ] 2.2 Implement `fetch_listings` to POST `/widgets` with `ddoKey:"refineSearch"`, paginate by `from` until `from >= totalHits`, and normalize each job into the standard listing dict.
- [ ] 2.3 Map: `jobId→external_id`, `title→title`, `category→department`, `multi_location→locations` (fallback to `[location]`), `type→employment_type` (via `normalize_employment_type`), `country→country`, `postedDate→published_at`, `dateCreated→updated_at_source`. URL is `f"https://{base_path}/job/{jobId}"`. `team`, `workplace_type`, `is_listed` are unsupported by the widget response — set to `None`/`"unknown"`/`None` respectively.

## 3. Adapter registry

- [ ] 3.1 Register `PhenomAdapter` in `_REGISTRY` under key `"phenom"`.
- [ ] 3.2 Update existing tests that need to assert `get_adapter("phenom")` works.

## 4. Seed companies

- [ ] 4.1 Create migration `0010_seed_companies_phenom.py` adding Source rows: RBC (`jobs.rbc.com/ca/en:RBCAA0088`), BMO (`jobs.bmo.com/ca/en:BOMOGLOBAL`), OMERS (`careers.omers.com/ca/en:OMEOMECA`). Idempotent via `get_or_create`.

## 5. Verification

- [ ] 5.1 100% coverage and all unit tests pass.
- [ ] 5.2 Live smoke against all 3 tenants: each returns >0 listings with no errors and required fields populated.
