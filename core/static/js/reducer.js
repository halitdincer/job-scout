/**
 * Pure reducer. Every UI mutation flows through here.
 *
 * State shape (see `createInitialState` for defaults):
 *   filter: { expression, rules, renderable }
 *   sort: [{ field, dir }, ...]
 *   columns: { order: [field, ...], visibility: { field: bool } }
 *   pagination: { page, size }
 *   view: { id, name, snapshot | null }
 *   data: { results, count, totalPages, loading, error, requestId }
 *   ui: { renderToken }
 */
import {
  ADD_RULE,
  REMOVE_RULE,
  UPDATE_RULE_OPERATOR,
  UPDATE_RULE_VALUE,
  CLEAR_RULES,
  SET_FILTER_FROM_EXPRESSION,
  COMMIT_FILTER,
  SET_SORT,
  SET_COLUMN_ORDER,
  TOGGLE_COLUMN_VISIBILITY,
  RESET_COLUMNS,
  SET_PAGE,
  SET_PAGE_SIZE,
  LOAD_VIEW,
  CLEAR_VIEW,
  SNAPSHOT_VIEW,
  FETCH_START,
  FETCH_SUCCESS,
  FETCH_ERROR,
  BUMP_RENDER_TOKEN,
} from "./actions.js";
import {
  expressionToRules,
  rulesToExpression,
  genRuleId,
} from "./filterExpression.js";
import {
  FILTER_FIELD_DEFS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
} from "./constants.js";

export function createInitialState({ columnOrder, columnVisibility }) {
  return {
    filter: { expression: null, rules: [], renderable: true },
    sort: cloneSort(DEFAULT_SORT),
    columns: {
      order: [...columnOrder],
      visibility: { ...columnVisibility },
    },
    pagination: { page: 1, size: DEFAULT_PAGE_SIZE },
    view: { id: null, name: null, snapshot: null },
    data: {
      results: [],
      count: 0,
      totalPages: 0,
      loading: false,
      error: null,
      requestId: 0,
    },
    ui: { renderToken: 0 },
  };
}

function cloneSort(sort) {
  return (sort || []).map((s) => ({ field: s.field, dir: s.dir }));
}

function normalizeLegacySort(sort) {
  // Back-compat: legacy SavedViews used { column, dir }.
  // Caller (LOAD_VIEW) guarantees `sort` is a non-empty array.
  return sort.map((s) => ({
    field: s.field || s.column,
    dir: s.dir,
  }));
}

function snapshotOf(state) {
  return {
    filter: state.filter.expression,
    columns: {
      order: [...state.columns.order],
      visibility: { ...state.columns.visibility },
    },
    sort: cloneSort(state.sort),
    pageSize: state.pagination.size,
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case ADD_RULE: {
      const def = FILTER_FIELD_DEFS[action.field];
      if (!def) return state;
      const rule = {
        id: genRuleId(),
        field: action.field,
        operator: def.operators[0],
        value: "",
      };
      return {
        ...state,
        filter: {
          ...state.filter,
          rules: [...state.filter.rules, rule],
          renderable: true,
        },
      };
    }

    case REMOVE_RULE: {
      const rules = state.filter.rules.filter((r) => r.id !== action.ruleId);
      return {
        ...state,
        filter: { ...state.filter, rules },
      };
    }

    case UPDATE_RULE_OPERATOR: {
      const rules = state.filter.rules.map((r) =>
        r.id === action.ruleId ? { ...r, operator: action.operator } : r
      );
      return { ...state, filter: { ...state.filter, rules } };
    }

    case UPDATE_RULE_VALUE: {
      const rules = state.filter.rules.map((r) =>
        r.id === action.ruleId ? { ...r, value: action.value } : r
      );
      return { ...state, filter: { ...state.filter, rules } };
    }

    case CLEAR_RULES: {
      return {
        ...state,
        filter: { expression: null, rules: [], renderable: true },
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case SET_FILTER_FROM_EXPRESSION: {
      const projected = expressionToRules(action.expression);
      return {
        ...state,
        filter: {
          expression: projected.expression,
          rules: projected.rules,
          renderable: projected.renderable,
        },
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case COMMIT_FILTER: {
      const expression = rulesToExpression(state.filter.rules);
      return {
        ...state,
        filter: { ...state.filter, expression, renderable: true },
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case SET_SORT: {
      return {
        ...state,
        sort: cloneSort(action.sort),
        pagination: { ...state.pagination, page: 1 },
      };
    }

    case SET_COLUMN_ORDER: {
      return {
        ...state,
        columns: { ...state.columns, order: [...action.order] },
      };
    }

    case TOGGLE_COLUMN_VISIBILITY: {
      const current = state.columns.visibility[action.field] !== false;
      return {
        ...state,
        columns: {
          ...state.columns,
          visibility: {
            ...state.columns.visibility,
            [action.field]: !current,
          },
        },
      };
    }

    case RESET_COLUMNS: {
      return {
        ...state,
        columns: {
          order: [...action.defaultOrder],
          visibility: { ...action.defaultVisibility },
        },
      };
    }

    case SET_PAGE: {
      return {
        ...state,
        pagination: { ...state.pagination, page: action.page },
      };
    }

    case SET_PAGE_SIZE: {
      return {
        ...state,
        pagination: { page: 1, size: action.size },
      };
    }

    case LOAD_VIEW: {
      const { view } = action;
      const projected = expressionToRules(view.filter_expression || null);
      const order = Array.isArray(view.columns)
        ? view.columns.map((c) => c.field)
        : [...state.columns.order];
      const visibility = { ...state.columns.visibility };
      if (Array.isArray(view.columns)) {
        view.columns.forEach((c) => {
          visibility[c.field] = c.visible !== false;
        });
      }
      const pageSize =
        view.config && typeof view.config.page_size === "number"
          ? view.config.page_size
          : DEFAULT_PAGE_SIZE;
      const nextState = {
        ...state,
        filter: {
          expression: projected.expression,
          rules: projected.rules,
          renderable: projected.renderable,
        },
        sort:
          Array.isArray(view.sort) && view.sort.length
            ? normalizeLegacySort(view.sort)
            : cloneSort(DEFAULT_SORT),
        columns: { order, visibility },
        pagination: { page: 1, size: pageSize },
        view: { id: view.id, name: view.name, snapshot: null },
      };
      nextState.view.snapshot = snapshotOf(nextState);
      return nextState;
    }

    case CLEAR_VIEW: {
      return {
        ...state,
        view: { id: null, name: null, snapshot: null },
      };
    }

    case SNAPSHOT_VIEW: {
      return {
        ...state,
        view: { ...state.view, snapshot: snapshotOf(state) },
      };
    }

    case FETCH_START: {
      return {
        ...state,
        data: {
          ...state.data,
          loading: true,
          error: null,
          requestId: action.requestId,
        },
      };
    }

    case FETCH_SUCCESS: {
      if (action.requestId !== state.data.requestId) return state;
      const { payload } = action;
      return {
        ...state,
        data: {
          ...state.data,
          loading: false,
          error: null,
          results: payload.results,
          count: payload.count,
          totalPages: payload.total_pages,
        },
      };
    }

    case FETCH_ERROR: {
      if (action.requestId !== state.data.requestId) return state;
      return {
        ...state,
        data: { ...state.data, loading: false, error: action.error },
      };
    }

    case BUMP_RENDER_TOKEN: {
      return {
        ...state,
        ui: { ...state.ui, renderToken: state.ui.renderToken + 1 },
      };
    }

    default:
      return state;
  }
}
