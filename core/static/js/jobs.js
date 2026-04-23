/**
 * Jobs page bootstrap.
 *
 * Architecture:
 *   - All mutable UI state lives in a single store (reducer.js).
 *   - Every interaction dispatches an action; renderers re-paint from state.
 *   - Tabulator is treated as a presentational grid; its callbacks dispatch
 *     only, and renderer-driven writes are detected via `ui.renderToken`.
 *
 * Replaces the legacy inline script in `core/templates/core/jobs.html`.
 */
import { createStore } from "./store.js";
import { createInitialState, reducer } from "./reducer.js";
import * as A from "./actions.js";
import {
  EMPLOYMENT_LABELS,
  WORKPLACE_LABELS,
  OPERATOR_LABELS,
  FILTER_FIELD_DEFS,
  FIELD_ORDER,
  EMPTY_SENTINEL,
  DATE_RANGE_PRESETS,
} from "./constants.js";
import {
  selectDisplayTotalPages,
  selectFilterPills,
  selectIsDirty,
  selectSavedViewPayload,
} from "./selectors.js";
import { attachFetchEffect } from "./effects/fetch.js";

// ---------------------------------------------------------------------------
// Formatters and helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function timeAgoFormatter(cell) {
  return cell.getValue() ? timeAgo(cell.getValue()) : "";
}
function timeAgoTooltip(e, cell) {
  return formatDateTime(cell.getValue());
}
function titleFormatter(cell) {
  const val = cell.getValue();
  if (!val) return "";
  const row = cell.getRow().getData();
  const className = row.seen ? "job-link seen-link" : "job-link";
  return (
    `<a class="${className}" data-listing-id="${row.id}" href="${row.url}" ` +
    `target="_blank" rel="noopener">${val.replace(/</g, "&lt;")}</a>`
  );
}
function isoDateSorter(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}
function arrayJoinFormatter(cell) {
  const val = cell.getValue();
  return val && Array.isArray(val) ? val.join(", ") : "";
}

function normalizeDateHeaderValue(value) {
  if (value === null || typeof value === "undefined") return "";
  const normalized = String(value).trim();
  if (!normalized) return "";
  if (["0", "7", "14", "30", "90"].indexOf(normalized) === -1) return "";
  return normalized;
}

function dateRangeFilter(headerValue, rowValue) {
  const normalizedHeader = normalizeDateHeaderValue(headerValue);
  if (!normalizedHeader) return true;
  if (!rowValue) return false;
  const days = parseInt(normalizedHeader, 10);
  const rowTime = new Date(rowValue).getTime();
  if (isNaN(rowTime)) return false;
  if (days === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return rowValue.slice(0, 10) === today;
  }
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return rowTime >= cutoff;
}

function normalizeMultiSelectValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed[0] === "[") {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fall through
      }
    }
    if (trimmed.indexOf(",") !== -1) {
      return trimmed
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

function collectUniqueValues(tableData, field, isArray) {
  const seen = {};
  const values = [];
  tableData.forEach((row) => {
    const val = row[field];
    if (isArray) {
      if (val && Array.isArray(val)) {
        val.forEach((v) => {
          if (v && !seen[v]) {
            seen[v] = true;
            values.push(v);
          }
        });
      }
    } else {
      if (val && !seen[val]) {
        seen[val] = true;
        values.push(val);
      }
    }
  });
  values.sort();
  return values;
}

function multiSelectFilter(headerValue, rowValue, rowData, filterParams) {
  const selectedValues = normalizeMultiSelectValue(headerValue);
  if (!selectedValues.length) return true;
  const hasEmpty = selectedValues.indexOf(EMPTY_SENTINEL) !== -1;
  const realValues = selectedValues.filter((v) => v !== EMPTY_SENTINEL);
  const isArray = filterParams && filterParams.isArrayField;
  if (isArray) {
    const arr = rowValue && Array.isArray(rowValue) ? rowValue : [];
    const isEmpty = arr.length === 0;
    if (hasEmpty && isEmpty) return true;
    for (let i = 0; i < realValues.length; i += 1) {
      if (arr.indexOf(realValues[i]) !== -1) return true;
    }
    return false;
  }
  const val = rowValue;
  const isEmpty2 = !val || val === "";
  if (hasEmpty && isEmpty2) return true;
  if (realValues.indexOf(val) !== -1) return true;
  return false;
}

function mapApiRows(data) {
  return data.map((item) => {
    const locs = item.locations || [];
    item.locations_display = locs.map((l) => l.name).join(", ") || "";
    item.employment_type_label =
      EMPLOYMENT_LABELS[item.employment_type] || item.employment_type || "";
    item.workplace_type_label =
      WORKPLACE_LABELS[item.workplace_type] || item.workplace_type || "";
    item.department = item.department || "";
    item.country = item.country || [];
    item.region = item.region || [];
    item.city = item.city || [];
    item.team = item.team || "";
    item.seen = !!item.seen;
    return item;
  });
}

// ---------------------------------------------------------------------------
// Multi-select header filter widget (Tabulator editor/filter combo)
// ---------------------------------------------------------------------------

function multiSelectHeaderFilter(cell, onRendered, success, cancel, editorParams) {
  const field = cell.getColumn().getField();
  const isArray = editorParams && editorParams.isArrayField;
  const container = document.createElement("div");
  container.className = "ms-header-filter";
  const summaryEl = document.createElement("div");
  summaryEl.className = "ms-summary";
  summaryEl.textContent = "";
  container.appendChild(summaryEl);
  let dropdown = null;
  let selected = {};
  let allValues = [];
  let selectAllCb = null;

  function getSelected() {
    return Object.keys(selected).filter((k) => selected[k]);
  }

  function updateSummary() {
    const sel = getSelected().filter((v) => v !== EMPTY_SENTINEL);
    const hasEmpty = selected[EMPTY_SENTINEL];
    const total = sel.length + (hasEmpty ? 1 : 0);
    if (total === 0) {
      summaryEl.textContent = "";
      summaryEl.classList.remove("ms-summary-active");
    } else if (total === 1 && sel.length === 1) {
      summaryEl.textContent = sel[0];
      summaryEl.classList.add("ms-summary-active");
    } else {
      summaryEl.textContent = `${total} selected`;
      summaryEl.classList.add("ms-summary-active");
    }
  }

  function updateSelectAll() {
    if (!selectAllCb) return;
    const allChecked =
      allValues.every((v) => selected[v]) && selected[EMPTY_SENTINEL];
    selectAllCb.checked = allChecked;
    selectAllCb.indeterminate = !allChecked && getSelected().length > 0;
  }

  function emitValue() {
    const sel = getSelected();
    success(sel.length > 0 ? sel : "");
  }

  function closeDropdown() {
    if (dropdown && dropdown.parentNode) {
      dropdown.parentNode.removeChild(dropdown);
      dropdown = null;
    }
  }

  function openDropdown() {
    if (dropdown) {
      closeDropdown();
      return;
    }
    const tableData = cell.getColumn().getTable().getData();
    allValues = collectUniqueValues(tableData, field, isArray);
    dropdown = document.createElement("div");
    dropdown.className = "ms-dropdown";
    const rect = container.getBoundingClientRect();
    dropdown.style.position = "fixed";
    dropdown.style.top = `${rect.bottom + 2}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.minWidth = `${Math.max(rect.width, 160)}px`;

    const saRow = document.createElement("label");
    saRow.className = "ms-option ms-select-all";
    selectAllCb = document.createElement("input");
    selectAllCb.type = "checkbox";
    const saSpan = document.createElement("span");
    saSpan.textContent = "Select All";
    saRow.appendChild(selectAllCb);
    saRow.appendChild(saSpan);
    selectAllCb.addEventListener("change", () => {
      const checked = selectAllCb.checked;
      allValues.forEach((v) => {
        selected[v] = checked;
      });
      selected[EMPTY_SENTINEL] = checked;
      dropdown.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        cb.checked = checked;
      });
      selectAllCb.indeterminate = false;
      updateSummary();
      emitValue();
    });
    dropdown.appendChild(saRow);

    const emptyRow = document.createElement("label");
    emptyRow.className = "ms-option ms-empty-option";
    const emptyCb = document.createElement("input");
    emptyCb.type = "checkbox";
    emptyCb.checked = !!selected[EMPTY_SENTINEL];
    const emptySpan = document.createElement("span");
    emptySpan.textContent = "(Empty)";
    emptyRow.appendChild(emptyCb);
    emptyRow.appendChild(emptySpan);
    emptyCb.addEventListener("change", () => {
      selected[EMPTY_SENTINEL] = emptyCb.checked;
      updateSelectAll();
      updateSummary();
      emitValue();
    });
    dropdown.appendChild(emptyRow);

    allValues.forEach((val) => {
      const row = document.createElement("label");
      row.className = "ms-option";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!selected[val];
      const span = document.createElement("span");
      span.textContent = val;
      row.appendChild(cb);
      row.appendChild(span);
      cb.addEventListener("change", () => {
        selected[val] = cb.checked;
        updateSelectAll();
        updateSummary();
        emitValue();
      });
      dropdown.appendChild(row);
    });

    updateSelectAll();
    document.body.appendChild(dropdown);

    function onClickOutside(e) {
      if (!dropdown) return;
      if (dropdown.contains(e.target) || container.contains(e.target)) return;
      closeDropdown();
      document.removeEventListener("mousedown", onClickOutside, true);
    }
    setTimeout(() => {
      document.addEventListener("mousedown", onClickOutside, true);
    }, 0);
  }

  container.setSelected = (vals) => {
    selected = {};
    if (vals && Array.isArray(vals)) {
      vals.forEach((v) => {
        selected[v] = true;
      });
    }
    updateSummary();
  };

  container.addEventListener("click", (e) => {
    e.stopPropagation();
    openDropdown();
  });

  onRendered(() => {
    const initial = cell.getValue();
    if (initial && Array.isArray(initial)) {
      initial.forEach((v) => {
        selected[v] = true;
      });
      updateSummary();
    }
  });

  return container;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const dateFilterParams = { values: DATE_RANGE_PRESETS, clearable: true };

const COLUMN_DEFS = [
  { title: "Company", field: "source_name", headerFilter: multiSelectHeaderFilter, headerFilterParams: { isArrayField: false }, headerFilterFunc: multiSelectFilter, headerFilterFuncParams: { isArrayField: false }, minWidth: 120, widthGrow: 1 },
  { title: "Title", field: "title", formatter: titleFormatter, formatterParams: { allowHtml: true }, minWidth: 250, widthGrow: 3 },
  { title: "Country", field: "country", formatter: arrayJoinFormatter, headerFilter: multiSelectHeaderFilter, headerFilterParams: { isArrayField: true }, headerFilterFunc: multiSelectFilter, headerFilterFuncParams: { isArrayField: true }, minWidth: 80 },
  { title: "City", field: "city", formatter: arrayJoinFormatter, headerFilter: multiSelectHeaderFilter, headerFilterParams: { isArrayField: true }, headerFilterFunc: multiSelectFilter, headerFilterFuncParams: { isArrayField: true }, minWidth: 100 },
  { title: "Published At", field: "published_at", formatter: timeAgoFormatter, tooltip: timeAgoTooltip, sorter: isoDateSorter, headerFilter: "list", headerFilterParams: dateFilterParams, headerFilterFunc: dateRangeFilter, minWidth: 120 },
  { title: "First Seen", field: "first_seen_at", formatter: timeAgoFormatter, tooltip: timeAgoTooltip, sorter: isoDateSorter, headerFilter: "list", headerFilterParams: dateFilterParams, headerFilterFunc: dateRangeFilter, minWidth: 120 },
  { title: "Location (Raw)", field: "locations_display", minWidth: 150, widthGrow: 1, visible: false },
  { title: "Type", field: "employment_type_label", headerFilter: multiSelectHeaderFilter, headerFilterParams: { isArrayField: false }, headerFilterFunc: multiSelectFilter, headerFilterFuncParams: { isArrayField: false }, minWidth: 100, visible: false },
  { title: "Department", field: "department", minWidth: 120, visible: false },
  { title: "Workplace", field: "workplace_type_label", headerFilter: multiSelectHeaderFilter, headerFilterParams: { isArrayField: false }, headerFilterFunc: multiSelectFilter, headerFilterFuncParams: { isArrayField: false }, minWidth: 100, visible: false },
  { title: "Region", field: "region", formatter: arrayJoinFormatter, headerFilter: multiSelectHeaderFilter, headerFilterParams: { isArrayField: true }, headerFilterFunc: multiSelectFilter, headerFilterFuncParams: { isArrayField: true }, minWidth: 100, visible: false },
  { title: "Status", field: "status", headerFilter: multiSelectHeaderFilter, headerFilterParams: { isArrayField: false }, headerFilterFunc: multiSelectFilter, headerFilterFuncParams: { isArrayField: false }, minWidth: 90, visible: false },
  { title: "Last Seen", field: "last_seen_at", formatter: timeAgoFormatter, tooltip: timeAgoTooltip, sorter: isoDateSorter, headerFilter: "list", headerFilterParams: dateFilterParams, headerFilterFunc: dateRangeFilter, minWidth: 120, visible: false },
  { title: "Team", field: "team", minWidth: 120, visible: false },
  { title: "Updated At Source", field: "updated_at_source", formatter: timeAgoFormatter, tooltip: timeAgoTooltip, sorter: isoDateSorter, headerFilter: "list", headerFilterParams: dateFilterParams, headerFilterFunc: dateRangeFilter, minWidth: 120, visible: false },
  { title: "Expired At", field: "expired_at", formatter: timeAgoFormatter, tooltip: timeAgoTooltip, sorter: isoDateSorter, headerFilter: "list", headerFilterParams: dateFilterParams, headerFilterFunc: dateRangeFilter, minWidth: 120, visible: false },
  { title: "External ID", field: "external_id", minWidth: 120, visible: false },
  { title: "Source ID", field: "source_id", minWidth: 100, visible: false },
  { title: "ID", field: "id", minWidth: 80, visible: false },
];

const DEFAULT_COLUMN_ORDER = COLUMN_DEFS.map((c) => c.field);
const DEFAULT_COLUMN_VISIBILITY = {};
COLUMN_DEFS.forEach((c) => {
  DEFAULT_COLUMN_VISIBILITY[c.field] = c.visible !== false;
});
const COLUMN_ORDER_KEY = "jobscout_column_order_v2";

function loadPersistedColumnOrder() {
  const raw = localStorage.getItem(COLUMN_ORDER_KEY);
  if (!raw) return DEFAULT_COLUMN_ORDER;
  try {
    const savedOrder = JSON.parse(raw);
    if (!Array.isArray(savedOrder)) return DEFAULT_COLUMN_ORDER;
    const known = new Set(DEFAULT_COLUMN_ORDER);
    const ordered = savedOrder.filter((f) => known.has(f));
    DEFAULT_COLUMN_ORDER.forEach((f) => {
      if (ordered.indexOf(f) === -1) ordered.push(f);
    });
    return ordered;
  } catch (e) {
    return DEFAULT_COLUMN_ORDER;
  }
}

function applyColumnOrderToDefs(defs, order) {
  const byField = {};
  defs.forEach((d) => {
    byField[d.field] = d;
  });
  const out = [];
  order.forEach((f) => {
    if (byField[f]) {
      out.push(byField[f]);
      delete byField[f];
    }
  });
  Object.keys(byField).forEach((f) => out.push(byField[f]));
  return out;
}

// ---------------------------------------------------------------------------
// Bridge between Tabulator header filters and rule-level filter expressions
// ---------------------------------------------------------------------------

function labelToKey(field, val) {
  if (field === "employment_type") {
    const byLabel = {};
    Object.keys(EMPLOYMENT_LABELS).forEach((k) => {
      byLabel[EMPLOYMENT_LABELS[k]] = k;
    });
    return byLabel[val] || val;
  }
  if (field === "workplace_type") {
    const byLabel = {};
    Object.keys(WORKPLACE_LABELS).forEach((k) => {
      byLabel[WORKPLACE_LABELS[k]] = k;
    });
    return byLabel[val] || val;
  }
  return val;
}

function headerFilterToPredicates(headerField, headerValue) {
  for (let i = 0; i < FIELD_ORDER.length; i += 1) {
    const field = FIELD_ORDER[i];
    const def = FILTER_FIELD_DEFS[field];
    if (def.headerField !== headerField) continue;
    if (def.type === "date") {
      const normalized = normalizeDateHeaderValue(headerValue);
      if (!normalized) return [];
      return [{ field, operator: "in_last_days", value: normalized }];
    }
    const vals = normalizeMultiSelectValue(headerValue);
    const hasEmpty = vals.indexOf(EMPTY_SENTINEL) !== -1;
    const realVals = vals
      .filter((v) => v !== EMPTY_SENTINEL)
      .map((v) => labelToKey(field, v));
    const result = [];
    if (hasEmpty) result.push({ field, operator: "is_empty", value: "" });
    if (realVals.length === 1) {
      result.push({ field, operator: "eq", value: realVals[0] });
    } else if (realVals.length > 1) {
      result.push({ field, operator: "in", value: realVals.join(", ") });
    }
    return result;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export function initJobsPage() {
  // DOM references
  const summaryNode = document.getElementById("advanced-filter-summary");
  const columnFilterSections = document.getElementById("column-filter-sections");
  const columnsPanelList = document.getElementById("columns-panel-list");
  const panelBackdrop = document.getElementById("panel-backdrop");
  const openColumnsPanelBtn = document.getElementById("open-columns-panel");
  const openFiltersPanelBtn = document.getElementById("open-filters-panel");
  const columnsSidePanel = document.getElementById("columns-side-panel");
  const filtersPanel = document.getElementById("filters-panel");
  const popoverEl = document.getElementById("col-filter-popover");
  const viewsSelect = document.getElementById("views-select");
  const viewModifiedBadge = document.getElementById("view-modified");
  const saveTrigger = document.getElementById("save-trigger");
  const saveMenu = document.getElementById("save-menu");
  const saveOverwrite = document.getElementById("save-overwrite");
  const saveAsNew = document.getElementById("save-as-new");
  const saveMenuDivider = document.getElementById("save-menu-divider");
  const deleteViewAction = document.getElementById("delete-view-action");
  const saveDialog = document.getElementById("save-dialog");
  const saveDialogName = document.getElementById("save-dialog-name");
  const saveDialogCancel = document.getElementById("save-dialog-cancel");
  const deleteDialog = document.getElementById("delete-dialog");
  const deleteDialogMsg = document.getElementById("delete-dialog-msg");
  const deleteDialogCancel = document.getElementById("delete-dialog-cancel");
  const deleteDialogConfirm = document.getElementById("delete-dialog-confirm");

  const initialOrder = loadPersistedColumnOrder();
  const store = createStore({
    reducer,
    initialState: createInitialState({
      columnOrder: initialOrder,
      columnVisibility: DEFAULT_COLUMN_VISIBILITY,
    }),
  });

  // Savedviews list lives outside the store because it's not UI state — it's
  // remote data consumed by the view selector renderer.
  let savedViews = [];
  let filterPillsExpanded = false;
  const PILL_COLLAPSE_LIMIT = 3;

  // Tabulator instance (created below, used by renderers).
  // Server owns pagination and sort — Tabulator is a presentation-only grid.
  const table = new Tabulator("#jobs-grid", {
    height: "100%",
    layout: "fitColumns",
    movableColumns: true,
    pagination: false,
    placeholder: "No jobs found",
    columns: applyColumnOrderToDefs(COLUMN_DEFS, initialOrder),
    initialSort: [{ column: "first_seen_at", dir: "desc" }],
    rowFormatter(row) {
      const rowData = row.getData();
      row.getElement().classList.toggle("tabulator-row-seen", !!rowData.seen);
    },
  });

  // -------------------------------------------------------------------------
  // Fetch effect — reactive; dispatches FETCH_* as filter/sort/pagination
  // move in the store. Replaces the imperative `fetchJobs()` of earlier
  // drafts.
  // -------------------------------------------------------------------------

  const fetchEffect = attachFetchEffect({ store, fetchImpl: fetch });

  function markListingSeen(listingId, attempt) {
    return fetch(`/api/jobs/${listingId}/seen/`, { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to mark listing as seen");
        return response.json();
      })
      .catch(() => {
        if (attempt < 1) {
          return new Promise((resolve) => {
            setTimeout(resolve, 250);
          }).then(() => markListingSeen(listingId, attempt + 1));
        }
        return null;
      });
  }

  function fetchViews() {
    return fetch("/api/views/")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        savedViews = data;
        renderViewsSelect();
      });
  }

  // -------------------------------------------------------------------------
  // Renderers (read from store state, write to DOM)
  // -------------------------------------------------------------------------

  function renderFilterPills() {
    const state = store.getState();
    summaryNode.innerHTML = "";
    if (!state.filter.renderable) {
      const hint = document.createElement("span");
      hint.className = "filter-pill-custom";
      hint.textContent = "Custom filter (open panel to edit)";
      summaryNode.appendChild(hint);
      renderFiltersBadge();
      return;
    }
    const predicates = selectFilterPills(state);
    if (!predicates.length) {
      filterPillsExpanded = false;
      renderFiltersBadge();
      return;
    }
    const shouldCollapse =
      predicates.length > PILL_COLLAPSE_LIMIT && !filterPillsExpanded;
    const visiblePreds = shouldCollapse
      ? predicates.slice(0, PILL_COLLAPSE_LIMIT)
      : predicates;

    visiblePreds.forEach((pred) => {
      const pill = document.createElement("span");
      pill.className = "filter-pill";
      const fieldLabel = FILTER_FIELD_DEFS[pred.field]
        ? FILTER_FIELD_DEFS[pred.field].label
        : pred.field;
      const opLabel = OPERATOR_LABELS[pred.operator] || pred.operator;
      let text = `${fieldLabel} ${opLabel}`;
      if (
        pred.value !== undefined &&
        pred.operator !== "is_empty" &&
        pred.operator !== "is_not_empty"
      ) {
        text += ` ${Array.isArray(pred.value) ? pred.value.join(", ") : pred.value}`;
      }
      pill.appendChild(document.createTextNode(text));
      const close = document.createElement("button");
      close.type = "button";
      close.className = "filter-pill-close";
      close.textContent = "\u00d7";
      close.addEventListener("click", () => {
        removePillByPredicate(pred);
      });
      pill.appendChild(close);
      summaryNode.appendChild(pill);
    });

    if (shouldCollapse) {
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "filter-pills-more";
      moreBtn.textContent = `+${predicates.length - PILL_COLLAPSE_LIMIT} more`;
      moreBtn.addEventListener("click", () => {
        filterPillsExpanded = true;
        renderFilterPills();
      });
      summaryNode.appendChild(moreBtn);
    } else if (predicates.length > PILL_COLLAPSE_LIMIT) {
      const lessBtn = document.createElement("button");
      lessBtn.type = "button";
      lessBtn.className = "filter-pills-more";
      lessBtn.textContent = "Show less";
      lessBtn.addEventListener("click", () => {
        filterPillsExpanded = false;
        renderFilterPills();
      });
      summaryNode.appendChild(lessBtn);
    }

    if (predicates.length > 1) {
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "filter-pills-clear";
      clearBtn.textContent = "Clear all";
      clearBtn.addEventListener("click", clearAllFilters);
      summaryNode.appendChild(clearBtn);
    }
    renderFiltersBadge();
  }

  function renderFiltersBadge() {
    const count = store.getState().filter.rules.length;
    const existing = openFiltersPanelBtn.querySelector(".toolbar-badge");
    if (existing) existing.remove();
    if (count > 0) {
      const badge = document.createElement("span");
      badge.className = "toolbar-badge";
      badge.textContent = String(count);
      openFiltersPanelBtn.appendChild(badge);
    }
  }

  function renderColumnsBadge() {
    const { visibility } = store.getState().columns;
    const hidden = Object.keys(visibility).filter((k) => !visibility[k]).length;
    const existing = openColumnsPanelBtn.querySelector(".toolbar-badge");
    if (existing) existing.remove();
    if (hidden > 0) {
      const badge = document.createElement("span");
      badge.className = "toolbar-badge";
      badge.textContent = String(hidden);
      openColumnsPanelBtn.appendChild(badge);
    }
  }

  function rulesForField(field) {
    return store.getState().filter.rules.filter((r) => r.field === field);
  }

  function renderRuleRow(rule, container, onAfterChange) {
    const row = document.createElement("div");
    row.className = "filter-rule-row";
    const topRow = document.createElement("div");
    topRow.className = "filter-rule-top";

    const opSelect = document.createElement("select");
    FILTER_FIELD_DEFS[rule.field].operators.forEach((operator) => {
      const option = document.createElement("option");
      option.value = operator;
      option.textContent = OPERATOR_LABELS[operator] || operator;
      opSelect.appendChild(option);
    });
    opSelect.value = rule.operator;
    opSelect.addEventListener("change", () => {
      store.dispatch(A.updateRuleOperator(rule.id, opSelect.value));
      onAfterChange();
    });
    topRow.appendChild(opSelect);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "chip-btn danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      store.dispatch(A.removeRule(rule.id));
      onAfterChange();
    });
    topRow.appendChild(removeBtn);

    const valueRow = document.createElement("div");
    valueRow.className = "filter-rule-value";
    const valueWrap = document.createElement("div");
    valueWrap.className = "value-wrap";
    valueRow.appendChild(valueWrap);

    // Read current operator from store so operator changes reflect immediately.
    const currentRule = store
      .getState()
      .filter.rules.find((r) => r.id === rule.id) || rule;
    const op = currentRule.operator;

    if (op === "is_empty" || op === "is_not_empty") {
      const hint = document.createElement("span");
      hint.className = "filter-value-hint";
      hint.textContent = "No value needed";
      valueWrap.appendChild(hint);
    } else {
      const input = document.createElement("input");
      input.type =
        FILTER_FIELD_DEFS[rule.field].type === "date" && op !== "in_last_days"
          ? "datetime-local"
          : "text";
      if (op === "in_last_days") {
        input.type = "number";
        input.min = "0";
        input.step = "1";
      }
      if (op === "in" || op === "not_in") {
        input.placeholder = "value1, value2";
      }
      input.value = currentRule.value || "";
      input.addEventListener("input", () => {
        store.dispatch(A.updateRuleValue(rule.id, input.value));
      });
      valueWrap.appendChild(input);
    }

    row.appendChild(topRow);
    row.appendChild(valueRow);
    container.appendChild(row);
  }

  function renderColumnFilterSections() {
    columnFilterSections.innerHTML = "";
    FIELD_ORDER.forEach((field) => {
      const fieldRules = rulesForField(field);
      const section = document.createElement("div");
      section.className = "col-filter-section";
      section.setAttribute("data-filter-section", field);

      const header = document.createElement("div");
      header.className = "col-filter-section-header";
      const label = document.createElement("span");
      label.className = "col-filter-section-label";
      label.textContent = FILTER_FIELD_DEFS[field].label;
      if (fieldRules.length) {
        const badge = document.createElement("span");
        badge.className = "col-filter-count";
        badge.textContent = String(fieldRules.length);
        label.appendChild(badge);
      }
      header.appendChild(label);

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "chip-btn";
      addBtn.textContent = "+ Rule";
      addBtn.addEventListener("click", () => {
        store.dispatch(A.addRule(field));
        renderColumnFilterSections();
        renderPopoverForField(field);
      });
      header.appendChild(addBtn);
      section.appendChild(header);

      if (fieldRules.length) {
        const body = document.createElement("div");
        body.className = "col-filter-section-body";
        fieldRules.forEach((rule) => {
          renderRuleRow(rule, body, () => {
            renderColumnFilterSections();
            renderPopoverForField(rule.field);
          });
        });
        section.appendChild(body);
      }

      columnFilterSections.appendChild(section);
    });
  }

  function closePopover() {
    popoverEl.style.display = "none";
    popoverEl.innerHTML = "";
    popoverEl.removeAttribute("data-field");
  }

  function renderPopoverForField(field) {
    if (popoverEl.getAttribute("data-field") !== field) return;
    renderPopoverContent(field);
  }

  function renderPopoverContent(field) {
    popoverEl.innerHTML = "";
    const def = FILTER_FIELD_DEFS[field];
    const heading = document.createElement("div");
    heading.className = "popover-heading";
    heading.textContent = `${def.label} Filters`;
    popoverEl.appendChild(heading);

    const fieldRules = rulesForField(field);
    if (!fieldRules.length) {
      const empty = document.createElement("p");
      empty.className = "filter-empty";
      empty.textContent = "No rules for this column";
      popoverEl.appendChild(empty);
    } else {
      fieldRules.forEach((rule) => {
        renderRuleRow(rule, popoverEl, () => {
          renderPopoverContent(field);
          renderColumnFilterSections();
        });
      });
    }

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "chip-btn";
    addBtn.textContent = "+ Add Rule";
    addBtn.addEventListener("click", () => {
      store.dispatch(A.addRule(field));
      renderPopoverContent(field);
      renderColumnFilterSections();
    });
    popoverEl.appendChild(addBtn);
  }

  function renderColumnsPanel() {
    columnsPanelList.innerHTML = "";
    const state = store.getState();
    state.columns.order.forEach((field) => {
      const def = COLUMN_DEFS.find((c) => c.field === field);
      if (!def) return;
      const label = document.createElement("label");
      label.className = "columns-panel-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = state.columns.visibility[field] !== false;
      cb.addEventListener("change", () => {
        store.dispatch(A.toggleColumnVisibility(field));
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(def.title || field));
      columnsPanelList.appendChild(label);
    });
  }

  function renderViewsSelect() {
    viewsSelect.innerHTML = '<option value="">Select a view...</option>';
    savedViews.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.name;
      viewsSelect.appendChild(opt);
    });
    const activeId = store.getState().view.id;
    if (activeId) viewsSelect.value = String(activeId);
    renderSaveMenu();
    renderDirtyBadge();
  }

  function renderSaveMenu() {
    const hasView = !!store.getState().view.id;
    saveOverwrite.style.display = hasView ? "" : "none";
    saveMenuDivider.style.display = hasView ? "" : "none";
    deleteViewAction.style.display = hasView ? "" : "none";
    if (hasView) {
      saveTrigger.classList.remove("save-trigger-disabled");
      viewsSelect.classList.remove("views-placeholder");
    } else {
      saveTrigger.classList.add("save-trigger-disabled");
      viewsSelect.classList.add("views-placeholder");
    }
  }

  function renderDirtyBadge() {
    const dirty = selectIsDirty(store.getState());
    viewModifiedBadge.style.display = dirty ? "" : "none";
  }

  // -------------------------------------------------------------------------
  // Tabulator sync: rewrite Tabulator state from store (renderer-driven).
  // Uses ui.renderToken to suppress the callbacks our own writes cause.
  // -------------------------------------------------------------------------

  let suppressTabulatorEvents = false;
  function withSuppressedEvents(fn) {
    suppressTabulatorEvents = true;
    try {
      fn();
    } finally {
      suppressTabulatorEvents = false;
    }
  }

  function syncTabulatorColumnsFromState() {
    const state = store.getState();
    withSuppressedEvents(() => {
      state.columns.order.forEach((field, i) => {
        const col = table.getColumn(field);
        if (!col) return;
        if (i === 0) {
          const first = table.getColumns()[0];
          if (first && first.getField() !== field) {
            table.moveColumn(field, first.getField(), true);
          }
        } else {
          table.moveColumn(field, state.columns.order[i - 1], false);
        }
      });
      state.columns.order.forEach((field) => {
        const col = table.getColumn(field);
        if (!col) return;
        const shouldShow = state.columns.visibility[field] !== false;
        if (shouldShow && !col.isVisible()) col.show();
        else if (!shouldShow && col.isVisible()) col.hide();
      });
    });
  }

  function syncTabulatorSortFromState() {
    const state = store.getState();
    if (!state.sort.length) return;
    withSuppressedEvents(() => {
      table.setSort(
        state.sort.map((s) => ({ column: s.field, dir: s.dir }))
      );
    });
  }

  function syncTabulatorHeaderFiltersFromRules() {
    const rules = store.getState().filter.rules;
    withSuppressedEvents(() => {
      table.clearHeaderFilter();
      const headerValues = {};
      rules.forEach((rule) => {
        const def = FILTER_FIELD_DEFS[rule.field];
        if (!def || !def.headerField) return;
        if (def.type === "date") {
          if (rule.operator !== "in_last_days") return;
          const value = (rule.value || "").toString().trim();
          if (!value) return;
          table.setHeaderFilterValue(def.headerField, value);
          return;
        }
        if (!headerValues[def.headerField]) headerValues[def.headerField] = [];
        if (rule.operator === "is_empty") {
          headerValues[def.headerField].push(EMPTY_SENTINEL);
        } else if (rule.operator === "eq") {
          let val = (rule.value || "").trim();
          if (!val) return;
          if (rule.field === "employment_type")
            val = EMPLOYMENT_LABELS[val] || val;
          if (rule.field === "workplace_type")
            val = WORKPLACE_LABELS[val] || val;
          headerValues[def.headerField].push(val);
        } else if (rule.operator === "in") {
          const rawVal = rule.value || "";
          const items =
            typeof rawVal === "string"
              ? rawVal.split(",").map((p) => p.trim()).filter(Boolean)
              : Array.isArray(rawVal)
              ? rawVal
              : [];
          items.forEach((item) => {
            let mapped = item;
            if (rule.field === "employment_type")
              mapped = EMPLOYMENT_LABELS[mapped] || mapped;
            if (rule.field === "workplace_type")
              mapped = WORKPLACE_LABELS[mapped] || mapped;
            headerValues[def.headerField].push(mapped);
          });
        }
      });
      Object.keys(headerValues).forEach((headerField) => {
        const vals = headerValues[headerField];
        if (!vals.length) return;
        table.setHeaderFilterValue(headerField, vals);
        const col = table.getColumn(headerField);
        if (col) {
          const el = col.getElement().querySelector(".ms-header-filter");
          if (el && el.setSelected) el.setSelected(vals);
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function openPanel(panelId) {
    closePanels();
    closePopover();
    const panel = document.getElementById(panelId);
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    panelBackdrop.classList.add("open");
  }

  function closePanels() {
    [columnsSidePanel, filtersPanel].forEach((panel) => {
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
    });
    panelBackdrop.classList.remove("open");
  }

  function applyFilters() {
    store.dispatch(A.commitFilter());
    syncTabulatorHeaderFiltersFromRules();
    // Fetch effect fires automatically on filter.expression change.
    renderFilterPills();
    renderDirtyBadge();
  }

  function clearAllFilters() {
    store.dispatch(A.clearRules());
    syncTabulatorHeaderFiltersFromRules();
    renderColumnFilterSections();
    closePopover();
    renderFilterPills();
    renderDirtyBadge();
  }

  function removePillByPredicate(pred) {
    const rules = store.getState().filter.rules;
    for (let i = rules.length - 1; i >= 0; i -= 1) {
      if (rules[i].field === pred.field && rules[i].operator === pred.operator) {
        store.dispatch(A.removeRule(rules[i].id));
        break;
      }
    }
    store.dispatch(A.commitFilter());
    syncTabulatorHeaderFiltersFromRules();
    renderColumnFilterSections();
    renderFilterPills();
    renderDirtyBadge();
  }

  // -------------------------------------------------------------------------
  // Header → rules bridge (when user touches Tabulator header filters directly)
  // -------------------------------------------------------------------------

  function syncRulesFromHeaderState() {
    if (suppressTabulatorEvents) return;
    const headerFilters = table.getHeaderFilters();
    const activeHeaderFields = {};
    headerFilters.forEach((f) => {
      activeHeaderFields[f.field] = f.value;
    });

    const headerOps = ["eq", "in", "in_last_days", "is_empty"];
    const fieldsWithHeaders = {};
    FIELD_ORDER.forEach((f) => {
      const def = FILTER_FIELD_DEFS[f];
      if (def.headerField) fieldsWithHeaders[def.headerField] = f;
    });

    Object.keys(fieldsWithHeaders).forEach((headerField) => {
      const filterField = fieldsWithHeaders[headerField];
      let headerValue = activeHeaderFields[headerField];
      if (FILTER_FIELD_DEFS[filterField].type === "date") {
        headerValue = normalizeDateHeaderValue(headerValue);
      } else {
        headerValue = normalizeMultiSelectValue(headerValue);
      }
      const isEmpty =
        !headerValue ||
        headerValue === "" ||
        (Array.isArray(headerValue) && headerValue.length === 0);

      // Remove any existing header-sourced rules for this field.
      const currentRules = store.getState().filter.rules;
      currentRules
        .filter(
          (r) => r.field === filterField && headerOps.indexOf(r.operator) !== -1
        )
        .forEach((r) => store.dispatch(A.removeRule(r.id)));

      if (!isEmpty) {
        const newPreds = headerFilterToPredicates(headerField, headerValue);
        newPreds.forEach((pred) => {
          store.dispatch(A.addRule(pred.field));
          const added = store.getState().filter.rules.slice(-1)[0];
          store.dispatch(A.updateRuleOperator(added.id, pred.operator));
          store.dispatch(A.updateRuleValue(added.id, pred.value || ""));
        });
      }
    });

    store.dispatch(A.commitFilter());
    renderFilterPills();
    if (filtersPanel.classList.contains("open")) {
      renderColumnFilterSections();
    }
    renderDirtyBadge();
  }

  // -------------------------------------------------------------------------
  // Saved view application
  // -------------------------------------------------------------------------

  function applyView(view) {
    // Load into store — this takes its own snapshot.
    store.dispatch(A.loadView(view));
    // Update persisted column order to match the view.
    const state = store.getState();
    localStorage.setItem(
      COLUMN_ORDER_KEY,
      JSON.stringify(state.columns.order)
    );
    // Write Tabulator state from store.
    syncTabulatorColumnsFromState();
    syncTabulatorSortFromState();
    syncTabulatorHeaderFiltersFromRules();
    renderColumnFilterSections();
    renderColumnsPanel();
    renderColumnsBadge();
    renderFilterPills();
    renderViewsSelect();
    renderDirtyBadge();
  }

  function clearViewSelection() {
    store.dispatch(A.clearView());
    renderViewsSelect();
  }

  // -------------------------------------------------------------------------
  // DOM event wiring
  // -------------------------------------------------------------------------

  openColumnsPanelBtn.addEventListener("click", () => {
    renderColumnsPanel();
    openPanel("columns-side-panel");
  });
  openFiltersPanelBtn.addEventListener("click", () => {
    renderColumnFilterSections();
    openPanel("filters-panel");
  });
  document.getElementById("reset-columns").addEventListener("click", () => {
    store.dispatch(
      A.resetColumns(DEFAULT_COLUMN_ORDER, DEFAULT_COLUMN_VISIBILITY)
    );
    localStorage.removeItem(COLUMN_ORDER_KEY);
    syncTabulatorColumnsFromState();
    renderColumnsPanel();
    renderColumnsBadge();
    renderDirtyBadge();
  });
  panelBackdrop.addEventListener("click", () => {
    closePanels();
    closePopover();
  });
  document.querySelectorAll("[data-close-panel]").forEach((btn) => {
    btn.addEventListener("click", closePanels);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanels();
      closePopover();
    }
  });
  document.addEventListener("click", (e) => {
    if (
      popoverEl.style.display !== "none" &&
      !popoverEl.contains(e.target) &&
      !e.target.classList.contains("col-filter-icon")
    ) {
      closePopover();
    }
  });

  document.getElementById("apply-filters").addEventListener("click", applyFilters);
  document.getElementById("clear-all-filters").addEventListener("click", clearAllFilters);

  document.getElementById("jobs-grid").addEventListener("click", (event) => {
    const listingLink = event.target.closest("a[data-listing-id]");
    if (!listingLink) return;
    const listingId = parseInt(listingLink.getAttribute("data-listing-id"), 10);
    if (isNaN(listingId)) return;
    table.updateData([{ id: listingId, seen: true }]);
    markListingSeen(listingId, 0);
  });

  // Tabulator events → store
  table.on("columnMoved", () => {
    if (suppressTabulatorEvents) return;
    const order = table.getColumns().map((c) => c.getField());
    localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
    store.dispatch(A.setColumnOrder(order));
  });
  table.on("headerFilterChanged", syncRulesFromHeaderState);
  table.on("dataFiltered", syncRulesFromHeaderState);
  table.on("dataSorted", (sorters) => {
    if (suppressTabulatorEvents) return;
    const nextSort = sorters.map((s) => ({ field: s.field, dir: s.dir }));
    store.dispatch(A.setSort(nextSort));
    renderDirtyBadge();
  });
  table.on("columnVisibilityChanged", (col, visible) => {
    if (suppressTabulatorEvents) return;
    const field = col.getField();
    const currentVisibility =
      store.getState().columns.visibility[field] !== false;
    if (currentVisibility !== visible) {
      store.dispatch(A.toggleColumnVisibility(field));
    }
    renderColumnsBadge();
    renderDirtyBadge();
  });

  // -------------------------------------------------------------------------
  // Saved views wiring
  // -------------------------------------------------------------------------

  viewsSelect.addEventListener("change", () => {
    const selectedId = viewsSelect.value;
    if (!selectedId) {
      clearViewSelection();
      return;
    }
    const view = savedViews.find((v) => String(v.id) === selectedId);
    if (view) applyView(view);
  });

  saveTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = saveMenu.style.display !== "none";
    saveMenu.style.display = open ? "none" : "";
  });

  document.addEventListener("click", (e) => {
    const wrap = document.getElementById("save-menu-wrap");
    if (wrap && !wrap.contains(e.target)) {
      saveMenu.style.display = "none";
    }
  });

  saveOverwrite.addEventListener("click", () => {
    saveMenu.style.display = "none";
    const activeId = store.getState().view.id;
    if (!activeId) return;
    const view = savedViews.find((v) => v.id === activeId);
    if (!view) return;
    const payload = selectSavedViewPayload(store.getState(), view.name);
    fetch(`/api/views/${activeId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (!r.ok)
          return r.json().then((d) => {
            throw new Error(d.error || "Failed to update view");
          });
        return r.json();
      })
      .then((updated) => {
        const i = savedViews.findIndex((v) => v.id === updated.id);
        if (i !== -1) savedViews[i] = updated;
        store.dispatch(A.snapshotView());
        renderDirtyBadge();
      })
      .catch((err) => window.alert(err.message));
  });

  saveAsNew.addEventListener("click", () => {
    saveMenu.style.display = "none";
    saveDialogName.value = "";
    saveDialog.showModal();
  });

  saveDialogCancel.addEventListener("click", () => {
    saveDialog.close();
  });

  saveDialog.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = saveDialogName.value.trim();
    if (!name) return;
    const payload = selectSavedViewPayload(store.getState(), name);
    fetch("/api/views/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => {
        if (r.status === 409)
          throw new Error("A view with that name already exists.");
        if (!r.ok)
          return r.json().then((d) => {
            throw new Error(d.error || "Failed to save view");
          });
        return r.json();
      })
      .then((view) => {
        savedViews.push(view);
        store.dispatch(A.loadView(view));
        renderViewsSelect();
        saveDialog.close();
      })
      .catch((err) => window.alert(err.message));
  });

  deleteViewAction.addEventListener("click", () => {
    saveMenu.style.display = "none";
    const activeId = store.getState().view.id;
    const view = savedViews.find((v) => v.id === activeId);
    if (!view) return;
    deleteDialogMsg.textContent = `Delete view "${view.name}"?`;
    deleteDialog.showModal();
  });

  deleteDialogCancel.addEventListener("click", () => {
    deleteDialog.close();
  });

  deleteDialogConfirm.addEventListener("click", () => {
    const activeId = store.getState().view.id;
    if (!activeId) return;
    fetch(`/api/views/${activeId}/`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok && r.status !== 204) throw new Error("Failed to delete view");
        savedViews = savedViews.filter((v) => v.id !== activeId);
        clearViewSelection();
        renderViewsSelect();
        deleteDialog.close();
      })
      .catch((err) => window.alert(err.message));
  });

  // -------------------------------------------------------------------------
  // Pagination bar + data subscriber
  // -------------------------------------------------------------------------

  const pageSizeSelect = document.getElementById("page-size-select");
  const pagePrevBtn = document.getElementById("page-prev");
  const pageNextBtn = document.getElementById("page-next");
  const pageInfo = document.getElementById("page-info");

  function renderPaginationBar() {
    const state = store.getState();
    const { page, size } = state.pagination;
    const totalPages = selectDisplayTotalPages(state);
    // Keep the size selector in sync with state.
    if (String(pageSizeSelect.value) !== String(size)) {
      pageSizeSelect.value = String(size);
    }
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    pagePrevBtn.disabled = page <= 1;
    pageNextBtn.disabled = page >= totalPages;
  }

  pageSizeSelect.addEventListener("change", () => {
    const size = parseInt(pageSizeSelect.value, 10);
    if (!Number.isNaN(size)) store.dispatch(A.setPageSize(size));
  });
  pagePrevBtn.addEventListener("click", () => {
    const { page } = store.getState().pagination;
    if (page > 1) store.dispatch(A.setPage(page - 1));
  });
  pageNextBtn.addEventListener("click", () => {
    const state = store.getState();
    const { page } = state.pagination;
    const total = selectDisplayTotalPages(state);
    if (page < total) store.dispatch(A.setPage(page + 1));
  });

  // Render table rows and pagination whenever data/pagination change.
  let lastResults = null;
  let lastTotalPages = -1;
  let lastPage = -1;
  let lastSize = -1;
  store.subscribe(() => {
    const state = store.getState();
    if (state.data.results !== lastResults) {
      lastResults = state.data.results;
      withSuppressedEvents(() => {
        table.setData(mapApiRows(state.data.results || []));
      });
    }
    if (
      state.data.totalPages !== lastTotalPages ||
      state.pagination.page !== lastPage ||
      state.pagination.size !== lastSize
    ) {
      lastTotalPages = state.data.totalPages;
      lastPage = state.pagination.page;
      lastSize = state.pagination.size;
      renderPaginationBar();
    }
    // Keep dirty-state in sync across every move.
    renderDirtyBadge();
  });

  // -------------------------------------------------------------------------
  // Initial paint
  // -------------------------------------------------------------------------

  renderColumnFilterSections();
  renderFilterPills();
  renderColumnsBadge();
  renderPaginationBar();
  fetchEffect.triggerNow();
  fetchViews();

  // Expose for debugging / Playwright.
  window.__STORE__ = store;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initJobsPage);
} else {
  initJobsPage();
}
