import { describe, expect, it } from "vitest";

import * as A from "../actions.js";

describe("action creators", () => {
  it("addRule", () => {
    expect(A.addRule("title")).toEqual({ type: A.ADD_RULE, field: "title" });
  });

  it("removeRule", () => {
    expect(A.removeRule("r1")).toEqual({ type: A.REMOVE_RULE, ruleId: "r1" });
  });

  it("updateRuleOperator", () => {
    expect(A.updateRuleOperator("r1", "contains")).toEqual({
      type: A.UPDATE_RULE_OPERATOR,
      ruleId: "r1",
      operator: "contains",
    });
  });

  it("updateRuleValue", () => {
    expect(A.updateRuleValue("r1", "x")).toEqual({
      type: A.UPDATE_RULE_VALUE,
      ruleId: "r1",
      value: "x",
    });
  });

  it("clearRules", () => {
    expect(A.clearRules()).toEqual({ type: A.CLEAR_RULES });
  });

  it("setFilterFromExpression", () => {
    const expr = { field: "title", operator: "eq", value: "x" };
    expect(A.setFilterFromExpression(expr)).toEqual({
      type: A.SET_FILTER_FROM_EXPRESSION,
      expression: expr,
    });
  });

  it("commitFilter", () => {
    expect(A.commitFilter()).toEqual({ type: A.COMMIT_FILTER });
  });

  it("setSort", () => {
    const sort = [{ field: "title", dir: "asc" }];
    expect(A.setSort(sort)).toEqual({ type: A.SET_SORT, sort });
  });

  it("setColumnOrder", () => {
    expect(A.setColumnOrder(["a", "b"])).toEqual({
      type: A.SET_COLUMN_ORDER,
      order: ["a", "b"],
    });
  });

  it("toggleColumnVisibility", () => {
    expect(A.toggleColumnVisibility("title")).toEqual({
      type: A.TOGGLE_COLUMN_VISIBILITY,
      field: "title",
    });
  });

  it("resetColumns", () => {
    expect(A.resetColumns(["a"], { a: true })).toEqual({
      type: A.RESET_COLUMNS,
      defaultOrder: ["a"],
      defaultVisibility: { a: true },
    });
  });

  it("setPage", () => {
    expect(A.setPage(3)).toEqual({ type: A.SET_PAGE, page: 3 });
  });

  it("setPageSize", () => {
    expect(A.setPageSize(100)).toEqual({ type: A.SET_PAGE_SIZE, size: 100 });
  });

  it("loadView", () => {
    const view = { id: 1, name: "v" };
    expect(A.loadView(view)).toEqual({ type: A.LOAD_VIEW, view });
  });

  it("clearView", () => {
    expect(A.clearView()).toEqual({ type: A.CLEAR_VIEW });
  });

  it("snapshotView", () => {
    expect(A.snapshotView()).toEqual({ type: A.SNAPSHOT_VIEW });
  });

  it("fetchStart", () => {
    expect(A.fetchStart(7)).toEqual({ type: A.FETCH_START, requestId: 7 });
  });

  it("fetchSuccess", () => {
    const payload = { results: [], count: 0, total_pages: 0 };
    expect(A.fetchSuccess(payload, 7)).toEqual({
      type: A.FETCH_SUCCESS,
      payload,
      requestId: 7,
    });
  });

  it("fetchError", () => {
    const err = new Error("boom");
    expect(A.fetchError(err, 7)).toEqual({
      type: A.FETCH_ERROR,
      error: err,
      requestId: 7,
    });
  });

  it("bumpRenderToken", () => {
    expect(A.bumpRenderToken()).toEqual({ type: A.BUMP_RENDER_TOKEN });
  });
});
