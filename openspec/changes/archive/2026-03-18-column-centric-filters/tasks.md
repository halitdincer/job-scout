## 1. Remove Group Builder UI

- [x] 1.1 Remove group builder HTML (root group operator select, Add Group button, Advanced Logic section header)
- [x] 1.2 Remove group builder JS (renderGroup, createGroupNode, normalizeGroupChildren, advancedState tree, serializeNode tree logic)
- [x] 1.3 Replace advancedState with a flat rules array and update serializeNode to produce `{op: "and", children: [predicates]}`
- [x] 1.4 Update page tests to assert group builder controls are absent

## 2. Unified Per-Column Rule List in Filters Panel

- [x] 2.1 Replace Quick Filters and Advanced Logic sections with a single per-column rule list grouped by column name
- [x] 2.2 Render each column section with its label, active rules (operator + value + remove), and an Add Rule action
- [x] 2.3 Wire Add Rule to append a new rule for that column with default operator and empty value
- [x] 2.4 Wire Remove to delete the rule from the flat array and re-render
- [x] 2.5 Wire Apply to serialize the flat rule list and call fetchJobs, wire Clear to reset all rules

## 3. Column Header Filter Popovers

- [x] 3.1 Add a filter icon element to each filterable column header via Tabulator column definition
- [x] 3.2 On filter icon click, render a popover anchored to the column showing that column's active rules and an Add Rule action
- [x] 3.3 Sync popover state with the Filters panel rule list (shared data, re-render both on changes)
- [x] 3.4 On mobile viewports, fall back to opening the Filters panel scrolled to the relevant column section

## 4. Header Filter Dropdown Sync

- [x] 4.1 When a header filter dropdown value is set, create or update the corresponding rule in the flat rule list
- [x] 4.2 When a rule matching a header filter column is removed, clear the corresponding header filter dropdown
- [x] 4.3 Remove old HEADER_FIELD_TO_AST / AST_FIELD_TO_HEADER / quick filter config sync machinery

## 5. Styling and Responsiveness

- [x] 5.1 Add CSS for per-column rule sections, column section headers, and popover positioning
- [x] 5.2 Ensure Filters panel renders in single-column layout on mobile with touch-friendly controls
- [x] 5.3 Remove CSS for group builder, quick filter rows, and quick filter pills

## 6. Testing and Cleanup

- [x] 6.1 Update page tests to verify per-column rule list structure and absence of group builder
- [x] 6.2 Add page test for column header filter popover markup
- [x] 6.3 Run full test suite and maintain 100% coverage
