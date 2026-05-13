import { describe, expect, it } from "vitest";

import {
  COLUMN_TO_FILTER,
  DATE_RANGE_PRESETS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  EMPLOYMENT_LABELS,
  EMPTY_SENTINEL,
  FIELD_ORDER,
  FILTER_FIELD_DEFS,
  OPERATOR_LABELS,
  PAGE_SIZE_ALLOWLIST,
  SORTABLE_FIELDS,
  WORKPLACE_LABELS,
} from "./constants";

describe("filter field definitions", () => {
  it("includes the title field", () => {
    expect(FILTER_FIELD_DEFS.title.label).toBe("Title");
    expect(FILTER_FIELD_DEFS.title.operators).toContain("contains");
  });

  it("ships an ordered list of fields", () => {
    expect(FIELD_ORDER[0]).toBe("title");
    expect(FIELD_ORDER).toEqual(Object.keys(FILTER_FIELD_DEFS));
  });

  it("derives column-to-filter map from headerField entries", () => {
    expect(COLUMN_TO_FILTER.title).toBe("title");
    expect(COLUMN_TO_FILTER.employment_type_label).toBe("employment_type");
    expect(COLUMN_TO_FILTER.workplace_type_label).toBe("workplace_type");
    expect(COLUMN_TO_FILTER).not.toHaveProperty("department");
    expect(COLUMN_TO_FILTER).not.toHaveProperty("team");
  });
});

describe("operator labels", () => {
  it("labels every operator referenced by any field def", () => {
    const referenced = new Set<string>();
    Object.values(FILTER_FIELD_DEFS).forEach((def) => {
      def.operators.forEach((op) => referenced.add(op));
    });
    referenced.forEach((op) => {
      expect(OPERATOR_LABELS).toHaveProperty(op);
    });
  });
});

describe("misc constants", () => {
  it("exposes employment + workplace label maps", () => {
    expect(EMPLOYMENT_LABELS.full_time).toBe("Full-time");
    expect(WORKPLACE_LABELS.hybrid).toBe("Hybrid");
  });

  it("exposes date-range presets", () => {
    expect(DATE_RANGE_PRESETS[0]).toEqual({ label: "Today", value: "0" });
    expect(DATE_RANGE_PRESETS.length).toBeGreaterThan(0);
  });

  it("declares default page size + sort", () => {
    expect(PAGE_SIZE_ALLOWLIST).toContain(DEFAULT_PAGE_SIZE);
    expect(DEFAULT_SORT).toEqual([{ field: "first_seen_at", dir: "desc" }]);
  });

  it("lists sortable fields", () => {
    expect(SORTABLE_FIELDS).toContain("title");
    expect(SORTABLE_FIELDS).toContain("first_seen_at");
  });

  it("exposes the empty sentinel", () => {
    expect(EMPTY_SENTINEL).toBe("__EMPTY__");
  });
});
