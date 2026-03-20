## MODIFIED Requirements

### Requirement: Jobs page at root URL
The application SHALL serve an HTML page at `/` that loads AG Grid and fetches job listings from `/api/jobs/` for client-side rendering for authenticated users. The page no longer performs server-side filtering — all filtering, sorting, and pagination is handled by AG Grid in the browser.

#### Scenario: Unauthenticated user is redirected to login
- **WHEN** an unauthenticated user visits `/`
- **THEN** the system redirects to the login page

#### Scenario: Authenticated user sees jobs grid
- **WHEN** an authenticated user visits `/`
- **THEN** they see an AG Grid table that loads and displays all job listings

#### Scenario: Jobs page with no listings
- **WHEN** an authenticated user visits `/` and there are no job listings in the system
- **THEN** the grid renders empty with no rows

#### Scenario: Job title links to external listing
- **WHEN** an authenticated user clicks on a job listing title in the grid
- **THEN** they are taken to the external job posting URL in a new tab
