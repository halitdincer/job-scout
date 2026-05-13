/**
 * Typed reducer for the filter rule list on the jobs page. Pagination + sort
 * stay in their own `useState` hooks at the call site.
 */
import { useReducer } from "react";

import { FILTER_FIELD_DEFS } from "./constants";
import {
  expressionToRules,
  genRuleId,
  rulesToExpression,
  type FilterExpression,
  type FilterRule,
} from "./filterExpression";

export type JobsState = {
  rules: FilterRule[];
  expression: FilterExpression | null;
  renderable: boolean;
};

export type JobsAction =
  | { type: "ADD_RULE"; field: string }
  | { type: "REMOVE_RULE"; ruleId: string }
  | { type: "UPDATE_RULE_OPERATOR"; ruleId: string; operator: string }
  | { type: "UPDATE_RULE_VALUE"; ruleId: string; value: string }
  | { type: "CLEAR_RULES" }
  | { type: "COMMIT_FILTER" }
  | { type: "SET_FILTER_FROM_EXPRESSION"; expression: FilterExpression | null };

export const initialJobsState: JobsState = {
  rules: [],
  expression: null,
  renderable: true,
};

export function jobsReducer(state: JobsState, action: JobsAction): JobsState {
  switch (action.type) {
    case "ADD_RULE": {
      const def = FILTER_FIELD_DEFS[action.field];
      if (!def) return state;
      const rule: FilterRule = {
        id: genRuleId(),
        field: action.field,
        operator: def.operators[0],
        value: "",
      };
      return { ...state, rules: [...state.rules, rule], renderable: true };
    }
    case "REMOVE_RULE": {
      return {
        ...state,
        rules: state.rules.filter((r) => r.id !== action.ruleId),
      };
    }
    case "UPDATE_RULE_OPERATOR": {
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.ruleId ? { ...r, operator: action.operator } : r,
        ),
      };
    }
    case "UPDATE_RULE_VALUE": {
      return {
        ...state,
        rules: state.rules.map((r) =>
          r.id === action.ruleId ? { ...r, value: action.value } : r,
        ),
      };
    }
    case "CLEAR_RULES": {
      return { rules: [], expression: null, renderable: true };
    }
    case "COMMIT_FILTER": {
      return {
        ...state,
        expression: rulesToExpression(state.rules),
        renderable: true,
      };
    }
    case "SET_FILTER_FROM_EXPRESSION": {
      const projected = expressionToRules(action.expression);
      return {
        rules: projected.rules,
        expression: projected.expression,
        renderable: projected.renderable,
      };
    }
    default:
      return state;
  }
}

export function useJobsState() {
  const [state, dispatch] = useReducer(jobsReducer, initialJobsState);
  return { state, dispatch };
}
