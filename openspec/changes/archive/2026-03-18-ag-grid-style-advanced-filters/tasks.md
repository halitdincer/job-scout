## 1. Filter Schema and Validation

- [x] 1.1 Define canonical filter AST schema (group and predicate nodes) and supported field/operator registry
- [x] 1.2 Implement backend validation for filter node shape, allowed operators, and value types with clear error messages
- [x] 1.3 Add unit tests for valid nested expressions and invalid payload edge cases

## 2. Server-side Filter Evaluation

- [x] 2.1 Implement AST-to-Django-Q translation for text, enum, array, null, and date operators
- [x] 2.2 Extend jobs query endpoint contract to accept advanced filter payload while preserving existing quick-filter query params
- [x] 2.3 Add API tests for nested boolean logic, NOT clauses, and multi-predicate same-field behavior
- [x] 2.4 Add regression tests confirming legacy `source_id` and `status` filters continue to work

## 3. Jobs Page Advanced Filter UX

- [x] 3.1 Build AG Grid-style Filters side panel with group/rule builder controls (`AND`/`OR`/`NOT`)
- [x] 3.2 Support adding multiple predicates for the same field with typed operator/value inputs
- [x] 3.3 Add active-filter summary chips and clear/apply actions tied to the current expression
- [x] 3.4 Keep existing header quick filters and combine them with advanced filters using logical `AND`

## 4. AG Grid-like Columns Panel and Mobile Responsiveness

- [x] 4.1 Add AG Grid-style Columns side panel that mirrors current column visibility controls
- [x] 4.2 Implement responsive panel behavior for mobile (slide-over, touch-friendly controls, single-column form layout)
- [x] 4.3 Add page-level tests for columns/filters panel rendering and interaction affordances

## 5. Quality and Delivery

- [x] 5.1 Add end-to-end integration tests covering combined quick + advanced filtering behavior
- [x] 5.2 Verify notification-readiness by documenting/stabilizing filter payload contract for future reuse
- [x] 5.3 Run full test suite and address failures to maintain coverage requirements
