import { beforeEach, describe, expect, it } from "vitest";

import { createInitialState, reducer } from "../reducer.js";
import * as A from "../actions.js";
import { resetRuleIdSequenceForTesting } from "../filterExpression.js";

beforeEach(() => {
  resetRuleIdSequenceForTesting();
});

function initial(overrides = {}) {
  return createInitialState({
    columnOrder: ["title", "status"],
    columnVisibility: { title: true, status: true },
    ...overrides,
  });
}

describe("createInitialState", () => {
  it("returns default shape", () => {
    const s = initial();
    expect(s.filter).toEqual({ expression: null, rules: [], renderable: true });
    expect(s.sort).toEqual([{ field: "first_seen_at", dir: "desc" }]);
    expect(s.columns.order).toEqual(["title", "status"]);
    expect(s.columns.visibility).toEqual({ title: true, status: true });
    expect(s.pagination).toEqual({ page: 1, size: 50 });
    expect(s.view).toEqual({ id: null, name: null, snapshot: null });
    expect(s.data.loading).toBe(false);
    expect(s.ui.renderToken).toBe(0);
  });
});

describe("default branch", () => {
  it("returns state unchanged for unknown action type", () => {
    const s = initial();
    expect(reducer(s, { type: "NOPE" })).toBe(s);
  });
});

describe("ADD_RULE", () => {
  it("appends a rule with default operator for the field", () => {
    const s = reducer(initial(), A.addRule("title"));
    expect(s.filter.rules).toHaveLength(1);
    expect(s.filter.rules[0]).toMatchObject({
      field: "title",
      operator: "contains",
      value: "",
    });
    expect(s.filter.rules[0].id).toBe("r1");
    expect(s.filter.renderable).toBe(true);
  });

  it("returns state unchanged for unknown field", () => {
    const s = initial();
    const next = reducer(s, A.addRule("nonexistent"));
    expect(next).toBe(s);
  });
});

describe("REMOVE_RULE", () => {
  it("removes by id", () => {
    let s = reducer(initial(), A.addRule("title"));
    s = reducer(s, A.addRule("status"));
    expect(s.filter.rules).toHaveLength(2);
    s = reducer(s, A.removeRule(s.filter.rules[0].id));
    expect(s.filter.rules).toHaveLength(1);
    expect(s.filter.rules[0].field).toBe("status");
  });
});

describe("UPDATE_RULE_OPERATOR", () => {
  it("updates operator for matching rule", () => {
    let s = reducer(initial(), A.addRule("title"));
    const id = s.filter.rules[0].id;
    s = reducer(s, A.updateRuleOperator(id, "not_contains"));
    expect(s.filter.rules[0].operator).toBe("not_contains");
  });

  it("leaves other rules untouched", () => {
    let s = reducer(initial(), A.addRule("title"));
    s = reducer(s, A.addRule("status"));
    const firstId = s.filter.rules[0].id;
    s = reducer(s, A.updateRuleOperator(firstId, "eq"));
    expect(s.filter.rules[0].operator).toBe("eq");
    expect(s.filter.rules[1].operator).toBe("eq");
  });
});

describe("UPDATE_RULE_VALUE", () => {
  it("updates value for matching rule", () => {
    let s = reducer(initial(), A.addRule("title"));
    const id = s.filter.rules[0].id;
    s = reducer(s, A.updateRuleValue(id, "engineer"));
    expect(s.filter.rules[0].value).toBe("engineer");
  });

  it("leaves other rules untouched", () => {
    let s = reducer(initial(), A.addRule("title"));
    s = reducer(s, A.addRule("status"));
    const firstId = s.filter.rules[0].id;
    s = reducer(s, A.updateRuleValue(firstId, "hello"));
    expect(s.filter.rules[0].value).toBe("hello");
    expect(s.filter.rules[1].value).toBe("");
  });
});

describe("CLEAR_RULES", () => {
  it("clears expression, rules, renderable and resets page to 1", () => {
    let s = reducer(initial(), A.addRule("title"));
    s = { ...s, pagination: { ...s.pagination, page: 5 } };
    s = reducer(s, A.clearRules());
    expect(s.filter).toEqual({ expression: null, rules: [], renderable: true });
    expect(s.pagination.page).toBe(1);
  });
});

describe("SET_FILTER_FROM_EXPRESSION", () => {
  it("projects the expression into rules, renderable=true", () => {
    const expr = { field: "title", operator: "contains", value: "x" };
    const s = reducer(initial(), A.setFilterFromExpression(expr));
    expect(s.filter.expression).toBe(expr);
    expect(s.filter.rules).toHaveLength(1);
    expect(s.filter.renderable).toBe(true);
    expect(s.pagination.page).toBe(1);
  });

  it("marks renderable=false for OR expressions", () => {
    const expr = {
      op: "or",
      children: [
        { field: "title", operator: "eq", value: "a" },
        { field: "title", operator: "eq", value: "b" },
      ],
    };
    const s = reducer(initial(), A.setFilterFromExpression(expr));
    expect(s.filter.renderable).toBe(false);
    expect(s.filter.expression).toBe(expr);
    expect(s.filter.rules).toEqual([]);
  });

  it("handles null expression", () => {
    const s = reducer(initial(), A.setFilterFromExpression(null));
    expect(s.filter.expression).toBe(null);
    expect(s.filter.rules).toEqual([]);
  });
});

