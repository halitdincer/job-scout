import { beforeEach, describe, expect, it } from "vitest";

import {
  selectExpressionForServer,
  selectFilterPills,
  selectFilterRulesRenderable,
  selectFilterSummary,
  selectIsDirty,
  selectSavedViewPayload,
  selectSortQueryParam,
} from "../selectors.js";
import { resetRuleIdSequenceForTesting } from "../filterExpression.js";

beforeEach(() => {
  resetRuleIdSequenceForTesting();
});

function baseState(overrides = {}) {
  return {
    filter: { expression: null, rules: [], renderable: true },
    sort: [],
    columns: { order: ["title"], visibility: { title: true } },
    pagination: { page: 1, size: 50 },
    view: { id: null, name: null, snapshot: null },
    ...overrides,
  };
}

describe("selectExpressionForServer", () => {
  it("returns the filter expression", () => {
    const expr = { field: "title", operator: "eq", value: "x" };
    expect(
      selectExpressionForServer(
        baseState({ filter: { expression: expr, rules: [], renderable: true } })
      )
    ).toBe(expr);
  });
});

describe("selectSortQueryParam", () => {
  it("returns DEFAULT_SORT serialization when sort is empty", () => {
    expect(selectSortQueryParam(baseState({ sort: [] }))).toBe(
      "first_seen_at:desc"
    );
  });

  it("serializes single sort", () => {
    expect(
      selectSortQueryParam(baseState({ sort: [{ field: "title", dir: "asc" }] }))
    ).toBe("title:asc");
  });

  it("serializes multi-column sort preserving order", () => {
    expect(
      selectSortQueryParam(
        baseState({
          sort: [
            { field: "status", dir: "asc" },
            { field: "first_seen_at", dir: "desc" },
          ],
        })
      )
    ).toBe("status:asc,first_seen_at:desc");
  });
});

describe("selectFilterRulesRenderable", () => {
  it("returns the renderable flag", () => {
    expect(selectFilterRulesRenderable(baseState())).toBe(true);
    expect(
      selectFilterRulesRenderable(
        baseState({ filter: { expression: null, rules: [], renderable: false } })
      )
    ).toBe(false);
  });
});

