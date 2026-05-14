/**
 * Static configuration for the jobs page.
 *
 * These tables are duplicated from the server-side definitions in
 * `core/filter_expression.py` and `core/views.py`. Keep them in sync.
 */

import type { SortSpec } from "@/api/jobs";

export type FilterFieldType = "text" | "enum" | "array" | "date";

export type FilterFieldDef = {
  label: string;
  type: FilterFieldType;
  operators: string[];
  headerField: string | null;
};

export const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
  temporary: "Temporary",
  unknown: "Unknown",
};

export const WORKPLACE_LABELS: Record<string, string> = {
  on_site: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
  unknown: "Unknown",
};

export const OPERATOR_LABELS: Record<string, string> = {
  contains: "contains",
  not_contains: "does not contain",
  eq: "equals",
  neq: "does not equal",
  in: "is any of",
  not_in: "is none of",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  before: "before",
  after: "after",
  in_last_days: "in last N days",
};

export const FILTER_FIELD_DEFS: Record<string, FilterFieldDef> = {
  title: {
    label: "Title",
    type: "text",
    operators: ["contains", "not_contains", "eq", "neq", "is_empty", "is_not_empty"],
    headerField: "title",
  },
  source_name: {
    label: "Company",
    type: "text",
    operators: [
      "contains",
      "eq",
      "neq",
      "in",
      "not_in",
      "is_empty",
      "is_not_empty",
    ],
    headerField: "source_name",
  },
  status: {
    label: "Status",
    type: "enum",
    operators: ["eq", "neq", "in", "not_in"],
    headerField: "status",
  },
  department: {
    label: "Department",
    type: "text",
    operators: ["contains", "not_contains", "eq", "neq", "is_empty", "is_not_empty"],
    headerField: null,
  },
  team: {
    label: "Team",
    type: "text",
    operators: ["contains", "not_contains", "eq", "neq", "is_empty", "is_not_empty"],
    headerField: null,
  },
  employment_type: {
    label: "Type",
    type: "enum",
    operators: ["eq", "neq", "in", "not_in"],
    headerField: "employment_type_label",
  },
  workplace_type: {
    label: "Workplace",
    type: "enum",
    operators: ["eq", "neq", "in", "not_in"],
    headerField: "workplace_type_label",
  },
  country: {
    label: "Country",
    type: "array",
    operators: ["eq", "neq", "in", "not_in", "is_empty", "is_not_empty"],
    headerField: "country",
  },
  region: {
    label: "Region",
    type: "array",
    operators: ["eq", "neq", "in", "not_in", "is_empty", "is_not_empty"],
    headerField: "region",
  },
  city: {
    label: "City",
    type: "array",
    operators: [
      "contains",
      "not_contains",
      "eq",
      "neq",
      "in",
      "not_in",
      "is_empty",
      "is_not_empty",
    ],
    headerField: "city",
  },
  published_at: {
    label: "Published At",
    type: "date",
    operators: ["before", "after", "in_last_days", "is_empty", "is_not_empty"],
    headerField: "published_at",
  },
  first_seen_at: {
    label: "First Seen",
    type: "date",
    operators: ["before", "after", "in_last_days", "is_empty", "is_not_empty"],
    headerField: "first_seen_at",
  },
  last_seen_at: {
    label: "Last Seen",
    type: "date",
    operators: ["before", "after", "in_last_days", "is_empty", "is_not_empty"],
    headerField: "last_seen_at",
  },
  updated_at_source: {
    label: "Updated At Source",
    type: "date",
    operators: ["before", "after", "in_last_days", "is_empty", "is_not_empty"],
    headerField: "updated_at_source",
  },
  expired_at: {
    label: "Expired At",
    type: "date",
    operators: ["before", "after", "in_last_days", "is_empty", "is_not_empty"],
    headerField: "expired_at",
  },
};

export const FIELD_ORDER: string[] = Object.keys(FILTER_FIELD_DEFS);

export const COLUMN_TO_FILTER: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  FIELD_ORDER.forEach((filterField) => {
    const def = FILTER_FIELD_DEFS[filterField];
    if (def.headerField) out[def.headerField] = filterField;
  });
  return out;
})();

export const EMPTY_SENTINEL = "__EMPTY__";

export const DATE_RANGE_PRESETS: Array<{ label: string; value: string }> = [
  { label: "Today", value: "0" },
  { label: "Last 1 day", value: "1" },
  { label: "Last 3 days", value: "3" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 14 days", value: "14" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

export const PAGE_SIZE_ALLOWLIST = [25, 50, 100, 250] as const;
export const DEFAULT_PAGE_SIZE = 50;

export const DEFAULT_SORT: SortSpec[] = [
  { field: "first_seen_at", dir: "desc" },
];

export const SORTABLE_FIELDS: string[] = [
  "title",
  "department",
  "team",
  "status",
  "employment_type",
  "workplace_type",
  "source_name",
  "published_at",
  "first_seen_at",
  "last_seen_at",
  "updated_at_source",
  "expired_at",
  "country",
  "region",
  "city",
  "seen",
];
