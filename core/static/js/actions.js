/**
 * Action type constants and creators. All reducer branches live in
 * `reducer.js`; UI code dispatches these.
 */

// Filter rules (UI-editable form).
export const ADD_RULE = "ADD_RULE";
export const REMOVE_RULE = "REMOVE_RULE";
export const UPDATE_RULE_OPERATOR = "UPDATE_RULE_OPERATOR";
export const UPDATE_RULE_VALUE = "UPDATE_RULE_VALUE";
export const CLEAR_RULES = "CLEAR_RULES";
export const SET_FILTER_FROM_EXPRESSION = "SET_FILTER_FROM_EXPRESSION";
export const COMMIT_FILTER = "COMMIT_FILTER";

// Sort.
export const SET_SORT = "SET_SORT";

// Columns.
export const SET_COLUMN_ORDER = "SET_COLUMN_ORDER";
export const TOGGLE_COLUMN_VISIBILITY = "TOGGLE_COLUMN_VISIBILITY";
export const RESET_COLUMNS = "RESET_COLUMNS";

// Pagination.
export const SET_PAGE = "SET_PAGE";
export const SET_PAGE_SIZE = "SET_PAGE_SIZE";

// Saved views.
export const LOAD_VIEW = "LOAD_VIEW";
export const CLEAR_VIEW = "CLEAR_VIEW";
export const SNAPSHOT_VIEW = "SNAPSHOT_VIEW";

// Data fetch lifecycle.
export const FETCH_START = "FETCH_START";
export const FETCH_SUCCESS = "FETCH_SUCCESS";
export const FETCH_ERROR = "FETCH_ERROR";

// Render coordination. Incrementing this value tells Tabulator-callback
// listeners to treat the next callback as echo and skip dispatching.
export const BUMP_RENDER_TOKEN = "BUMP_RENDER_TOKEN";

// --- Creators ---
export const addRule = (field) => ({ type: ADD_RULE, field });
export const removeRule = (ruleId) => ({ type: REMOVE_RULE, ruleId });
export const updateRuleOperator = (ruleId, operator) => ({
  type: UPDATE_RULE_OPERATOR,
  ruleId,
  operator,
});
export const updateRuleValue = (ruleId, value) => ({
  type: UPDATE_RULE_VALUE,
  ruleId,
  value,
});
export const clearRules = () => ({ type: CLEAR_RULES });
export const setFilterFromExpression = (expression) => ({
  type: SET_FILTER_FROM_EXPRESSION,
  expression,
});
export const commitFilter = () => ({ type: COMMIT_FILTER });

export const setSort = (sort) => ({ type: SET_SORT, sort });

export const setColumnOrder = (order) => ({ type: SET_COLUMN_ORDER, order });
export const toggleColumnVisibility = (field) => ({
  type: TOGGLE_COLUMN_VISIBILITY,
  field,
});
export const resetColumns = (defaultOrder, defaultVisibility) => ({
  type: RESET_COLUMNS,
  defaultOrder,
  defaultVisibility,
});

export const setPage = (page) => ({ type: SET_PAGE, page });
export const setPageSize = (size) => ({ type: SET_PAGE_SIZE, size });

export const loadView = (view) => ({ type: LOAD_VIEW, view });
export const clearView = () => ({ type: CLEAR_VIEW });
export const snapshotView = () => ({ type: SNAPSHOT_VIEW });

export const fetchStart = (requestId) => ({ type: FETCH_START, requestId });
export const fetchSuccess = (payload, requestId) => ({
  type: FETCH_SUCCESS,
  payload,
  requestId,
});
export const fetchError = (error, requestId) => ({
  type: FETCH_ERROR,
  error,
  requestId,
});

export const bumpRenderToken = () => ({ type: BUMP_RENDER_TOKEN });
