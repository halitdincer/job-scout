import { beforeEach, describe, expect, it } from "vitest";

import {
  containsDisjunctionOrNegation,
  expressionToRules,
  genRuleId,
  resetRuleIdSequenceForTesting,
  rulesToExpression,
} from "../filterExpression.js";

beforeEach(() => {
  resetRuleIdSequenceForTesting();
});

describe("expressionToRules", () => {
  it("returns empty renderable result for null", () => {
    expect(expressionToRules(null)).toEqual({
      renderable: true,
      rules: [],
      expression: null,
    });
  });

  it("returns empty renderable result for undefined", () => {
    expect(expressionToRules(undefined)).toEqual({
      renderable: true,
      rules: [],
      expression: null,
    });
  });

  it("flattens a single predicate", () => {
    const expr = { field: "title", operator: "contains", value: "engineer" };
    const result = expressionToRules(expr);
    expect(result.renderable).toBe(true);
    expect(result.rules).toEqual([
      { id: "r1", field: "title", operator: "contains", value: "engineer" },
    ]);
    expect(result.expression).toBe(expr);
  });

  it("flattens an AND of predicates", () => {
    const expr = {
      op: "and",
      children: [
        { field: "title", operator: "contains", value: "engineer" },
        { field: "status", operator: "eq", value: "active" },
      ],
    };
    const result = expressionToRules(expr);
    expect(result.renderable).toBe(true);
    expect(result.rules).toEqual([
      { id: "r1", field: "title", operator: "contains", value: "engineer" },
      { id: "r2", field: "status", operator: "eq", value: "active" },
    ]);
  });

  it("stringifies array values for in/not_in rules", () => {
    const expr = {
      field: "country",
      operator: "in",
      value: ["US", "CA"],
    };
    const result = expressionToRules(expr);
    expect(result.rules[0].value).toBe("US, CA");
  });

  it("stringifies integer value for in_last_days", () => {
    const expr = { field: "first_seen_at", operator: "in_last_days", value: 7 };
    const result = expressionToRules(expr);
    expect(result.rules[0].value).toBe("7");
  });

  it("returns empty value for is_empty / is_not_empty predicates", () => {
    const expr = { field: "title", operator: "is_empty" };
    expect(expressionToRules(expr).rules[0].value).toBe("");
  });

  it("marks OR expressions as non-renderable", () => {
    const expr = {
      op: "or",
      children: [
        { field: "title", operator: "contains", value: "engineer" },
        { field: "title", operator: "contains", value: "designer" },
      ],
    };
    const result = expressionToRules(expr);
    expect(result.renderable).toBe(false);
    expect(result.rules).toEqual([]);
    expect(result.expression).toBe(expr);
  });

  it("marks NOT expressions as non-renderable", () => {
    const expr = {
      op: "not",
      child: { field: "title", operator: "contains", value: "intern" },
    };
    const result = expressionToRules(expr);
    expect(result.renderable).toBe(false);
    expect(result.rules).toEqual([]);
  });

  it("marks nested AND with group children as non-renderable", () => {
    const expr = {
      op: "and",
      children: [
        { field: "title", operator: "contains", value: "eng" },
        { op: "or", children: [] },
      ],
    };
    const result = expressionToRules(expr);
    expect(result.renderable).toBe(false);
  });

  it("marks empty AND as non-renderable", () => {
    const expr = { op: "and", children: [] };
    const result = expressionToRules(expr);
    expect(result.renderable).toBe(false);
  });

  it("marks AND with missing children as non-renderable", () => {
    const expr = { op: "and" };
    const result = expressionToRules(expr);
    expect(result.renderable).toBe(false);
  });
});

