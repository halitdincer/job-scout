## MODIFIED Requirements

### Requirement: Header filters
Categorical columns (Company, Type, Workplace, Country, Region, City, Status) SHALL use custom multi-select checkbox dropdown header filters populated from column data. Each dropdown SHALL include a "Select All" toggle at the top and an "(Empty)" option to filter for rows with blank/missing values. Selecting multiple values SHALL filter the table to show rows matching any of the selected values (OR logic within the column). Date columns SHALL keep preset range dropdown header filters (unchanged). Header filter selections SHALL create corresponding per-column rules in the unified rule list: multi-value selections SHALL use the `in` operator, single-value selections SHALL use `eq`, and "(Empty)" selections SHALL use `is_empty`. Clearing all selections in a header filter dropdown SHALL remove the corresponding rule from the rule list and re-apply the filter expression to the server. The multi-select dropdown SHALL display a summary label showing the count of selected values (e.g., "2 selected") or the single selected value name when only one is chosen.

#### Scenario: Filter by company dropdown with multiple values
- **WHEN** a user opens the Company header filter and checks "Stripe" and "Google"
- **THEN** only listings from Stripe or Google are shown and a corresponding `in` rule appears in the per-column rule list

#### Scenario: Filter by single company value
- **WHEN** a user opens the Company header filter and checks only "Stripe"
- **THEN** only listings from Stripe are shown and a corresponding `eq` rule appears in the per-column rule list

#### Scenario: Select All toggle checks all values
- **WHEN** a user clicks "Select All" in the Country header filter dropdown
- **THEN** all country checkboxes are checked and the filter is effectively cleared (all rows shown)

#### Scenario: Select All toggle unchecks all values
- **WHEN** a user unchecks "Select All" in the Country header filter dropdown where all values were selected
- **THEN** all country checkboxes are unchecked

#### Scenario: Empty option filters for missing values
- **WHEN** a user checks only "(Empty)" in the Country header filter dropdown
- **THEN** only listings with no country data are shown and an `is_empty` rule appears in the rule list

#### Scenario: Multi-select with Empty option
- **WHEN** a user checks "US" and "(Empty)" in the Country header filter
- **THEN** listings with country "US" or with no country data are shown

#### Scenario: Value-list shows actual values with checkboxes
- **WHEN** a user clicks the Type header filter dropdown
- **THEN** the dropdown shows checkboxes for "Full-time", "Part-time", etc. populated from the actual data, plus "Select All" and "(Empty)"

#### Scenario: Header filter summary label shows count
- **WHEN** a user selects 3 values in the Country header filter
- **THEN** the header filter cell displays "3 selected" as the summary

#### Scenario: Header filter summary label shows single value
- **WHEN** a user selects only "US" in the Country header filter
- **THEN** the header filter cell displays "US"

#### Scenario: Header filter syncs from rule list
- **WHEN** a user adds an `in` rule for Country with values "US, DE" in the Filters panel and clicks Apply
- **THEN** the Country header filter dropdown shows "US" and "DE" checked

#### Scenario: Clearing header filter removes rule
- **WHEN** a user had "Stripe" selected in the Company header filter and then unchecks it (clearing the filter)
- **THEN** the Company rule is removed from the rule list and the table re-fetches unfiltered data from the server

#### Scenario: Date column header filters unchanged
- **WHEN** a user clicks the Published At header filter
- **THEN** the dropdown shows single-select preset ranges ("Today", "Last 7 days", etc.) as before

#### Scenario: Array column multi-select
- **WHEN** a user opens the City header filter and checks "Toronto" and "Vancouver"
- **THEN** only listings with a location in Toronto or Vancouver are shown

#### Scenario: Dropdown has max height with scroll
- **WHEN** a column has more than 15 unique values
- **THEN** the dropdown shows a scrollable list with a maximum height constraint
