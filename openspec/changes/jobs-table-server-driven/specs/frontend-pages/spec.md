## MODIFIED Requirements

### Requirement: Jobs page at root URL
The application SHALL serve an HTML page at `/` for authenticated users that loads a Tabulator-backed jobs grid driven by a client-side store. The page SHALL fetch job listings from `/api/jobs/` with server-side sort and server-side pagination. The page SHALL NOT perform sort or pagination in the browser; Tabulator SHALL operate as a presentation-only grid whose rows, columns, and sort indicators are written by store subscribers.

#### Scenario: Unauthenticated user is redirected to login
- **WHEN** an unauthenticated user visits `/`
- **THEN** the system redirects to the login page

#### Scenario: Authenticated user sees jobs grid
- **WHEN** an authenticated user visits `/`
- **THEN** they see a Tabulator jobs grid that loads its first page via `GET /api/jobs/?page=1&page_size=50&sort=first_seen_at:desc`

#### Scenario: Jobs page with no listings
- **WHEN** an authenticated user visits `/` and there are no job listings in the system
- **THEN** the grid renders empty with no rows and the pagination bar shows "Page 1 of 1"

#### Scenario: Job title links to external listing
- **WHEN** an authenticated user clicks on a job listing title in the grid
- **THEN** they are taken to the external job posting URL in a new tab

#### Scenario: Bootstrap is an ES module
- **WHEN** an authenticated user loads `/`
- **THEN** the rendered HTML references `<script type="module" src="{% static 'js/jobs.js' %}">` and SHALL NOT contain an inline `new Tabulator` bootstrap