describe("rulesToExpression", () => {
  it("returns null for an empty array", () => {
    expect(rulesToExpression([])).toBe(null);
  });

  it("returns null for null", () => {
    expect(rulesToExpression(null)).toBe(null);
  });

  it("returns a single predicate for one rule", () => {
    const rules = [
      { id: "r1", field: "title", operator: "contains", value: "engineer" },
    ];
    expect(rulesToExpression(rules)).toEqual({
      field: "title",
      operator: "contains",
      value: "engineer",
    });
  });

  it("returns AND for multiple predicates", () => {
    const rules = [
      { id: "r1", field: "title", operator: "contains", value: "engineer" },
      { id: "r2", field: "status", operator: "eq", value: "active" },
    ];
    expect(rulesToExpression(rules)).toEqual({
      op: "and",
      children: [
        { field: "title", operator: "contains", value: "engineer" },
        { field: "status", operator: "eq", value: "active" },
      ],
    });
  });

  it("drops rules with empty values except is_empty / is_not_empty", () => {
    const rules = [
      { id: "r1", field: "title", operator: "contains", value: "" },
      { id: "r2", field: "title", operator: "is_empty", value: "" },
      { id: "r3", field: "title", operator: "is_not_empty", value: "" },
    ];
    expect(rulesToExpression(rules)).toEqual({
      op: "and",
      children: [
        { field: "title", operator: "is_empty" },
        { field: "title", operator: "is_not_empty" },
      ],
    });
  });

  it("splits `in` value on commas", () => {
    const rules = [
      { id: "r1", field: "country", operator: "in", value: "US, CA , MX" },
    ];
    expect(rulesToExpression(rules)).toEqual({
      field: "country",
      operator: "in",
      value: ["US", "CA", "MX"],
    });
  });

  it("splits `not_in` value on commas", () => {
    const rules = [
      { id: "r1", field: "country", operator: "not_in", value: "US,CA" },
    ];
    expect(rulesToExpression(rules)).toEqual({
      field: "country",
      operator: "not_in",
      value: ["US", "CA"],
    });
  });

  it("drops `in` rule when value is only whitespace/commas", () => {
    const rules = [
      { id: "r1", field: "country", operator: "in", value: " , , " },
    ];
    expect(rulesToExpression(rules)).toBe(null);
  });

  it("parses `in_last_days` as integer", () => {
    const rules = [
      { id: "r1", field: "first_seen_at", operator: "in_last_days", value: "7" },
    ];
    expect(rulesToExpression(rules)).toEqual({
      field: "first_seen_at",
      operator: "in_last_days",
      value: 7,
    });
  });

  it("drops `in_last_days` rule when value is not a valid integer", () => {
    expect(
      rulesToExpression([
        { id: "r1", field: "first_seen_at", operator: "in_last_days", value: "abc" },
      ])
    ).toBe(null);
  });

  it("drops `in_last_days` rule with negative value", () => {
    expect(
      rulesToExpression([
        { id: "r1", field: "first_seen_at", operator: "in_last_days", value: "-1" },
      ])
    ).toBe(null);
  });

  it("trims scalar values", () => {
    const rules = [
      { id: "r1", field: "title", operator: "contains", value: "  hi  " },
    ];
    expect(rulesToExpression(rules)).toEqual({
      field: "title",
      operator: "contains",
      value: "hi",
    });
  });

  it("handles null value on rule", () => {
    const rules = [{ id: "r1", field: "title", operator: "contains", value: null }];
    expect(rulesToExpression(rules)).toBe(null);
  });
});

describe("round trip", () => {
  it("predicate → rules → predicate preserves shape", () => {
    const original = {
      op: "and",
      children: [
        { field: "title", operator: "contains", value: "engineer" },
        { field: "country", operator: "in", value: ["US", "CA"] },
      ],
    };
    const { rules } = expressionToRules(original);
    expect(rulesToExpression(rules)).toEqual(original);
  });
});

describe("containsDisjunctionOrNegation", () => {
  it("returns false for plain predicate", () => {
    expect(
      containsDisjunctionOrNegation({
        field: "title",
        operator: "eq",
        value: "x",
      })
    ).toBe(false);
  });
  it("returns false for AND of predicates", () => {
    expect(
      containsDisjunctionOrNegation({
        op: "and",
        children: [{ field: "a", operator: "eq", value: "x" }],
      })
    ).toBe(false);
  });
  it("returns true for OR group", () => {
    expect(containsDisjunctionOrNegation({ op: "or", children: [] })).toBe(true);
  });
  it("returns true for NOT group", () => {
    expect(containsDisjunctionOrNegation({ op: "not", child: {} })).toBe(true);
  });
  it("returns true for deeply nested OR", () => {
    expect(
      containsDisjunctionOrNegation({
        op: "and",
        children: [
          { field: "a", operator: "eq", value: "x" },
          { op: "or", children: [] },
        ],
      })
    ).toBe(true);
  });
  it("returns false for null", () => {
    expect(containsDisjunctionOrNegation(null)).toBe(false);
  });
  it("returns false for non-object", () => {
    expect(containsDisjunctionOrNegation("foo")).toBe(false);
  });
  it("returns false for AND with missing children", () => {
    expect(containsDisjunctionOrNegation({ op: "and" })).toBe(false);
  });
});

describe("genRuleId", () => {
  it("increments monotonically", () => {
    expect(genRuleId()).toBe("r1");
    expect(genRuleId()).toBe("r2");
    expect(genRuleId()).toBe("r3");
  });
});