describe("selectIsDirty", () => {
  it("returns false when no snapshot", () => {
    expect(selectIsDirty(baseState())).toBe(false);
  });

  it("returns false when current matches snapshot", () => {
    const state = baseState({
      filter: { expression: null, rules: [], renderable: true },
      columns: { order: ["title"], visibility: { title: true } },
      sort: [{ field: "title", dir: "asc" }],
      pagination: { page: 1, size: 50 },
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [{ field: "title", dir: "asc" }],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(false);
  });

  it("returns true when filter changes", () => {
    const state = baseState({
      filter: {
        expression: { field: "title", operator: "eq", value: "x" },
        rules: [],
        renderable: true,
      },
      sort: [{ field: "title", dir: "asc" }],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [{ field: "title", dir: "asc" }],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("returns true when column order changes", () => {
    const state = baseState({
      columns: { order: ["title", "status"], visibility: { title: true } },
      sort: [{ field: "title", dir: "asc" }],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [{ field: "title", dir: "asc" }],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("returns true when sort changes", () => {
    const state = baseState({
      sort: [{ field: "title", dir: "desc" }],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [{ field: "title", dir: "asc" }],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("returns true when page size changes", () => {
    const state = baseState({
      pagination: { page: 1, size: 100 },
      sort: [{ field: "title", dir: "asc" }],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [{ field: "title", dir: "asc" }],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("handles null vs non-null filter", () => {
    const state = baseState({
      filter: {
        expression: { field: "title", operator: "eq", value: "x" },
        rules: [],
        renderable: true,
      },
      sort: [],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal treats arrays and objects distinctly (type mismatch branch)", () => {
    const state = baseState({
      filter: { expression: ["not-an-object"], rules: [], renderable: true },
      sort: [],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: { looks: "like-an-object" },
          columns: { order: ["title"], visibility: { title: true } },
          sort: [],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal detects array length mismatch", () => {
    const state = baseState({
      columns: { order: ["title", "status"], visibility: { title: true } },
      sort: [],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal detects object key count mismatch", () => {
    const state = baseState({
      columns: {
        order: ["title"],
        visibility: { title: true, status: false },
      },
      sort: [],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal handles primitive mismatch (string vs number)", () => {
    const state = baseState({
      pagination: { page: 1, size: "50" },
      sort: [],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal detects object vs array mismatch (a object, b array)", () => {
    const state = baseState({
      filter: {
        expression: { looks: "like-an-object" },
        rules: [],
        renderable: true,
      },
      sort: [],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: ["not-an-object"],
          columns: { order: ["title"], visibility: { title: true } },
          sort: [],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal detects same-length arrays with element mismatch", () => {
    const state = baseState({
      sort: [
        { field: "title", dir: "asc" },
        { field: "status", dir: "desc" },
      ],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [
            { field: "title", dir: "asc" },
            { field: "status", dir: "asc" },
          ],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal detects same-count-but-different-keys objects", () => {
    const state = baseState({
      columns: { order: ["title"], visibility: { other_field: true } },
      sort: [],
      view: {
        id: 1,
        name: "v",
        snapshot: {
          filter: null,
          columns: { order: ["title"], visibility: { title: true } },
          sort: [],
          pageSize: 50,
        },
      },
    });
    expect(selectIsDirty(state)).toBe(true);
  });

  it("deep-equal returns true for deeply equal structures", () => {
    const snap = {
      filter: { op: "and", children: [{ field: "a", operator: "eq", value: "x" }] },
      columns: { order: ["title", "status"], visibility: { title: true, status: false } },
      sort: [{ field: "title", dir: "asc" }],
      pageSize: 50,
    };
    const state = baseState({
      filter: {
        expression: {
          op: "and",
          children: [{ field: "a", operator: "eq", value: "x" }],
        },
        rules: [],
        renderable: true,
      },
      columns: {
        order: ["title", "status"],
        visibility: { title: true, status: false },
      },
      sort: [{ field: "title", dir: "asc" }],
      pagination: { page: 1, size: 50 },
      view: { id: 1, name: "v", snapshot: snap },
    });
    expect(selectIsDirty(state)).toBe(false);
  });
});

describe("selectFilterSummary", () => {
  it("returns empty string when no rules", () => {
    expect(selectFilterSummary(baseState())).toBe("");
  });

  it("returns 'Custom filter' when non-renderable", () => {
    expect(
      selectFilterSummary(
        baseState({
          filter: { expression: null, rules: [], renderable: false },
        })
      )
    ).toBe("Custom filter");
  });

  it("joins rules with AND using labels", () => {
    const state = baseState({
      filter: {
        expression: null,
        renderable: true,
        rules: [
          { id: "r1", field: "title", operator: "contains", value: "eng" },
          { id: "r2", field: "status", operator: "eq", value: "active" },
        ],
      },
    });
    expect(selectFilterSummary(state)).toBe(
      "Title contains eng AND Status equals active"
    );
  });

  it("omits value for is_empty / is_not_empty", () => {
    const state = baseState({
      filter: {
        expression: null,
        renderable: true,
        rules: [
          { id: "r1", field: "title", operator: "is_empty", value: "" },
          { id: "r2", field: "title", operator: "is_not_empty", value: "" },
        ],
      },
    });
    expect(selectFilterSummary(state)).toBe(
      "Title is empty AND Title is not empty"
    );
  });

  it("falls back to raw field/operator if not in label tables", () => {
    const state = baseState({
      filter: {
        expression: null,
        renderable: true,
        rules: [
          { id: "r1", field: "unknown_field", operator: "mystery_op", value: "x" },
        ],
      },
    });
    expect(selectFilterSummary(state)).toBe("unknown_field mystery_op x");
  });
});

describe("selectFilterPills", () => {
  it("returns [] when non-renderable", () => {
    expect(
      selectFilterPills(
        baseState({
          filter: { expression: null, rules: [], renderable: false },
        })
      )
    ).toEqual([]);
  });

  it("returns [] when no rules", () => {
    expect(selectFilterPills(baseState())).toEqual([]);
  });

  it("returns single predicate for one rule", () => {
    const state = baseState({
      filter: {
        expression: null,
        renderable: true,
        rules: [
          { id: "r1", field: "title", operator: "contains", value: "x" },
        ],
      },
    });
    expect(selectFilterPills(state)).toEqual([
      { field: "title", operator: "contains", value: "x" },
    ]);
  });

  it("returns AND children (predicates only) for multiple rules", () => {
    const state = baseState({
      filter: {
        expression: null,
        renderable: true,
        rules: [
          { id: "r1", field: "title", operator: "contains", value: "x" },
          { id: "r2", field: "status", operator: "eq", value: "active" },
        ],
      },
    });
    expect(selectFilterPills(state)).toEqual([
      { field: "title", operator: "contains", value: "x" },
      { field: "status", operator: "eq", value: "active" },
    ]);
  });
});

describe("selectSavedViewPayload", () => {
  it("serializes name, filter expression, columns, sort, and config.page_size", () => {
    const state = baseState({
      filter: {
        expression: { field: "title", operator: "contains", value: "eng" },
        rules: [],
        renderable: true,
      },
      sort: [{ field: "first_seen_at", dir: "desc" }],
      columns: {
        order: ["title", "status"],
        visibility: { title: true, status: false },
      },
      pagination: { page: 1, size: 100 },
    });
    expect(selectSavedViewPayload(state, "US Remote")).toEqual({
      name: "US Remote",
      filter_expression: {
        field: "title",
        operator: "contains",
        value: "eng",
      },
      columns: [
        { field: "title", visible: true },
        { field: "status", visible: false },
      ],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 100 },
    });
  });

  it("emits sort using the new {field, dir} shape (never legacy {column, dir})", () => {
    const state = baseState({
      sort: [
        { field: "status", dir: "asc" },
        { field: "title", dir: "desc" },
      ],
    });
    const payload = selectSavedViewPayload(state, "V");
    expect(payload.sort).toEqual([
      { field: "status", dir: "asc" },
      { field: "title", dir: "desc" },
    ]);
    // No legacy key should appear.
    payload.sort.forEach((item) => {
      expect(item).not.toHaveProperty("column");
    });
  });

  it("emits columns with visible=true when visibility is absent (undefined is visible by default)", () => {
    const state = baseState({
      columns: { order: ["title", "team"], visibility: { title: true } },
    });
    const payload = selectSavedViewPayload(state, "V");
    expect(payload.columns).toEqual([
      { field: "title", visible: true },
      { field: "team", visible: true },
    ]);
  });

  it("emits filter_expression=null when no filter is active", () => {
    const state = baseState();
    const payload = selectSavedViewPayload(state, "V");
    expect(payload.filter_expression).toBe(null);
  });

  it("emits config.page_size from current pagination size", () => {
    const state = baseState({ pagination: { page: 3, size: 250 } });
    const payload = selectSavedViewPayload(state, "V");
    expect(payload.config).toEqual({ page_size: 250 });
  });

  it("preserves the provided name verbatim (does not trim or mutate)", () => {
    const state = baseState();
    expect(selectSavedViewPayload(state, "  Spaced  ").name).toBe("  Spaced  ");
  });
});
