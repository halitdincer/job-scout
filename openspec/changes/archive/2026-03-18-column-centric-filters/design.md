## Context

The jobs page currently has two filter mechanisms in the Filters panel: a Quick Filters section (synced header filter dropdowns) and an Advanced Logic section (nested AND/OR/NOT group builder). Both produce the same backend filter AST, but the group builder adds complexity that most users never need. AG Grid solves this by putting filters on each column: click a column header, see its rules, add more. The Filters panel then shows a flat overview of all active per-column rules.

The backend filter expression engine (`core/filter_expression.py`) and API contract (`GET /api/jobs/?filter=...`) remain unchanged because a flat list of per-column rules serializes to `{op: "and", children: [...predicates]}`, which the engine already handles.

## Goals / Non-Goals

**Goals:**
- Replace the group-based filter builder with a flat per-column rule list.
- Add column header click popovers showing that column's active rules and an add-rule action.
- Unify the Quick Filters and Advanced Logic sections into one rule list in the Filters panel.
- Keep header filter dropdowns on the table for quick single-value selection, synced with the rule list.
- Remove group builder controls (Add Group, root group operator, nested group rendering).
- Keep the change scoped to frontend only; no backend changes.

**Non-Goals:**
- Table views / saved filter presets (future change that builds on this).
- OR logic between rules (all rules combine with AND for now; groups may return later if needed).
- Notification integration (deferred; filter AST contract unchanged).
- Replacing Tabulator with AG Grid.

## Decisions

### Decision: Flat AND-only rule list replaces group builder
All filter rules combine with AND. No nested groups, no OR, no NOT wrapper UI. The backend still supports these operators, but the UI does not expose them in this change.

Rationale: Covers the vast majority of real filtering use cases. Simplifies the UI dramatically. Groups can be reintroduced later behind an "Advanced" toggle if needed.

Alternatives considered:
- Keep groups but hide by default: still requires maintaining group rendering code and confuses the mental model.
- Flat list with per-rule NOT toggle: adds complexity without clear user demand.

### Decision: Column header click shows filter popover
Clicking a column header (or a filter icon on it) opens a small popover anchored to that column. The popover shows existing rules for that column and lets the user add a new rule. This matches AG Grid's column menu filter tab.

Rationale: Users think in terms of columns, not abstract filter fields. Putting rules on the column they relate to is the most discoverable interaction.

Alternatives considered:
- Only use the Filters side panel: loses the column-centric discoverability.
- Custom header element per column: Tabulator's headerMenu or headerPopup API handles this without replacing header rendering.

### Decision: Filters panel shows all rules grouped by column
The Filters panel becomes a read/edit view of all active per-column rules. Rules are visually grouped under column name headers. Each rule row has operator + value + remove. An "Add Rule" action per column section adds a new rule for that column.

Rationale: Gives users a single place to see everything at once while keeping the per-column mental model.

### Decision: Header filter dropdowns remain and sync bidirectionally
Existing Tabulator header filter dropdowns (list selectors for enum/array/date columns) stay on the table. Setting one creates a corresponding rule in the per-column list. Removing a rule clears the header filter. This replaces the old quick-filter sync machinery with a simpler model.

Rationale: Header dropdowns are fast for single-value filtering. Removing them would regress UX for the most common case.

### Decision: Remove all group/tree rendering code
Delete `renderGroup`, `createGroupNode`, `normalizeGroupChildren`, the root group operator select, Add Group button, and related state management. The `advancedState` variable becomes a flat array of rule objects instead of a tree.

Rationale: Dead code removal. The group UI is being replaced, not hidden.

## Risks / Trade-offs

- [Loss of OR/NOT UI expressiveness] -> Acceptable trade-off. Backend still supports it. Can reintroduce via "Advanced mode" toggle later if users request it.
- [Column header popover positioning on narrow viewports] -> Mitigation: Use Tabulator's built-in headerPopup API which handles overflow. Fall back to the Filters panel on mobile.
- [Tabulator headerPopup API limitations] -> Mitigation: If headerPopup doesn't support dynamic content well enough, use headerMenu with custom items instead. Both are well-supported.
- [Rule count per column could grow large] -> Mitigation: Most columns will have 0-2 rules. No pagination needed for v1.
