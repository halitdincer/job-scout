import { describe, expect, it } from "vitest";

import {
  fromBackendFilterExpression,
  toBackendFilterExpression,
} from "./transforms";

describe("toBackendFilterExpression", () => {
  it("returns null for empty expressions", () => {
    expect(toBackendFilterExpression(null)).toBeNull();
    expect(toBackendFilterExpression(undefined)).toBeNull();
  });

  it("maps frontend predicates to backend predicates", () => {
    expect(
      toBackendFilterExpression({
        field: "title",
        operator: "contains",
        value: "engineer",
      }),
    ).toEqual({ field: "title", op: "contains", value: "engineer" });

    expect(
      toBackendFilterExpression({
        field: "title",
        operator: "is_empty",
      }),
    ).toEqual({ field: "title", op: "is_empty" });
  });

  it("normalizes status predicate values", () => {
    expect(
      toBackendFilterExpression({
        field: "status",
        operator: "in",
        value: ["active", "expired"],
      }),
    ).toEqual({ field: "status", op: "in", value: ["ACTIVE", "EXPIRED"] });

    expect(
      toBackendFilterExpression({
        field: "status",
        operator: "eq",
        value: "active",
      }),
    ).toEqual({ field: "status", op: "eq", value: "ACTIVE" });

    expect(
      toBackendFilterExpression({
        field: "status",
        operator: "is_set",
        value: true,
      }),
    ).toEqual({ field: "status", op: "is_set", value: true });
  });

  it("maps logical expressions", () => {
    const predicate = {
      field: "title",
      operator: "contains",
      value: "engineer",
    };

    expect(toBackendFilterExpression({ op: "and", children: [predicate] })).toEqual({
      and: [{ field: "title", op: "contains", value: "engineer" }],
    });
    expect(toBackendFilterExpression({ op: "and" } as never)).toEqual({
      and: [],
    });
    expect(toBackendFilterExpression({ op: "or", children: [predicate] })).toEqual({
      or: [{ field: "title", op: "contains", value: "engineer" }],
    });
    expect(toBackendFilterExpression({ op: "or" } as never)).toEqual({
      or: [],
    });
    expect(toBackendFilterExpression({ op: "not", child: predicate })).toEqual({
      not: { field: "title", op: "contains", value: "engineer" },
    });
  });

  it("passes through unknown expression shapes", () => {
    const expression = { op: "custom", value: 1 };
    expect(toBackendFilterExpression(expression as never)).toBe(expression);
  });
});

describe("fromBackendFilterExpression", () => {
  it("returns null for empty values", () => {
    expect(fromBackendFilterExpression(null)).toBeNull();
  });

  it("maps backend predicates to frontend predicates", () => {
    expect(
      fromBackendFilterExpression({
        field: "title",
        op: "contains",
        value: "engineer",
      }),
    ).toEqual({ field: "title", operator: "contains", value: "engineer" });

    expect(
      fromBackendFilterExpression({
        field: "title",
        op: "is_empty",
      }),
    ).toEqual({ field: "title", operator: "is_empty" });
  });

  it("maps backend logical expressions", () => {
    const predicate = { field: "title", op: "contains", value: "engineer" };

    expect(fromBackendFilterExpression({ and: [null, predicate] })).toEqual({
      op: "and",
      children: [{ field: "title", operator: "contains", value: "engineer" }],
    });
    expect(fromBackendFilterExpression({ or: [predicate] })).toEqual({
      op: "or",
      children: [{ field: "title", operator: "contains", value: "engineer" }],
    });
    expect(fromBackendFilterExpression({ not: null })).toEqual({
      op: "not",
      child: undefined,
    });
  });

  it("passes through frontend expression shapes", () => {
    const expression = { op: "and", children: [] };
    expect(fromBackendFilterExpression(expression)).toBe(expression);
  });
});
