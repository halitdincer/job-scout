## Why

The jobs page currently relies on simple per-column header filters, which are fast but cannot express advanced logic such as grouped conditions, NOT clauses, or multiple predicates on the same field. We need a single filter model that powers both the table experience now and future notification rules, so users can build powerful queries once and trust the same behavior everywhere.

## What Changes

- Introduce an advanced filter system with boolean groups (`AND`/`OR`/`NOT`) and typed field operators for text, enums, arrays, and dates.
- Add a new filter query API contract that accepts a structured filter expression and evaluates it server-side for job listing results.
- Keep existing header filters on the jobs table for quick filtering and combine them with the advanced filter model.
- Add an AG Grid-style mobile-responsive side panel UX for Columns and Filters while preserving current Tabulator table behavior and styling consistency.
- Add client-side filter builder UI that supports multiple conditions on the same field and clear visibility into active logic.
- Define explicit constraints so this filter model is notification-ready, but defer notification delivery workflows to a later change.

## Capabilities

### New Capabilities
- `filter-expression-engine`: Defines the canonical filter schema, validation rules, and server-side evaluation semantics shared across table querying and future notifications.

### Modified Capabilities
- `interactive-jobs-table`: Expand filtering UX and behavior to include advanced expression-based filtering, AG Grid-like columns/filters panels, and mobile-responsive panel interactions while preserving existing header filters.

## Impact

- **Backend**: New filter payload parsing/validation and queryset builder logic in jobs API paths.
- **Frontend**: New advanced filter builder UI, AG Grid-like side panels, active filter summary, and mobile interaction patterns in jobs page templates/scripts.
- **Data contract**: Jobs endpoint behavior expands to support structured filter expressions alongside existing quick filters.
- **Testing**: New API tests for expression evaluation and UI/page tests for filter panel behavior across desktop/mobile.
