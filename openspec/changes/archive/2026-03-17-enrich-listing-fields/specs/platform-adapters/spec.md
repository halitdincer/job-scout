## MODIFIED Requirements

### Requirement: Adapter interface
Each platform adapter SHALL implement a `fetch_listings(board_id: str) -> list[dict]` method that returns a list of normalized dictionaries with keys: `external_id` (str), `title` (str), `department` (str or None), `locations` (list of str), `url` (str), `team` (str or None), `employment_type` (str, normalized to `full_time`/`part_time`/`contract`/`intern`/`temporary`/`unknown`), `workplace_type` (str, normalized to `on_site`/`remote`/`hybrid`/`unknown`), `country` (str or None), `published_at` (ISO datetime str or None), `updated_at_source` (ISO datetime str or None).

#### Scenario: Adapter returns normalized data with enriched fields
- **WHEN** an adapter fetches listings for a valid board_id
- **THEN** each item in the returned list has all 11 keys, with unsupported fields set to None and `locations` as a list (possibly empty)

### Requirement: Greenhouse adapter
The Greenhouse adapter SHALL fetch listings from `GET https://boards-api.greenhouse.io/v1/boards/{board_id}/jobs?content=true` and normalize each job's `id`, `title`, `departments[0].name`, `location.name` (as single-item `locations` list), `absolute_url`, `first_published` (as published_at), and `updated_at` (as updated_at_source). Fields not available from Greenhouse: `team` SHALL be None, `employment_type` SHALL be `"unknown"`, `workplace_type` SHALL be `"unknown"`, `country` SHALL be None.

#### Scenario: Greenhouse fetch succeeds with enriched fields
- **WHEN** the Greenhouse adapter fetches listings for a valid board_id
- **THEN** it returns normalized listings with `locations` as a single-item list, `published_at` and `updated_at_source` populated, `employment_type="unknown"`, `workplace_type="unknown"`, and `team`/`country` as None

#### Scenario: Greenhouse job with no location
- **WHEN** a Greenhouse job has no `location.name`
- **THEN** the normalized listing has `locations` as an empty list

### Requirement: Lever adapter
The Lever adapter SHALL fetch listings from `GET https://api.lever.co/v0/postings/{board_id}?mode=json` and normalize each posting's `id`, `text` (as title), `categories.department`, `categories.allLocations` (as `locations` list), `hostedUrl`, `categories.team` (as team), `categories.commitment` (as employment_type, normalized), `workplaceType` (as workplace_type, normalized), `country`, and `createdAt` (epoch ms, as published_at).

#### Scenario: Lever fetch succeeds with enriched fields
- **WHEN** the Lever adapter fetches listings for a valid board_id
- **THEN** it returns normalized listings with `locations` as a list from `allLocations`, team, employment_type, workplace_type, country, and published_at populated

#### Scenario: Lever posting with multiple locations
- **WHEN** a Lever posting has `categories.allLocations` of `["London", "Stockholm"]`
- **THEN** the normalized `locations` is `["London", "Stockholm"]`

#### Scenario: Lever normalizes commitment to employment_type
- **WHEN** a Lever posting has `categories.commitment` of `"Permanent"`
- **THEN** the normalized `employment_type` is `"full_time"`

#### Scenario: Lever unknown commitment defaults to unknown
- **WHEN** a Lever posting has no `categories.commitment`
- **THEN** the normalized `employment_type` is `"unknown"`

### Requirement: Ashby adapter
The Ashby adapter SHALL fetch listings from `GET https://api.ashbyhq.com/posting-api/job-board/{board_id}` and normalize each job's `id`, `title`, `department`, `location` + `secondaryLocations` (combined as `locations` list), `jobUrl`, `team`, `employmentType` (as employment_type, normalized), `workplaceType` (as workplace_type, normalized), `address.postalAddress.addressCountry` (as country), and `publishedAt` (as published_at).

#### Scenario: Ashby fetch succeeds with enriched fields
- **WHEN** the Ashby adapter fetches listings for a valid board_id
- **THEN** it returns normalized listings with `locations` as a combined list, team, employment_type, workplace_type, country, and published_at populated

#### Scenario: Ashby job with secondary locations
- **WHEN** an Ashby job has `location="London"` and `secondaryLocations=["Toronto", "New York"]`
- **THEN** the normalized `locations` is `["London", "Toronto", "New York"]`

#### Scenario: Ashby normalizes employmentType
- **WHEN** an Ashby job has `employmentType` of `"FullTime"`
- **THEN** the normalized `employment_type` is `"full_time"`
