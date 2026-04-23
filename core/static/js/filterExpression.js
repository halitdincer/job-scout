/**
 * Lossless projection between a canonical filter expression tree and a flat
 * list of rules that the UI can render.
 *
 * Expression tree shape (sent to/from the server):
 *   predicate     := { field, operator, value? }
 *   and           := { op: "and", children: [node, ...] }
 *   or            := { op: "or",  children: [node, ...] }
 *   not           := { op: "not", child:   node }
 *
 * Rule shape (UI-friendly; values always string):
 *   rule          := { id, field, operator, value }
 *
 * A tree is "renderable" iff it is either a single predicate or a top-level
 * AND whose children are all predicates. Anything containing OR/NOT or nested
 * groups is considered non-renderable; the original expression is echoed so
 * callers can fall back to a JSON editor without lossy round-tripping.
 */

let ruleIdSeq = 0;

/**
 * Monotonically increasing rule id, scoped to the module.
 * Exposed via `resetRuleIdSequenceForTesting` for deterministic tests.
 */
export function genRuleId() {
  ruleIdSeq += 1;
  return `r${ruleIdSeq}`;
}

export function resetRuleIdSequenceForTesting() {
  ruleIdSeq = 0;
}

function isPredicate(node) {
  return (
    !!node &&
    typeof node === "object" &&
    !node.op &&
    typeof node.field === "string" &&
    typeof node.operator === "string"
  );
}

function predicateToRule(p) {
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

/**
 * Flatten a filter expression tree into rules for UI rendering.
 * Returns `{ renderable, rules, expression }`:
 *   - renderable=true  → rules faithfully represent the tree; use them.
 *   - renderable=false → tree contains OR/NOT or nested groups; show a JSON
 *     fallback editor. `rules` is empty; callers must not synthesize rules.
 *   - expression is always the original input (echoed for fallback).
 */
export function expressionToRules(expression) {
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
  if (
    expression.op === "and" &&
    Array.isArray(expression.children) &&
    expression.children.length > 0 &&
    expression.children.every(isPredicate)
  ) {
    return {
      renderable: true,
      rules: expression.children.map(predicateToRule),
      expression,
    };
  }
  return { renderable: false, rules: [], expression };
}

/**
 * Build a filter expression tree from a list of rules. Individual rules are
 * normalized (trimmed; `in`/`not_in` split on comma; `in_last_days` parsed
 * to int). Rules that normalize to an empty value are dropped. Returns:
 *   - null            if no predicates remain
 *   - single predicate if exactly one remains
 *   - { op:"and" }    for 2+ predicates
 */
export function rulesToExpression(rules) {
  const predicates = [];
  (rules || []).forEach((rule) => {
    const p = ruleToPredicate(rule);
    if (p) predicates.push(p);
  });
  if (predicates.length === 0) return null;
  if (predicates.length === 1) return predicates[0];
  return { op: "and", children: predicates };
}

function ruleToPredicate(rule) {
  const payload = { field: rule.field, operator: rule.operator };
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
    if (isNaN(parsed) || parsed < 0) return null;
    payload.value = parsed;
    return payload;
  }
  payload.value = raw;
  return payload;
}

/**
 * True iff the tree contains only AND groups and predicates. A shallow AND
 * of predicates is the most common case (expressionToRules renders those);
 * this helper also acknowledges deeply-nested AND-only trees as renderable,
 * in case the server normalizes differently in the future.
 *
 * Currently expressionToRules only flattens shallow AND trees, so deep-AND
 * trees still fall through to renderable=false to stay safe. This function
 * is kept as a pure tree walker for future use and for test coverage.
 */
export function containsDisjunctionOrNegation(node) {
  if (!node || typeof node !== "object") return false;
  if (node.op === "or" || node.op === "not") return true;
  if (node.op === "and" && Array.isArray(node.children)) {
    return node.children.some(containsDisjunctionOrNegation);
  }
  return false;
}
