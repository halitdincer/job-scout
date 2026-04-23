/**
 * Derived reads over the store state. Kept pure so they can be composed
 * freely by renderers without hitting reducer edge cases.
 */
import { DEFAULT_SORT, OPERATOR_LABELS, FILTER_FIELD_DEFS } from "./constants.js";

export function selectExpressionForServer(state) {
  return state.filter.expression;
}

export function selectSortQueryParam(state) {
  const sort = state.sort && state.sort.length ? state.sort : DEFAULT_SORT;
  return sort.map((s) => `${s.field}:${s.dir}`).join(",");
}

/**
 * Pagination-bar label source. Clamps to >= 1 so the "Page X of Y" label
 * never reads "Page 1 of NaN" or "Page 1 of 0" before the first fetch has
 * settled or if the server ever returns a malformed envelope.
 */
export function selectDisplayTotalPages(state) {
  const total = state.data && state.data.totalPages;
  return Number.isFinite(total) && total > 0 ? total : 1;
}

/**
 * Deep-equal comparison against `view.snapshot`.
 * Returns false when no view is loaded (nothing to be dirty against).
 */
export function selectIsDirty(state) {
  const snap = state.view.snapshot;
  if (!snap) return false;
  const current = {
    filter: state.filter.expression,
    columns: {
      order: [...state.columns.order],
      visibility: { ...state.columns.visibility },
    },
    sort: state.sort.map((s) => ({ field: s.field, dir: s.dir })),
    pageSize: state.pagination.size,
  };
  return !deepEqual(current, snap);
}

export function selectFilterRulesRenderable(state) {
  return state.filter.renderable;
}

export function selectFilterSummary(state) {
  if (!state.filter.renderable) return "Custom filter";
  const rules = state.filter.rules;
  if (!rules.length) return "";
  return rules
    .map((rule) => {
      const def = FILTER_FIELD_DEFS[rule.field];
      const label = def ? def.label : rule.field;
      const op = OPERATOR_LABELS[rule.operator] || rule.operator;
      if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
        return `${label} ${op}`;
      }
      return `${label} ${op} ${rule.value}`;
    })
    .join(" AND ");
}

/**
 * Build the JSON body for POST/PUT `/api/views/`. Shape must match the
 * server-side validators in `core/views.py::_validate_saved_view_*`:
 *   - sort: [{ field, dir }]  (never the legacy { column, dir } shape)
 *   - columns: [{ field, visible }]  (visible defaults to true)
 *   - config: { page_size }
 */
export function selectSavedViewPayload(state, name) {
  return {
    name,
    filter_expression: state.filter.expression,
    columns: state.columns.order.map((field) => ({
      field,
      visible: state.columns.visibility[field] !== false,
    })),
    sort: state.sort.map((s) => ({ field: s.field, dir: s.dir })),
    config: { page_size: state.pagination.size },
  };
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object") {
    if (Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}