describe("COMMIT_FILTER", () => {
  it("serializes rules to expression and resets page", () => {
    let s = reducer(initial(), A.addRule("title"));
    const id = s.filter.rules[0].id;
    s = reducer(s, A.updateRuleValue(id, "engineer"));
    s = { ...s, pagination: { ...s.pagination, page: 7 } };
    s = reducer(s, A.commitFilter());
    expect(s.filter.expression).toEqual({
      field: "title",
      operator: "contains",
      value: "engineer",
    });
    expect(s.filter.renderable).toBe(true);
    expect(s.pagination.page).toBe(1);
  });

  it("commits null when no rules are valid", () => {
    const s = reducer(initial(), A.commitFilter());
    expect(s.filter.expression).toBe(null);
  });
});

describe("SET_SORT", () => {
  it("replaces sort and resets page to 1", () => {
    let s = initial();
    s = { ...s, pagination: { ...s.pagination, page: 4 } };
    s = reducer(s, A.setSort([{ field: "title", dir: "asc" }]));
    expect(s.sort).toEqual([{ field: "title", dir: "asc" }]);
    expect(s.pagination.page).toBe(1);
  });

  it("clones the sort array (no aliasing)", () => {
    const input = [{ field: "title", dir: "asc" }];
    const s = reducer(initial(), A.setSort(input));
    expect(s.sort).not.toBe(input);
    expect(s.sort[0]).not.toBe(input[0]);
  });

  it("handles null/empty by coalescing to []", () => {
    const s = reducer(initial(), A.setSort(null));
    expect(s.sort).toEqual([]);
  });
});

describe("SET_COLUMN_ORDER", () => {
  it("replaces column order (fresh array)", () => {
    const input = ["status", "title"];
    const s = reducer(initial(), A.setColumnOrder(input));
    expect(s.columns.order).toEqual(["status", "title"]);
    expect(s.columns.order).not.toBe(input);
  });
});

describe("TOGGLE_COLUMN_VISIBILITY", () => {
  it("toggles from visible to hidden", () => {
    const s = reducer(initial(), A.toggleColumnVisibility("title"));
    expect(s.columns.visibility.title).toBe(false);
  });

  it("toggles from hidden to visible", () => {
    let s = reducer(initial(), A.toggleColumnVisibility("title"));
    s = reducer(s, A.toggleColumnVisibility("title"));
    expect(s.columns.visibility.title).toBe(true);
  });

  it("treats missing key as visible (so first toggle hides)", () => {
    const s = reducer(initial(), A.toggleColumnVisibility("department"));
    expect(s.columns.visibility.department).toBe(false);
  });
});

describe("RESET_COLUMNS", () => {
  it("replaces order and visibility", () => {
    const s = reducer(
      initial(),
      A.resetColumns(["a", "b"], { a: true, b: false })
    );
    expect(s.columns.order).toEqual(["a", "b"]);
    expect(s.columns.visibility).toEqual({ a: true, b: false });
  });
});

describe("SET_PAGE", () => {
  it("updates page only", () => {
    const s = reducer(initial(), A.setPage(3));
    expect(s.pagination.page).toBe(3);
    expect(s.pagination.size).toBe(50);
  });
});

describe("SET_PAGE_SIZE", () => {
  it("resets page to 1 and updates size", () => {
    let s = initial();
    s = { ...s, pagination: { ...s.pagination, page: 8 } };
    s = reducer(s, A.setPageSize(100));
    expect(s.pagination).toEqual({ page: 1, size: 100 });
  });
});

