## ADDED Requirements

### Requirement: Workday adapter
The Workday adapter SHALL fetch listings from the public CXS endpoint using a `board_id` of the form `"<tenant>:<cluster>:<site>"`, paginate by offset until the reported total is reached, and return `is_listed: None`. The job URL SHALL be `https://{tenant}.{cluster}.myworkdayjobs.com{externalPath}`.

#### Scenario: Workday returns is_listed as None
- **WHEN** the Workday adapter fetches listings
- **THEN** each listing has `is_listed: None`

#### Scenario: Workday paginates by offset
- **WHEN** the CXS endpoint reports a `total` greater than the page size
- **THEN** the adapter issues subsequent POSTs with incremented `offset` until all postings are collected

#### Scenario: Workday board_id parsing
- **WHEN** the adapter is invoked with a `board_id` that is not three colon-separated segments
- **THEN** a `ValueError` is raised before any network call

### Requirement: BambooHR adapter
The BambooHR adapter SHALL fetch listings from `https://{board_id}.bamboohr.com/careers/list`, where `board_id` is the tenant subdomain, and return `is_listed: None`. Each listing's URL SHALL be `https://{board_id}.bamboohr.com/careers/{id}`.

#### Scenario: BambooHR returns is_listed as None
- **WHEN** the BambooHR adapter fetches listings
- **THEN** each listing has `is_listed: None`

#### Scenario: BambooHR maps remote flags to workplace_type
- **WHEN** a BambooHR job has `isRemote=true` or `locationType="1"`
- **THEN** the normalized `workplace_type` is `"remote"`
