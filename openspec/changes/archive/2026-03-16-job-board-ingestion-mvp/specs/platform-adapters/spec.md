## ADDED Requirements

### Requirement: Adapter interface
Each platform adapter SHALL implement a `fetch_listings(board_id: str) -> list[dict]` method that returns a list of normalized dictionaries with keys: `external_id` (str), `title` (str), `department` (str or None), `location` (str or None), `url` (str).

#### Scenario: Adapter returns normalized data
- **WHEN** an adapter fetches listings for a valid board_id
- **THEN** each item in the returned list has keys `external_id`, `title`, `department`, `location`, `url`

### Requirement: Adapter registry
The system SHALL maintain a registry mapping platform slugs (`greenhouse`, `lever`, `ashby`) to their adapter classes. Given a platform slug, the system SHALL return the corresponding adapter.

#### Scenario: Get adapter by platform
- **WHEN** the registry is queried with `"greenhouse"`
- **THEN** the Greenhouse adapter class is returned

#### Scenario: Unknown platform raises error
- **WHEN** the registry is queried with `"workday"`
- **THEN** a `ValueError` is raised

### Requirement: Greenhouse adapter
The Greenhouse adapter SHALL fetch listings from `GET https://boards-api.greenhouse.io/v1/boards/{board_id}/jobs?content=true` and normalize each job's `id`, `title`, `departments[0].name`, `location.name`, and `absolute_url`.

#### Scenario: Greenhouse fetch succeeds
- **WHEN** the Greenhouse adapter fetches listings for board_id `"airbnb"`
- **THEN** it makes a GET request to `https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true` and returns normalized listings

#### Scenario: Greenhouse job with no department
- **WHEN** a Greenhouse job has an empty `departments` array
- **THEN** the normalized listing has `department=None`

### Requirement: Lever adapter
The Lever adapter SHALL fetch listings from `GET https://api.lever.co/v0/postings/{board_id}?mode=json` and normalize each posting's `id`, `text` (as title), `categories.department`, `categories.location`, and `hostedUrl`.

#### Scenario: Lever fetch succeeds
- **WHEN** the Lever adapter fetches listings for board_id `"parallelwireless"`
- **THEN** it makes a GET request to `https://api.lever.co/v0/postings/parallelwireless?mode=json` and returns normalized listings

#### Scenario: Lever posting with no department
- **WHEN** a Lever posting has no `department` key in `categories`
- **THEN** the normalized listing has `department=None`

### Requirement: Ashby adapter
The Ashby adapter SHALL fetch listings from `GET https://api.ashbyhq.com/posting-api/job-board/{board_id}` and normalize each job's `id`, `title`, `department`, `location`, and `jobUrl`.

#### Scenario: Ashby fetch succeeds
- **WHEN** the Ashby adapter fetches listings for board_id `"Ashby"`
- **THEN** it makes a GET request to `https://api.ashbyhq.com/posting-api/job-board/Ashby` and returns normalized listings

### Requirement: Adapter handles HTTP errors
Each adapter SHALL raise an exception when the HTTP response status is not 200.

#### Scenario: API returns 404
- **WHEN** an adapter makes a request and gets HTTP 404
- **THEN** a `requests.HTTPError` is raised
