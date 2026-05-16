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
      <PopoverContent align="start" className="w-64 p-2">
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

type HeaderFilterCellProps = {
  filterField: string;
  filterWidget: FilterWidgetKind;
  rule: FilterRule | undefined;
  dispatch: (action: JobsAction) => void;
  uniqueValues?: string[];
};

export function HeaderFilterCell({
  filterField,
  filterWidget,
  rule,
  dispatch,
  uniqueValues = [],
}: HeaderFilterCellProps) {
  const label = FILTER_FIELD_DEFS[filterField]?.label ?? filterField;

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
