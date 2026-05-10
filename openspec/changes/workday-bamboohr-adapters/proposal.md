## Why

The platform-adapters capability supports only Greenhouse, Lever, and Ashby. The set of companies the user wants to track (banks, insurers, asset managers, pensions, ratings) lives almost entirely on enterprise ATS platforms, and a real-world audit of 20 target companies showed that 9 of them publish jobs through Workday's public CXS API and 1 through BambooHR's public careers list endpoint. Without adapters for these two platforms, the system can ingest 0% of the user's target list.

Workday's public CXS endpoint (`POST /wday/cxs/{tenant}/{site}/jobs`) and BambooHR's `GET /careers/list` endpoint are both unauthenticated, return clean JSON, and follow the same shape across tenants — they fit the existing `fetch_listings` adapter contract without architectural change.

## What Changes

- Add `WorkdayAdapter` that paginates the CXS endpoint via offset and normalizes `jobPostings` items into the standard listing dict.
- Add `BambooHRAdapter` that fetches `/careers/list` and normalizes `result` items into the standard listing dict.
- Add `workday` and `bamboohr` to `Source.PLATFORM_CHOICES` and the adapter registry.
- Seed Source rows for the 10 companies confirmed reachable via these adapters: TMX, HOOPP, Sun Life, Manulife, Aviva, OTPP, CIBC, CPP Investments, Morningstar DBRS (Workday), and Picton (BambooHR).
- Update existing tests that used `"workday"` as the canonical "rejected platform" example to use a still-rejected value.

## Non-goals

- Tenant discovery for Workday vanity domains we cannot reach via canonical `*.myworkdayjobs.com` URLs (none of the 10 seeded companies need this — all canonical URLs were verified against the live CXS endpoint).
- Adapters for Phenom People, SuccessFactors, or iCIMS — the other 8 target companies use these and will be follow-up changes.
- Per-job detail fetches (description, requirements). The list endpoints carry enough data for the existing JobListing contract.
- Companies with no public ATS (Ewing Morris uses Google Forms; Timbercreek points at LinkedIn). These are out of scope for this change.

## Capabilities

### Modified Capabilities

- `platform-adapters`: Add `workday` and `bamboohr` adapters alongside the existing three. Both return `is_listed: None` (neither list endpoint exposes a listed/unlisted flag).
- `source-registry`: Extend `Source.platform` choices to `{greenhouse, lever, ashby, workday, bamboohr}`.
