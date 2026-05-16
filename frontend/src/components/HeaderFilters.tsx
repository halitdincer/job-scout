import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Filter as FilterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FilterWidgetKind } from "@/jobs/columns";
import {
  DATE_RANGE_PRESETS,
  EMPTY_SENTINEL,
  FILTER_FIELD_DEFS,
  OPERATOR_LABELS,
} from "@/jobs/constants";
import type { FilterRule } from "@/jobs/filterExpression";
import type { JobsAction } from "@/jobs/useJobsState";
import { cn } from "@/lib/utils";

type CommonProps = {
  field: string;
  label: string;
  rule: FilterRule | undefined;
  dispatch: (action: JobsAction) => void;
};

export function TextHeaderFilter({
  field,
  label,
  rule,
  dispatch,
}: CommonProps) {
  const ruleValue = rule?.value ?? "";
  const [draft, setDraft] = useState(ruleValue);

  useEffect(() => {
    setDraft(ruleValue);
  }, [ruleValue]);

  const commit = () => {
    if (draft.trim() === ruleValue.trim()) return;
    dispatch({
      type: "SET_FIELD_FILTER",
      field,
      operator: "contains",
      value: draft.trim(),
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  };

  return (
    <Input
      aria-label={`Filter ${label}`}
      value={draft}
      placeholder={`Filter ${label}`}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className={cn(
        "h-8 text-xs",
        ruleValue !== "" && "border-primary text-primary",
      )}
    />
  );
}

type MultiSelectProps = CommonProps & {
  uniqueValues: string[];
};

function parseSelected(rule: FilterRule | undefined): Set<string> {
  if (!rule?.value) return new Set();
  return new Set(
    rule.value
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function MultiSelectHeaderFilter({
  field,
  label,
  rule,
  dispatch,
  uniqueValues,
}: MultiSelectProps) {
  const selected = useMemo(() => parseSelected(rule), [rule]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(selected);

  useEffect(() => {
    if (open) {
      setDraft(new Set(selected));
    }
  }, [open, selected]);

  const allChoices = useMemo(
    () => [EMPTY_SENTINEL, ...uniqueValues],
    [uniqueValues],
  );
  const allSelected =
    allChoices.length > 0 && allChoices.every((value) => draft.has(value));

  const toggleValue = (value: string) => {
    const next = new Set(draft);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    setDraft(next);
  };

  const toggleAll = () => {
    setDraft(allSelected ? new Set() : new Set(allChoices));
  };

  const apply = () => {
    const value = Array.from(draft).join(",");
    dispatch({
      type: "SET_FIELD_FILTER",
      field,
      operator: "in",
      value,
    });
    setOpen(false);
  };

  const clear = () => {
    setDraft(new Set());
    dispatch({
      type: "SET_FIELD_FILTER",
      field,
      operator: "in",
      value: "",
    });
    setOpen(false);
  };

  const active = selected.size > 0;
  const summary = active ? `${selected.size} selected` : "All";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Filter ${label}`}
          className={cn(
            "h-8 w-full justify-between text-xs font-normal",
            active && "border-primary text-primary",
          )}
        >
          <span className="truncate">{summary}</span>
          <FilterIcon className="ml-2 h-3 w-3 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 max-w-[calc(100vw-2rem)] p-2">
        <div className="max-h-60 space-y-1 overflow-y-auto">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              aria-label="Select All"
              checked={allSelected}
              onChange={toggleAll}
            />
            Select All
          </label>
          <label className="flex items-center gap-2 text-sm italic text-muted-foreground">
            <input
              type="checkbox"
              aria-label="Filter empties"
              checked={draft.has(EMPTY_SENTINEL)}
              onChange={() => toggleValue(EMPTY_SENTINEL)}
            />
            (Empty)
          </label>
          {uniqueValues.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label={value}
                checked={draft.has(value)}
                onChange={() => toggleValue(value)}
              />
              <span className="truncate">{value}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-end gap-2 border-t pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DateHeaderFilter({
  field,
  label,
  rule,
  dispatch,
}: CommonProps) {
  const value =
    rule?.operator === "in_last_days" ? (rule.value ?? "") : "";

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: "SET_FIELD_FILTER",
      field,
      operator: "in_last_days",
      value: event.target.value,
    });
  };

  return (
    <select
      aria-label={`Filter ${label}`}
      value={value}
      onChange={handleChange}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2 text-xs",
        value !== "" && "border-primary text-primary",
      )}
    >
      <option value="">Any time</option>
      {DATE_RANGE_PRESETS.map((preset) => (
        <option key={preset.value} value={preset.value}>
          {preset.label}
        </option>
      ))}
    </select>
  );
}

const CANONICAL_OPERATOR: Record<FilterWidgetKind, string> = {
  text: "contains",
  multi: "in",
  date: "in_last_days",
};

const VALUELESS_OPERATORS = new Set(["is_empty", "is_not_empty"]);
const DATE_INPUT_OPERATORS = new Set(["before", "after"]);

type MultiRulePopoverProps = {
  field: string;
  label: string;
  rules: FilterRule[];
  dispatch: (action: JobsAction) => void;
};

function MultiRulePopover({
  field,
  label,
  rules,
  dispatch,
}: MultiRulePopoverProps) {
  const [open, setOpen] = useState(false);
  const def = FILTER_FIELD_DEFS[field];
  const operators = def?.operators ?? [];
  const isDateField = def?.type === "date";
  const summary = `${rules.length} filter${rules.length === 1 ? "" : "s"}`;

  const updateOperator = (ruleId: string, operator: string) => {
    dispatch({ type: "UPDATE_RULE_OPERATOR", ruleId, operator });
    dispatch({ type: "COMMIT_FILTER" });
  };

  const updateValue = (ruleId: string, value: string) => {
    dispatch({ type: "UPDATE_RULE_VALUE", ruleId, value });
    dispatch({ type: "COMMIT_FILTER" });
  };

  const removeRule = (ruleId: string) => {
    dispatch({ type: "REMOVE_RULE", ruleId });
    dispatch({ type: "COMMIT_FILTER" });
  };

  const addRule = () => {
    dispatch({ type: "ADD_RULE", field });
  };

  const clearAll = () => {
    dispatch({ type: "CLEAR_FIELD_RULES", field });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Filter ${label}`}
          className="h-8 w-full justify-between border-primary text-xs font-normal text-primary"
        >
          <span className="truncate">{summary}</span>
          <FilterIcon className="ml-2 h-3 w-3 shrink-0" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-2">
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {rules.map((rule) => {
            const valueless = VALUELESS_OPERATORS.has(rule.operator);
            const dateInput =
              isDateField && DATE_INPUT_OPERATORS.has(rule.operator);
            const datePreset =
              isDateField && rule.operator === "in_last_days";
            return (
              <div
                key={rule.id}
                className="flex flex-col gap-2 rounded-md border border-input p-2 sm:flex-row sm:items-center sm:p-1"
              >
                <select
                  aria-label={`Operator for rule ${rule.id}`}
                  value={rule.operator}
                  onChange={(event) =>
                    updateOperator(rule.id, event.target.value)
                  }
                  className="h-8 w-full rounded-md border border-input bg-background px-1 text-xs sm:w-auto"
                >
                  {operators.map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>
                {valueless ? null : datePreset ? (
                  <select
                    aria-label={`Value for rule ${rule.id}`}
                    value={rule.value ?? ""}
                    onChange={(event) =>
                      updateValue(rule.id, event.target.value)
                    }
                    className="h-8 w-full rounded-md border border-input bg-background px-1 text-xs sm:flex-1"
                  >
                    <option value="">—</option>
                    {DATE_RANGE_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    aria-label={`Value for rule ${rule.id}`}
                    type={dateInput ? "date" : "text"}
                    value={rule.value ?? ""}
                    onChange={(event) =>
                      updateValue(rule.id, event.target.value)
                    }
                    className="h-8 w-full text-xs sm:flex-1"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove rule ${rule.id}`}
                  onClick={() => removeRule(rule.id)}
                  className="h-8 self-end px-2 sm:self-auto"
                >
                  ×
                </Button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between gap-2 border-t pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
          <Button type="button" size="sm" onClick={addRule}>
            Add rule
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type HeaderFilterCellProps = {
  filterField: string;
  filterWidget: FilterWidgetKind;
  rules: FilterRule[];
  dispatch: (action: JobsAction) => void;
  uniqueValues?: string[];
};

export function HeaderFilterCell({
  filterField,
  filterWidget,
  rules,
  dispatch,
  uniqueValues = [],
}: HeaderFilterCellProps) {
  const label = FILTER_FIELD_DEFS[filterField]?.label ?? filterField;
  const canonical = CANONICAL_OPERATOR[filterWidget];
  const useSimpleWidget =
    rules.length === 0 ||
    (filterWidget !== "text" &&
      rules.length === 1 &&
      rules[0].operator === canonical);

  if (!useSimpleWidget) {
    return (
      <MultiRulePopover
        field={filterField}
        label={label}
        rules={rules}
        dispatch={dispatch}
      />
    );
  }

  const rule = rules[0];
  if (filterWidget === "text") {
    return (
      <TextHeaderFilter
        field={filterField}
        label={label}
        rule={rule}
        dispatch={dispatch}
      />
    );
  }
  if (filterWidget === "multi") {
    return (
      <MultiSelectHeaderFilter
        field={filterField}
        label={label}
        rule={rule}
        dispatch={dispatch}
        uniqueValues={uniqueValues}
      />
    );
  }
  return (
    <DateHeaderFilter
      field={filterField}
      label={label}
      rule={rule}
      dispatch={dispatch}
    />
  );
}
