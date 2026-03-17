## MODIFIED Requirements

### Requirement: Column sorting
Every column in the jobs table SHALL be sortable by clicking the column header. Date columns SHALL use a custom ISO string comparator that sorts chronologically without requiring external date libraries. Null or empty date values SHALL sort to the end regardless of sort direction.

#### Scenario: Sort by title ascending
- **WHEN** a user clicks the Title column header
- **THEN** listings are sorted alphabetically by title (A-Z)

#### Scenario: Sort by first seen descending
- **WHEN** a user clicks the First Seen column header twice
- **THEN** listings are sorted by first seen date, newest first

#### Scenario: Sort by published at ascending
- **WHEN** a user clicks the Published At column header
- **THEN** listings are sorted by published date, oldest first

#### Scenario: Null dates sort to end
- **WHEN** a user sorts by Published At and some listings have null published dates
- **THEN** listings with null Published At appear at the bottom

### Requirement: Header filters
Each column SHALL have a header filter. Categorical columns (Company, Type, Workplace, Country, Region, City, Status) SHALL use a value-list dropdown auto-populated from column data. Text columns (Title, Department, Location (Raw)) SHALL use a text input filter. Date columns (Published At, First Seen, Last Seen, Updated At Source, Expired At) SHALL use a dropdown filter with preset time-range options. The preset options SHALL be: "Today", "Last 7 days", "Last 14 days", "Last 30 days", "Last 90 days". The filter SHALL be clearable and SHALL match rows whose date value falls within the selected time range relative to the current moment.

#### Scenario: Filter by company dropdown
- **WHEN** a user clicks the Company header filter and selects "Stripe"
- **THEN** only listings from Stripe are shown

#### Scenario: Filter by title text
- **WHEN** a user types "engineer" in the Title header filter
- **THEN** only listings whose title contains "engineer" (case-insensitive) are shown

#### Scenario: Value-list shows actual values
- **WHEN** a user clicks the Type header filter dropdown
- **THEN** the dropdown shows "Full-time", "Part-time", etc. populated from the actual data

#### Scenario: Filter First Seen by Last 7 days
- **WHEN** a user selects "Last 7 days" in the First Seen header filter
- **THEN** only listings first seen within the last 7 days are shown

#### Scenario: Filter Published At by Today
- **WHEN** a user selects "Today" in the Published At header filter
- **THEN** only listings published today (UTC) are shown

#### Scenario: Clear date range filter
- **WHEN** a user clears the First Seen header filter dropdown
- **THEN** all rows are shown again (no date filter applied)

#### Scenario: Date range filter coexists with other filters
- **WHEN** a user selects a company filter and a "Last 30 days" First Seen filter
- **THEN** only listings matching both criteria are shown

#### Scenario: Null date excluded from range filter
- **WHEN** a listing has a null Published At value and user selects "Last 7 days"
- **THEN** that listing is not shown
