import type { FilterExpression } from "@/jobs/filterExpression";

type FrontendPredicate = {
  field: string;
  operator: string;
  value?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFrontendPredicate(value: unknown): value is FrontendPredicate {
  return (
    isRecord(value) &&
    typeof value.field === "string" &&
    typeof value.operator === "string"
  );
}

export function toBackendFilterExpression(
  expression: FilterExpression | null | undefined,
): unknown {
  if (!expression) {
    return null;
  }
  if (isFrontendPredicate(expression)) {
    const predicate: Record<string, unknown> = {
      field: expression.field,
      op: expression.operator,
    };
    if (expression.value !== undefined) {
      predicate.value = toBackendPredicateValue(expression.field, expression.value);
    }
    return predicate;
  }
  if (expression.op === "and") {
    return { and: (expression.children ?? []).map(toBackendFilterExpression) };
  }
  if (expression.op === "or") {
    return { or: (expression.children ?? []).map(toBackendFilterExpression) };
  }
  if (expression.op === "not") {
    return { not: toBackendFilterExpression(expression.child) };
  }
  return expression;
}

export function fromBackendFilterExpression(value: unknown): FilterExpression | null {
  if (!value) {
    return null;
  }
  if (
    isRecord(value) &&
    typeof value.field === "string" &&
    typeof value.op === "string"
  ) {
    const predicate: FrontendPredicate = {
      field: value.field,
      operator: value.op,
    };
    if ("value" in value) {
      predicate.value = value.value;
    }
    return predicate;
  }
  if (isRecord(value) && Array.isArray(value.and)) {
    return {
      op: "and",
      children: value.and
        .map(fromBackendFilterExpression)
        .filter(Boolean) as FilterExpression[],
    };
  }
  if (isRecord(value) && Array.isArray(value.or)) {
    return {
      op: "or",
      children: value.or
        .map(fromBackendFilterExpression)
        .filter(Boolean) as FilterExpression[],
    };
  }
  if (isRecord(value) && "not" in value) {
    return { op: "not", child: fromBackendFilterExpression(value.not) ?? undefined };
  }
  return value as FilterExpression;
}

function toBackendPredicateValue(field: string, value: unknown) {
  if (field !== "status") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).toUpperCase());
  }
  return typeof value === "string" ? value.toUpperCase() : value;
}
