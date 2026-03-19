## Why

The current filters panel uses a group-based builder (AND/OR/NOT with nested children) that is powerful but overly complex for day-to-day use. AG Grid's approach is simpler: filters live on each column, and you define rules per column. Clicking a column header shows its active rules and lets you add more. This change replaces the group builder with a flat, column-centric model that covers common cases naturally while keeping the backend filter AST intact for future notification reuse.

## What Changes

- Replace the group-based filter builder UI (AND/OR/NOT tree) with a flat per-column rule list. All rules combine with AND globally.
- Remove the quick filters / advanced logic split in the Filters panel. There is now one unified list of per-column rules.
- When clicking a column header in the table, show a popover with that column's active rules and an option to add more rules for that column.
- The Filters panel shows all active rules grouped by column for a full overview.
- Remove group builder controls (Add Group, root group operator select, nested group rendering).
- Keep the existing backend filter expression engine unchanged since the flat rule list serializes to the same `{op: "and", children: [...predicates]}` shape.
- Header filter dropdowns on the table remain for quick single-value selection and stay synced with the per-column rules.

## Capabilities

### New Capabilities

### Modified Capabilities
- `interactive-jobs-table`: Replace group-based filter builder with per-column rule list UI, add column header filter popovers, and unify quick/advanced filter sections into one rule list.
- `filter-expression-engine`: No schema changes. The flat rule list produces the same AST shape already supported. Noting here for awareness only.

## Impact

- **Frontend**: Major rework of the Filters panel and addition of column header popovers in `core/templates/core/jobs.html` and `core/static/core/style.css`.
- **Backend**: No changes needed. The filter expression engine and API contract remain identical.
- **Testing**: Page tests updated to reflect new panel structure. No API test changes needed.
- **Future**: Table views (saved filter presets per group) will build on the per-column rule model introduced here.