describe("LOAD_VIEW", () => {
  it("loads filter, columns, sort, page size and takes snapshot", () => {
    const view = {
      id: 42,
      name: "My View",
      filter_expression: { field: "title", operator: "eq", value: "x" },
      columns: [
        { field: "title", visible: true },
        { field: "status", visible: false },
      ],
      sort: [{ field: "title", dir: "asc" }],
      config: { page_size: 100 },
    };
    const s = reducer(initial(), A.loadView(view));
    expect(s.view.id).toBe(42);
    expect(s.view.name).toBe("My View");
    expect(s.filter.expression).toEqual({
      field: "title",
      operator: "eq",
      value: "x",
    });
    expect(s.columns.order).toEqual(["title", "status"]);
    expect(s.columns.visibility).toEqual({ title: true, status: false });
    expect(s.sort).toEqual([{ field: "title", dir: "asc" }]);
    expect(s.pagination).toEqual({ page: 1, size: 100 });
    expect(s.view.snapshot).not.toBe(null);
    expect(s.view.snapshot.sort).toEqual([{ field: "title", dir: "asc" }]);
    expect(s.view.snapshot.pageSize).toBe(100);
  });

  it("handles missing columns / sort / config gracefully", () => {
    const view = {
      id: 1,
      name: "bare",
      filter_expression: null,
      columns: null,
      sort: null,
      config: null,
    };
    const s = reducer(initial(), A.loadView(view));
    expect(s.columns.order).toEqual(["title", "status"]);
    expect(s.sort).toEqual([{ field: "first_seen_at", dir: "desc" }]);
    expect(s.pagination.size).toBe(50);
  });

  it("migrates legacy {column, dir} sort shape", () => {
    const view = {
      id: 1,
      name: "legacy",
      filter_expression: null,
      columns: [{ field: "title", visible: true }],
      sort: [{ column: "title", dir: "asc" }],
      config: {},
    };
    const s = reducer(initial(), A.loadView(view));
    expect(s.sort).toEqual([{ field: "title", dir: "asc" }]);
  });

  it("defaults column visibility to true when omitted", () => {
    const view = {
      id: 1,
      name: "v",
      filter_expression: null,
      columns: [{ field: "title" }, { field: "status" }],
      sort: [],
      config: {},
    };
    const s = reducer(initial(), A.loadView(view));
    expect(s.columns.visibility).toEqual({ title: true, status: true });
  });

  it("uses DEFAULT_PAGE_SIZE when config.page_size is not a number", () => {
    const view = {
      id: 1,
      name: "v",
      filter_expression: null,
      columns: [],
      sort: [],
      config: { page_size: "100" },
    };
    const s = reducer(initial(), A.loadView(view));
    expect(s.pagination.size).toBe(50);
  });
});

describe("CLEAR_VIEW", () => {
  it("clears the current view", () => {
    let s = reducer(
      initial(),
      A.loadView({
        id: 1,
        name: "v",
        filter_expression: null,
        columns: [],
        sort: [],
        config: {},
      })
    );
    s = reducer(s, A.clearView());
    expect(s.view).toEqual({ id: null, name: null, snapshot: null });
  });
});

describe("SNAPSHOT_VIEW", () => {
  it("captures current {filter, columns, sort, pageSize} as snapshot", () => {
    let s = reducer(initial(), A.addRule("title"));
    s = reducer(s, A.commitFilter());
    s = reducer(s, A.snapshotView());
    expect(s.view.snapshot).toEqual({
      filter: s.filter.expression,
      columns: {
        order: s.columns.order,
        visibility: s.columns.visibility,
      },
      sort: s.sort,
      pageSize: s.pagination.size,
    });
  });
});

describe("FETCH_START / FETCH_SUCCESS / FETCH_ERROR", () => {
  it("FETCH_START marks loading and records requestId", () => {
    const s = reducer(initial(), A.fetchStart(5));
    expect(s.data.loading).toBe(true);
    expect(s.data.error).toBe(null);
    expect(s.data.requestId).toBe(5);
  });

  it("FETCH_SUCCESS records results when requestId matches", () => {
    let s = reducer(initial(), A.fetchStart(5));
    s = reducer(
      s,
      A.fetchSuccess(
        { results: [{ id: 1 }], count: 1, total_pages: 1 },
        5
      )
    );
    expect(s.data.loading).toBe(false);
    expect(s.data.results).toEqual([{ id: 1 }]);
    expect(s.data.count).toBe(1);
    expect(s.data.totalPages).toBe(1);
  });

  it("FETCH_SUCCESS with stale requestId is ignored", () => {
    let s = reducer(initial(), A.fetchStart(5));
    const stale = reducer(
      s,
      A.fetchSuccess({ results: [{ id: 9 }], count: 9, total_pages: 9 }, 3)
    );
    expect(stale).toBe(s);
  });

  it("FETCH_ERROR records error when requestId matches", () => {
    let s = reducer(initial(), A.fetchStart(5));
    s = reducer(s, A.fetchError(new Error("nope"), 5));
    expect(s.data.loading).toBe(false);
    expect(s.data.error).toEqual(new Error("nope"));
  });

  it("FETCH_ERROR with stale requestId is ignored", () => {
    let s = reducer(initial(), A.fetchStart(5));
    const stale = reducer(s, A.fetchError(new Error("nope"), 3));
    expect(stale).toBe(s);
  });
});

describe("BUMP_RENDER_TOKEN", () => {
  it("increments the render token", () => {
    let s = reducer(initial(), A.bumpRenderToken());
    expect(s.ui.renderToken).toBe(1);
    s = reducer(s, A.bumpRenderToken());
    expect(s.ui.renderToken).toBe(2);
  });
});
