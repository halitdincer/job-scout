import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FIELD_ORDER,
  FILTER_FIELD_DEFS,
  OPERATOR_LABELS,
} from "@/jobs/constants";
import type { FilterRule } from "@/jobs/filterExpression";
import type { JobsAction, JobsState } from "@/jobs/useJobsState";

type Props = {
  state: JobsState;
  dispatch: (action: JobsAction) => void;
  onApplied: () => void;
};

const VALUELESS_OPERATORS = new Set(["is_empty", "is_not_empty"]);

function fieldLabel(field: string) {
  return FILTER_FIELD_DEFS[field]?.label ?? field;
}

export function FiltersPanel({ state, dispatch, onApplied }: Props) {
  const { rules, renderable } = state;
  const disabled = !renderable;

  const handleAddRule = (event: ChangeEvent<HTMLSelectElement>) => {
    const field = event.target.value;
    if (!field) return;
    dispatch({ type: "ADD_RULE", field });
    event.target.value = "";
  };

  const handleOperatorChange = (rule: FilterRule) =>
    (event: ChangeEvent<HTMLSelectElement>) =>
      dispatch({
        type: "UPDATE_RULE_OPERATOR",
        ruleId: rule.id,
        operator: event.target.value,
      });

  const handleValueChange = (rule: FilterRule) =>
    (event: ChangeEvent<HTMLInputElement>) =>
      dispatch({
        type: "UPDATE_RULE_VALUE",
        ruleId: rule.id,
        value: event.target.value,
      });

  const handleRemove = (rule: FilterRule) => () =>
    dispatch({ type: "REMOVE_RULE", ruleId: rule.id });

  const handleClear = () => dispatch({ type: "CLEAR_RULES" });

  const handleApply = () => {
    dispatch({ type: "COMMIT_FILTER" });
    onApplied();
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {disabled ? (
        <p
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          The current filter contains OR/NOT or nested groups and cannot be
          edited here. Clear it to build a new filter.
        </p>
      ) : null}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No filter rules yet. Pick a field below to add one.
          </p>
        ) : null}
        {rules.map((rule) => {
          const def = FILTER_FIELD_DEFS[rule.field];
          const operators = def?.operators ?? [rule.operator];
          const showValue = !VALUELESS_OPERATORS.has(rule.operator);
          const label = fieldLabel(rule.field);
          return (
            <div
              key={rule.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-input p-2"
            >
              <span className="min-w-28 text-sm font-medium">{label}</span>
              <label className="sr-only" htmlFor={`op-${rule.id}`}>
                {`Operator for ${label}`}
              </label>
              <select
                id={`op-${rule.id}`}
                aria-label={`Operator for ${label}`}
                value={rule.operator}
                onChange={handleOperatorChange(rule)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {operators.map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op] || op}
                  </option>
                ))}
              </select>
              {showValue ? (
                <>
                  <label className="sr-only" htmlFor={`val-${rule.id}`}>
                    {`Value for ${label}`}
                  </label>
                  <Input
                    id={`val-${rule.id}`}
                    aria-label={`Value for ${label}`}
                    value={rule.value ?? ""}
                    onChange={handleValueChange(rule)}
                    className="h-9 flex-1 min-w-40"
                  />
                </>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Remove ${label} rule`}
                onClick={handleRemove(rule)}
              >
                Remove
              </Button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="filters-add-rule"
          className="text-sm font-medium text-muted-foreground"
        >
          Add filter rule
        </label>
        <select
          id="filters-add-rule"
          aria-label="Add filter rule"
          defaultValue=""
          disabled={disabled}
          onChange={handleAddRule}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="" disabled>
            Pick a field…
          </option>
          {FIELD_ORDER.map((field) => (
            <option key={field} value={field}>
              {fieldLabel(field)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-auto flex items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={rules.length === 0 && state.expression === null}
        >
          Clear filters
        </Button>
        <Button
          type="button"
          onClick={handleApply}
          disabled={disabled || rules.length === 0}
        >
          Apply filters
        </Button>
      </div>
    </div>
  );
}
