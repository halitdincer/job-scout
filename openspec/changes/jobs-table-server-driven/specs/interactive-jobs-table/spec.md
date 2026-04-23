## MODIFIED Requirements

### Requirement: Column sorting
Every sortable column in the jobs table SHALL be sortable by clicking the column header, with sort applied server-side across the entire result set (not just the current page). Sort SHALL support multi-column precedence: a plain click SHALL replace the active sort with the clicked column; a shift-click SHALL append the clicked column to the active sort as a secondary (then tertiary, etc.) sort key. The client SHALL encode the active sort as `sort=field1:dir1,field2:dir2,...` in the `/api/jobs/` query string with left-to-right precedence.

Sortable fields SHALL be drawn from a server-enforced allowlist covering direct listing columns (`title`, `department`, `team`, `status`, `employment_type`, `workplace_type`, `published_at`, `first_seen_at`, `last_seen_at`, `updated_at_source`, `expired_at`), the derived `source_name` (via `source__name`), the composite-array fields (`country`, `region`, `city`, via `Min()` on LocationTag columns), and the per-user `seen` flag (via `Exists(SeenListing)`). An unknown sort field or direction SHALL return HTTP 400.

#### Scenario: Sort by title ascending applies across all pages
- **WHEN** a user clicks the Title column header
- **THEN** the client issues `GET /api/jobs/?sort=title:asc&page=1&page_size=50` and the server returns listings sorted by title ascending across the entire dataset

#### Scenario: Last page reflects server-wide sort order
- **WHEN** a user sorts by title ascending and navigates to the last page
- **THEN** the rows shown on the last page are globally the alphabetically-largest titles, not merely the largest within the first page

#### Scenario: Multi-column sort via shift-click
- **WHEN** a user clicks the Status column header and then shift-clicks the First Seen column header
- **THEN** the client issues `sort=status:asc,first_seen_at:desc` and the server orders rows by Status ascending first, then First Seen descending

#### Scenario: Sort by seen works for the authenticated user
- **WHEN** an authenticated user sorts by the Seen column ascending
- **THEN** unseen rows appear before seen rows across the entire dataset

#### Scenario: Invalid sort field returns 400
- **WHEN** a client requests `GET /api/jobs/?sort=unknown_field:asc`
- **THEN** the server responds with HTTP 400 and the error message lists the valid sort fields

#### Scenario: Invalid sort direction returns 400
- **WHEN** a client requests `GET /api/jobs/?sort=title:sideways`
- **THEN** the server responds with HTTP 400 and the error message identifies the offending direction

### Requirement: Server-side pagination
The jobs API SHALL paginate results server-side. Clients SHALL request pages via `page` (1-indexed) and `page_size` query params. `page_size` SHALL be one of `{25, 50, 100, 250}`; a value outside the allowlist SHALL return HTTP 400. A `page` value outside the valid range SHALL return HTTP 400. The response SHALL be a JSON envelope of the form `{results, count, page, page_size, total_pages, sort}`. The default when `page` is omitted SHALL be `1`; the default when `page_size` is omitted SHALL be `50`. An empty dataset SHALL return `{results: [], count: 0, page: 1, page_size: 50, total_pages: 0, sort: [...]}`.

The jobs page SHALL render its own pagination bar below the grid containing a page-size selector whose options are exactly `{25, 50, 100, 250}`, a "Previous" button, a "Next" button, and a "Page X of Y" label. Tabulator's built-in pagination SHALL be disabled (`pagination: false`).

#### Scenario: Default page and page_size
- **WHEN** a client requests `GET /api/jobs/` with no pagination params
- **THEN** the server returns the first 50 listings with `{page: 1, page_size: 50}` in the envelope

#### Scenario: Envelope shape
- **WHEN** a client requests `GET /api/jobs/?page=2&page_size=100`
- **THEN** the response body contains `results`, `count`, `page=2`, `page_size=100`, `total_pages`, and the applied `sort` array

#### Scenario: page_size allowlist enforced
- **WHEN** a client requests `GET /api/jobs/?page_size=37`
- **THEN** the server responds with HTTP 400 and the error message lists `{25, 50, 100, 250}` as the valid values

#### Scenario: Out-of-range page returns 400
- **WHEN** a client requests a page greater than `total_pages`
- **THEN** the server responds with HTTP 400

#### Scenario: Empty dataset envelope
- **WHEN** a client requests `GET /api/jobs/` and there are no listings
- **THEN** the response body is `{results: [], count: 0, page: 1, page_size: 50, total_pages: 0, sort: [...]}`

#### Scenario: Filter + sort + pagination compose
- **WHEN** a client requests `GET /api/jobs/?filter=...&sort=title:asc&page=2&page_size=100`
- **THEN** the server applies the filter, sorts the filtered result set, and returns page 2 of 100 filtered rows with `count` reflecting the filtered total

#### Scenario: Pagination bar drives requests
- **WHEN** a user changes the Rows-per-page selector to 100 on the jobs page
- **THEN** the client issues a new `GET /api/jobs/?page=1&page_size=100&...` request and the pagination bar updates to "Page 1 of N"

#### Scenario: Tabulator does not paginate
- **WHEN** the jobs page is rendered
- **THEN** the Tabulator configuration SHALL set `pagination: false` and SHALL NOT expose Tabulator's built-in pagination controls

## REMOVED Requirements

### Requirement: Client-side pagination
**Reason**: Sort must apply to the entire result set, not just the current page. Client-side pagination made server-wide sort incoherent and limited the page size to whatever the initial fetch returned.
**Migration**: Replaced by the "Server-side pagination" requirement above. Clients now paginate via `page`/`page_size` query params and a server-returned envelope; the page-size allowlist is `{25, 50, 100, 250}`.
