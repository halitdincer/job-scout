## 1. Source registry

- [ ] 1.1 Extend `Source.PLATFORM_CHOICES` to include `workday` and `bamboohr`.
- [ ] 1.2 Update `test_platform_choices` and any other test referencing `"workday"` as a rejected platform to use a still-invalid value.

## 2. Workday adapter

- [ ] 2.1 Add tests covering the CXS list shape, offset-based pagination across multiple pages, `external_id` resolved from `bulletFields` with `externalPath` fallback, `timeType → employment_type` mapping, missing-location fallthrough, and HTTP error propagation.
- [ ] 2.2 Add tests covering `board_id` parsing — accepts `tenant:cluster:site`, rejects malformed input with `ValueError`.
- [ ] 2.3 Implement `WorkdayAdapter.fetch_listings` to satisfy the tests.

## 3. BambooHR adapter

- [ ] 3.1 Add tests covering the `/careers/list` shape, `employmentStatusLabel → employment_type` mapping, `isRemote`/`locationType → workplace_type` mapping, `atsLocation` fallback when `location` is empty, and HTTP error propagation.
- [ ] 3.2 Implement `BambooHRAdapter.fetch_listings` to satisfy the tests.

## 4. Adapter registry

- [ ] 4.1 Register both adapters in `_REGISTRY`. Update `test_unknown_platform_raises_value_error` to use a value that is still unknown.

## 5. Seed companies

- [ ] 5.1 Add a data migration `0008_seed_companies_workday_bamboohr` that idempotently creates the 10 verified Source rows.
- [ ] 5.2 Add migration tests that mirror `0006_seed_sources` — creation correctness and idempotency on re-run.

## 6. Verification

- [ ] 6.1 Run `pytest` — must remain at 100% coverage and zero failures.
- [ ] 6.2 Run the Playwright suite — must pass with no regressions.
