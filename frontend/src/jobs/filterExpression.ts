/**
 * Lossless projection between a canonical filter expression tree and a flat
 * list of rules that the UI can render.
 *
 * Expression tree shape (sent to/from the server):
 *   predicate := { field, operator, value? }
 *   and       := { op: "and", children: [node, ...] }
 *   or        := { op: "or",  children: [node, ...] }
 *   not       := { op: "not", child: node }
 *
 * Rule shape (UI-friendly; values always string|null):
 *   rule      := { id, field, operator, value }
 *
 * A tree is "renderable" iff it is either a single predicate or a top-level
 * AND whose children are all predicates. Anything containing OR/NOT or
 * nested groups is non-renderable; the original expression is echoed so
 * callers can fall back to a JSON editor without lossy round-tripping.
 */

export type Predicate = {
  field: string;
  operator: string;
  value?: unknown;
};

export type AndExpression = {
  op: "and";
  children?: FilterExpression[];
};

export type OrExpression = {
  op: "or";
  children?: FilterExpression[];
};

export type NotExpression = {
  op: "not";
  child?: FilterExpression;
};

export type FilterExpression =
  | Predicate
  | AndExpression
  | OrExpression
  | NotExpression;

export type FilterRule = {
  id: string;
  field: string;
  operator: string;
  value: string | null;
};

export type ProjectedExpression = {
  renderable: boolean;
  rules: FilterRule[];
  expression: FilterExpression | null;
};

let ruleIdSeq = 0;

export function genRuleId(): string {
  ruleIdSeq += 1;
  return `r${ruleIdSeq}`;
}

export function resetRuleIdSequenceForTesting(): void {
  ruleIdSeq = 0;
}

function isPredicate(node: unknown): node is Predicate {
  if (!node || typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  return (
    obj.op === undefined &&
    typeof obj.field === "string" &&
    typeof obj.operator === "string"
  );
}

function predicateToRule(p: Predicate): FilterRule {
  let value = "";
  if (p.value !== undefined && p.value !== null) {
    value = Array.isArray(p.value) ? p.value.join(", ") : String(p.value);
  }
  return {
    id: genRuleId(),
    field: p.field,
    operator: p.operator,
    value,
  };
}

export function expressionToRules(
  expression: FilterExpression | null | undefined,
): ProjectedExpression {
  if (expression === null || expression === undefined) {
    return { renderable: true, rules: [], expression: null };
  }
  if (isPredicate(expression)) {
    return {
      renderable: true,
      rules: [predicateToRule(expression)],
      expression,
    };
  }
  const andExpr = expression as AndExpression;
  if (
    andExpr.op === "and" &&
    Array.isArray(andExpr.children) &&
    andExpr.children.length > 0 &&
    andExpr.children.every(isPredicate)
  ) {
    return {
      renderable: true,
      rules: andExpr.children.map((c) => predicateToRule(c as Predicate)),
      expression,
    };
  }
  return { renderable: false, rules: [], expression };
}

function ruleToPredicate(rule: FilterRule): Predicate | null {
  const payload: Predicate = { field: rule.field, operator: rule.operator };
  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return payload;
  }
  const raw = (rule.value || "").trim();
  if (!raw) return null;
  if (rule.operator === "in" || rule.operator === "not_in") {
    const listValue = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!listValue.length) return null;
    payload.value = listValue;
    return payload;
  }
  if (rule.operator === "in_last_days") {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    payload.value = parsed;
    return payload;
  }
  payload.value = raw;
  return payload;
}

export function rulesToExpression(
  rules: FilterRule[] | null | undefined,
): FilterExpression | null {
  const predicates: Predicate[] = [];
  (rules || []).forEach((rule) => {
    const p = ruleToPredicate(rule);
    if (p) predicates.push(p);
  });
  if (predicates.length === 0) return null;
  if (predicates.length === 1) return predicates[0];
  return { op: "and", children: predicates };
}

export function containsDisjunctionOrNegation(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const obj = node as Record<string, unknown>;
  if (obj.op === "or" || obj.op === "not") return true;
  if (obj.op === "and" && Array.isArray(obj.children)) {
    return obj.children.some(containsDisjunctionOrNegation);
  }
  return false;
}
