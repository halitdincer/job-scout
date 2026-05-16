import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { resetRuleIdSequenceForTesting } from "./filterExpression";
import { useJobsState } from "./useJobsState";

beforeEach(() => {
  resetRuleIdSequenceForTesting();
});

describe("useJobsState", () => {
  it("starts with empty rules, null expression, renderable=true", () => {
    const { result } = renderHook(() => useJobsState());
    expect(result.current.state.rules).toEqual([]);
    expect(result.current.state.expression).toBeNull();
    expect(result.current.state.renderable).toBe(true);
  });

  it("hydrates initial rules from an expression", () => {
    const expr = {
      op: "and" as const,
      children: [
        { field: "title", operator: "contains", value: "engineer" },
        { field: "title", operator: "not_contains", value: "intern" },
      ],
    };
    const { result } = renderHook(() => useJobsState(expr));
    expect(result.current.state.expression).toBe(expr);
    expect(result.current.state.rules).toEqual([
      { id: "r1", field: "title", operator: "contains", value: "engineer" },
      { id: "r2", field: "title", operator: "not_contains", value: "intern" },
    ]);
    expect(result.current.state.renderable).toBe(true);
  });

  it("ADD_RULE appends a rule with the field's default operator", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    expect(result.current.state.rules).toEqual([
      { id: "r1", field: "title", operator: "contains", value: "" },
    ]);
  });

  it("ADD_RULE ignores unknown fields", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "bogus" }));
    expect(result.current.state.rules).toEqual([]);
  });

  it("UPDATE_RULE_OPERATOR replaces operator on the matching rule", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_OPERATOR",
        ruleId: "r1",
        operator: "eq",
      }),
    );
    expect(result.current.state.rules[0].operator).toBe("eq");
  });

  it("UPDATE_RULE_VALUE replaces value on the matching rule", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r1",
        value: "engineer",
      }),
    );
    expect(result.current.state.rules[0].value).toBe("engineer");
  });

  it("REMOVE_RULE drops the matching rule", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "status" }));
    act(() => result.current.dispatch({ type: "REMOVE_RULE", ruleId: "r1" }));
    expect(result.current.state.rules).toEqual([
      { id: "r2", field: "status", operator: "eq", value: "" },
    ]);
  });

  it("CLEAR_RULES wipes rules and expression", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r1",
        value: "engineer",
      }),
    );
    act(() => result.current.dispatch({ type: "COMMIT_FILTER" }));
    expect(result.current.state.expression).not.toBeNull();
    act(() => result.current.dispatch({ type: "CLEAR_RULES" }));
    expect(result.current.state.rules).toEqual([]);
    expect(result.current.state.expression).toBeNull();
    expect(result.current.state.renderable).toBe(true);
  });

  it("COMMIT_FILTER materializes the rules into an expression", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r1",
        value: "engineer",
      }),
    );
    act(() => result.current.dispatch({ type: "COMMIT_FILTER" }));
    expect(result.current.state.expression).toEqual({
      field: "title",
      operator: "contains",
      value: "engineer",
    });
  });

  it("SET_FILTER_FROM_EXPRESSION hydrates rules + expression", () => {
    const { result } = renderHook(() => useJobsState());
    const expr = { field: "title", operator: "contains", value: "engineer" };
    act(() =>
      result.current.dispatch({
        type: "SET_FILTER_FROM_EXPRESSION",
        expression: expr,
      }),
    );
    expect(result.current.state.expression).toBe(expr);
    expect(result.current.state.rules).toEqual([
      { id: "r1", field: "title", operator: "contains", value: "engineer" },
    ]);
    expect(result.current.state.renderable).toBe(true);
  });

  it("SET_FILTER_FROM_EXPRESSION flags non-renderable expressions", () => {
    const { result } = renderHook(() => useJobsState());
    const expr = {
      op: "or" as const,
      children: [
        { field: "title", operator: "contains", value: "a" },
        { field: "title", operator: "contains", value: "b" },
      ],
    };
    act(() =>
      result.current.dispatch({
        type: "SET_FILTER_FROM_EXPRESSION",
        expression: expr,
      }),
    );
    expect(result.current.state.renderable).toBe(false);
    expect(result.current.state.rules).toEqual([]);
  });

  it("leaves non-matching rules untouched on UPDATE_RULE_OPERATOR / UPDATE_RULE_VALUE", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "status" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_OPERATOR",
        ruleId: "r1",
        operator: "eq",
      }),
    );
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r1",
        value: "engineer",
      }),
    );
    // r2 untouched
    expect(result.current.state.rules[1]).toEqual({
      id: "r2",
      field: "status",
      operator: "eq",
      value: "",
    });
    expect(result.current.state.rules[0]).toEqual({
      id: "r1",
      field: "title",
      operator: "eq",
      value: "engineer",
    });
  });

  it("SET_FIELD_FILTER adds a rule for the field and commits the expression", () => {
    const { result } = renderHook(() => useJobsState());
    act(() =>
      result.current.dispatch({
        type: "SET_FIELD_FILTER",
        field: "title",
        operator: "contains",
        value: "engineer",
      }),
    );
    expect(result.current.state.rules).toEqual([
      { id: "r1", field: "title", operator: "contains", value: "engineer" },
    ]);
    expect(result.current.state.expression).toEqual({
      field: "title",
      operator: "contains",
      value: "engineer",
    });
  });

  it("SET_FIELD_FILTER with an empty value clears rules for that field and commits", () => {
    const { result } = renderHook(() => useJobsState());
    act(() =>
      result.current.dispatch({
        type: "SET_FIELD_FILTER",
        field: "title",
        operator: "contains",
        value: "engineer",
      }),
    );
    act(() =>
      result.current.dispatch({
        type: "SET_FIELD_FILTER",
        field: "title",
        operator: "contains",
        value: "",
      }),
    );
    expect(result.current.state.rules).toEqual([]);
    expect(result.current.state.expression).toBeNull();
  });

  it("SET_FIELD_FILTER replaces any existing rules for the same field", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r1",
        value: "old",
      }),
    );
    act(() =>
      result.current.dispatch({
        type: "SET_FIELD_FILTER",
        field: "title",
        operator: "eq",
        value: "new",
      }),
    );
    expect(result.current.state.rules).toEqual([
      { id: "r2", field: "title", operator: "eq", value: "new" },
    ]);
    expect(result.current.state.expression).toEqual({
      field: "title",
      operator: "eq",
      value: "new",
    });
  });

  it("SET_FIELD_FILTER preserves rules for other fields", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "status" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r1",
        value: "active",
      }),
    );
    act(() =>
      result.current.dispatch({
        type: "SET_FIELD_FILTER",
        field: "title",
        operator: "contains",
        value: "eng",
      }),
    );
    expect(result.current.state.rules).toHaveLength(2);
    const titleRule = result.current.state.rules.find(
      (r) => r.field === "title",
    );
    const statusRule = result.current.state.rules.find(
      (r) => r.field === "status",
    );
    expect(titleRule?.value).toBe("eng");
    expect(statusRule?.value).toBe("active");
  });

  it("SET_FIELD_FILTER ignores unknown fields", () => {
    const { result } = renderHook(() => useJobsState());
    act(() =>
      result.current.dispatch({
        type: "SET_FIELD_FILTER",
        field: "bogus",
        operator: "eq",
        value: "x",
      }),
    );
    expect(result.current.state.rules).toEqual([]);
    expect(result.current.state.expression).toBeNull();
  });

  it("CLEAR_FIELD_RULES drops every rule for the given field and re-commits", () => {
    const { result } = renderHook(() => useJobsState());
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r1",
        value: "eng",
      }),
    );
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "title" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_OPERATOR",
        ruleId: "r2",
        operator: "not_contains",
      }),
    );
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r2",
        value: "intern",
      }),
    );
    act(() => result.current.dispatch({ type: "ADD_RULE", field: "status" }));
    act(() =>
      result.current.dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: "r3",
        value: "active",
      }),
    );
    act(() => result.current.dispatch({ type: "COMMIT_FILTER" }));
    expect(result.current.state.rules).toHaveLength(3);

    act(() =>
      result.current.dispatch({ type: "CLEAR_FIELD_RULES", field: "title" }),
    );
    expect(result.current.state.rules).toEqual([
      { id: "r3", field: "status", operator: "eq", value: "active" },
    ]);
    expect(result.current.state.expression).toEqual({
      field: "status",
      operator: "eq",
      value: "active",
    });
  });

  it("CLEAR_FIELD_RULES on a field with no rules re-commits to null when nothing remains", () => {
    const { result } = renderHook(() => useJobsState());
    act(() =>
      result.current.dispatch({ type: "CLEAR_FIELD_RULES", field: "title" }),
    );
    expect(result.current.state.rules).toEqual([]);
    expect(result.current.state.expression).toBeNull();
  });

  it("unknown actions return the state unchanged", () => {
    const { result } = renderHook(() => useJobsState());
    const before = result.current.state;
    act(() =>
      result.current.dispatch({
        type: "UNKNOWN",
      } as unknown as Parameters<typeof result.current.dispatch>[0]),
    );
    expect(result.current.state).toBe(before);
  });
});
