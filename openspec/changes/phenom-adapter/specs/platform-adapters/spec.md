## ADDED Requirements

### Requirement: Phenom adapter
The Phenom adapter SHALL fetch listings from `POST https://{domain}/widgets` (where `domain` is the first slash-separated segment of `base_path`), using a `board_id` of the form `"{base_path}:{refNum}"`. It SHALL paginate by incrementing `from` by the page size until `from` reaches the response's `totalHits`, and SHALL return `is_listed: None`. The job URL SHALL be `https://{base_path}/job/{jobId}`.

#### Scenario: Phenom returns is_listed as None
- **WHEN** the Phenom adapter fetches listings
- **THEN** each listing has `is_listed: None`

#### Scenario: Phenom paginates by from
- **WHEN** the widget endpoint reports a `totalHits` greater than the page size
- **THEN** the adapter issues subsequent POSTs with incremented `from` until all matching jobs are collected

#### Scenario: Phenom board_id parsing
- **WHEN** the adapter is invoked with a `board_id` that is not two colon-separated segments
- **THEN** a `ValueError` is raised before any network call

#### Scenario: Phenom URL is constructed from base_path and jobId
- **WHEN** a posting has `jobId="R-0000140512"` and the adapter was invoked with `board_id="jobs.rbc.com/ca/en:RBCAA0088"`
- **THEN** the listing's `url` is `"https://jobs.rbc.com/ca/en/job/R-0000140512"`
