## ADDED Requirements

### Requirement: Jobs page at root URL
The application SHALL serve an HTML page at `/` displaying all job listings in a table with columns: title, company (source name), department, location, status, and first seen date.

#### Scenario: Jobs page renders listing table
- **WHEN** a user visits `/`
- **THEN** they see a table of all job listings ordered by most recently seen

#### Scenario: Jobs page title search
- **WHEN** a user enters "engineer" in the search bar and submits
- **THEN** only listings whose title contains "engineer" (case-insensitive) are shown

#### Scenario: Jobs page status filter
- **WHEN** a user selects "active" from the status filter
- **THEN** only active listings are shown

#### Scenario: Jobs page source filter
- **WHEN** a user selects a source from the source filter
- **THEN** only listings from that source are shown

#### Scenario: Job title links to external listing
- **WHEN** a user clicks on a job listing title
- **THEN** they are taken to the external job posting URL in a new tab

### Requirement: Sources page
The application SHALL serve an HTML page at `/sources/` displaying all sources in a table with columns: name, platform, board ID, and active status.

#### Scenario: Sources page renders table
- **WHEN** a user visits `/sources/`
- **THEN** they see a table of all configured sources

### Requirement: Runs page
The application SHALL serve an HTML page at `/runs/` displaying all ingestion runs in a table with columns: ID, status, started at, finished at, sources processed, listings created, and listings expired.

#### Scenario: Runs page renders table
- **WHEN** a user visits `/runs/`
- **THEN** they see a table of all runs ordered by most recent first

### Requirement: Navigation between pages
All frontend pages SHALL include a navigation header with links to Jobs (/), Sources (/sources/), Runs (/runs/), and Admin (/admin/).

#### Scenario: Navigation links present
- **WHEN** a user visits any frontend page
- **THEN** the navigation header contains links to all pages

### Requirement: Professional styling
All frontend pages SHALL use a consistent dark neutral color palette with clean typography and a single CSS file. The visual style SHALL be professional and minimal.

#### Scenario: Consistent styling across pages
- **WHEN** a user navigates between pages
- **THEN** all pages share the same visual style, colors, and typography
