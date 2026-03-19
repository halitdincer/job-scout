## 1. Fix Header Filter Removal Bug

- [x] 1.1 In the `dataFiltered` event handler, detect when a header filter value is cleared (empty/null) and remove the corresponding rule from `rules[]` by matching field and operator type (`eq`/`in`/`in_last_days`/`is_empty`)
- [x] 1.2 After removing a rule due to header filter clearing, re-serialize the expression and re-fetch from the server via `fetchJobs()`
- [x] 1.3 Write tests verifying that clearing a header filter dropdown removes the rule and triggers a server re-fetch

## 2. Build Custom Multi-Select Dropdown Component

- [x] 2.1 Create a `multiSelectHeaderFilter` function that returns a container element with a summary label and serves as a Tabulator custom header filter editor
- [x] 2.2 Implement the dropdown panel with checkboxes for each unique value, positioned with `position: fixed` and calculated coordinates to avoid clipping
- [x] 2.3 Add "Select All" toggle checkbox at the top of the dropdown — checking it selects all values, unchecking it deselects all values
- [x] 2.4 Add "(Empty)" checkbox option below "Select All" to filter for rows with blank/null/empty-array values
- [x] 2.5 Implement the summary label: show single value name when one selected, "N selected" when multiple, empty when none
- [x] 2.6 Add max-height with `overflow-y: auto` on the dropdown for columns with many values
- [x] 2.7 Implement click-outside-to-close behavior for the dropdown
- [x] 2.8 Write tests for the multi-select component rendering, selection toggling, and value collection

## 3. Integrate Multi-Select with Tabulator Column Definitions

- [x] 3.1 Replace `headerFilter: "list"` with the custom `multiSelectHeaderFilter` editor on Company, Type, Workplace, Status columns (scalar fields)
- [x] 3.2 Replace `headerFilter: "list"` with the custom `multiSelectHeaderFilter` editor on Country, Region, City columns (array fields), preserving the `arrayValuesLookup` pattern for value population
- [x] 3.3 Update `headerFilterFunc` for multi-select columns to accept an array of selected values and return true if the row value matches any selected value (OR logic)
- [x] 3.4 For array columns, the multi-select filter function must check if any element of the row's array is in the selected values set
- [x] 3.5 Handle the "(Empty)" selection in the filter function — include rows where the field value is null, empty string, or empty array
- [x] 3.6 Write tests verifying multi-select header filters correctly filter table rows client-side

## 4. Update Bidirectional Rule Sync for Multi-Select

- [x] 4.1 Update `headerFilterToRule` to handle array values from multi-select: create `in` rule for multiple values, `eq` for single value, `is_empty` for "(Empty)" only
- [x] 4.2 Update `syncHeaderFromRules` to set multi-select header filter values from `in` rules (check matching values in the dropdown) and `eq` rules (check single value)
- [x] 4.3 Update the `dataFiltered` event handler to handle multi-select filter values (arrays) when syncing to rules
- [x] 4.4 Ensure clearing all checkboxes in a multi-select dropdown removes the rule and triggers server re-fetch (integrates with fix from task 1.1)
- [x] 4.5 Write tests verifying bidirectional sync between multi-select header filters and the rule list

## 5. CSS Styles for Multi-Select Dropdown

- [x] 5.1 Add styles for the multi-select dropdown container (fixed positioning, border, background, shadow, z-index above Tabulator headers)
- [x] 5.2 Style checkbox rows with label alignment, hover state, and padding
- [x] 5.3 Style "Select All" separator (bottom border to visually separate from value checkboxes)
- [x] 5.4 Style "(Empty)" option with italic or distinct text treatment
- [x] 5.5 Style the summary label in the header filter cell (truncation for long text, muted color when no selection)
- [x] 5.6 Ensure dropdown styles are consistent with the existing dark theme

## 6. Update Spec

- [x] 6.1 Verify all spec scenarios pass by manual testing: multi-select filtering, Select All, Empty, filter removal, rule sync, date filters unchanged
