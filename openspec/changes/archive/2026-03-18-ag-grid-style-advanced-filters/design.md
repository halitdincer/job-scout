## Context

The current jobs experience uses Tabulator header filters in `core/templates/core/jobs.html` and only supports simple per-column matching. The backend jobs API in `core/views.py` supports only primitive query params (`source_id`, `status`), so complex expressions cannot be represented, persisted, or reused. The product direction now requires AG Grid-like filter expressiveness (nested logic, NOT, multiple clauses on one column) while retaining existing quick filters and delivering a mobile-friendly panel UX.

This change must also establish a stable filtering contract that can later be reused by notifications without redesigning filter semantics.

## Goals / Non-Goals

**Goals:**
- Define a canonical, typed filter expression schema shared by frontend and backend.
- Add server-side filter evaluation for job queries with predictable semantics across text, enum, array, and date fields.
- Preserve existing Tabulator header filters as quick filters and allow combining them with advanced filters.
- Deliver AG Grid-like Columns and Filters side panels with responsive behavior that works on mobile.
- Ensure the resulting filter representation is persistence-ready for future notification features.

**Non-Goals:**
- Building notification CRUD, scheduling, delivery channels, or alert frequency management.
- Replacing Tabulator with AG Grid.
- Full query-language free text parser in this phase.

## Decisions

### Decision: Introduce a canonical filter AST payload
Use a JSON AST as the system contract:
- Group nodes: `and`, `or`, `not`
- Predicate nodes: `field`, `operator`, `value`

Rationale: A structured AST avoids ambiguity, maps directly to UI builder state, and is serializable for future persistence/notification reuse.

Alternatives considered:
- Ad-hoc query string syntax: compact but hard to validate and harder to power visual editing.
- Client-only filtering: simpler short term but unusable for reusable backend-driven notifications.

### Decision: Evaluate advanced filters server-side in the jobs API
Add API support for an advanced filter payload (request body or encoded query parameter) and translate AST nodes into Django `Q` objects. Keep existing `source_id` and `status` parameters for backward compatibility.

Rationale: Server evaluation creates one source of truth for filter behavior and avoids diverging semantics between table and future notifications.

Alternatives considered:
- Keep all filtering in browser: fast for small datasets but not scalable and not reusable by non-UI systems.

### Decision: Compose quick filters with advanced filters using `AND`
When both quick header filters and advanced filter AST are active, effective predicate is:
`(quick_filter_predicates) AND (advanced_filter_ast)`.

Rationale: Users expect quick filters to further narrow current results.

Alternatives considered:
- Advanced filters override quick filters: surprising and reduces utility of quick controls.

### Decision: Build AG Grid-like side panels while staying in Tabulator
Implement two slide-over panels on the jobs page:
- Columns panel for visibility toggles
- Filters panel for advanced builder

Panels use AG Grid-inspired information architecture (left list + right editor/actions), but existing Tabulator table remains the rendering engine.

Rationale: Achieves desired UX without replacing the table library.

Alternatives considered:
- Replatform to AG Grid Community: introduces migration cost and still requires custom logic for future shared filter engine.

### Decision: Field/operator registry for typed validation
Define a backend registry mapping allowed fields to data types and operator sets (for example `contains`, `not_contains`, `eq`, `in`, `is_empty`, `in_last_days`). Frontend uses same registry metadata to drive operator pickers and value input widgets.

Rationale: Prevents unsupported combinations, reduces invalid requests, and future-proofs notifications by making behavior explicit.

Alternatives considered:
- Looser dynamic operator acceptance: easier to start but causes runtime surprises and inconsistent UX.

## Risks / Trade-offs

- [Complexity increase in UI state management] -> Mitigation: Keep AST immutable with explicit helper functions and add focused tests for builder transformations.
- [Query performance regressions for complex predicates] -> Mitigation: Restrict v1 operator set, add targeted indexes if needed, and test with representative dataset sizes.
- [Semantic mismatch between quick filters and advanced filters] -> Mitigation: Document strict composition rule (`AND`) and display active filter summary chips.
- [Mobile panel usability could degrade with dense controls] -> Mitigation: Use single-column stacked editor layout under narrow breakpoints with sticky primary actions.

## Migration Plan

1. Introduce filter schema and backend evaluator behind additive API support while preserving existing query params.
2. Add advanced filters panel and shared frontend state model; keep existing header filters unchanged.
3. Wire combined filtering behavior and active summary UI.
4. Add compatibility tests for existing filters to prevent regressions.
5. Roll out by default once parity and responsive behavior are verified.

Rollback strategy:
- Feature-flag advanced filter panel and payload handling.
- If issues occur, disable advanced path and continue using existing header filters and query params.

## Open Questions

- Should advanced filter payload be sent via `POST /api/jobs/query` or as serialized JSON in `GET /api/jobs/` for shareable URLs?
- Which date timezone semantics should be normative for relative operators (`in_last_days`, `today`) in UI and backend?
- Do we require saved named filters in this same change, or only in-memory session state until notification design lands?
