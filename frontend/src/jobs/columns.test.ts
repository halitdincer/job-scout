import { describe, expect, it } from "vitest";

import { getJobColumns } from "./columns";

describe("getJobColumns", () => {
  it("includes the sortable title column and default visible fields", () => {
    const columns = getJobColumns();
    expect(columns.map((column) => column.field)).toContain("title");
    expect(columns.find((column) => column.field === "title")?.headerSort).toBe(
      true,
    );
    expect(columns.find((column) => column.field === "external_id")?.visible).toBe(
      false,
    );
  });
});
