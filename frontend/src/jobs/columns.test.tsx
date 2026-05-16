import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getJobColumns } from "./columns";
import type { JobGridRow } from "./formatters";

function findColumn(id: string) {
  const col = getJobColumns().find((c) => c.id === id);
  if (!col) throw new Error(`column ${id} missing`);
  return col;
}

function makeRow(overrides: Partial<JobGridRow> = {}): JobGridRow {
  return {
    id: 1,
    source_id: 1,
    source_name: "Source",
    external_id: "x-1",
    title: "Software Engineer",
    department: "Eng",
    team: "Platform",
    locations_display: "Toronto",
    employment_type_label: "Full-time",
    workplace_type_label: "Remote",
    locations: [],
    url: "https://example.com/job",
    status: "active",
    employment_type: "full_time",
    workplace_type: "remote",
    country: ["CA"],
    region: ["ON"],
    city: ["Toronto"],
    expired_at: null,
    published_at: "2025-01-02T03:04:00Z",
    updated_at_source: "2025-01-05T06:07:00Z",
    first_seen_at: "2025-01-03T00:00:00Z",
    last_seen_at: "2025-01-04T00:00:00Z",
    seen: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getJobColumns", () => {
  it("includes the title column sorted by default + visibility metadata", () => {
    const columns = getJobColumns();
    expect(columns.map((c) => c.id)).toContain("title");
    expect(findColumn("title").enableSorting).toBe(true);
    expect(findColumn("employment_type_label").enableSorting).toBe(false);
    expect(findColumn("external_id").meta?.defaultVisible).toBe(false);
    expect(findColumn("title").meta?.defaultVisible).toBe(true);
    expect(findColumn("department").meta).toMatchObject({
      filterField: "department",
      filterWidget: "text",
    });
    expect(findColumn("team").meta).toMatchObject({
      filterField: "team",
      filterWidget: "text",
    });
    expect(findColumn("locations_display").meta).toMatchObject({
      filterField: "location",
      filterWidget: "text",
    });
  });

  it("renders the title cell as an anchor with seen styling", () => {
    const col = findColumn("title");
    const cell = col.cell as (ctx: {
      row: { original: JobGridRow };
    }) => JSX.Element;

    const unseen = render(
      cell({ row: { original: makeRow({ seen: false, title: "Listing" }) } }),
    );
    const unseenLink = unseen.getByRole("link", { name: "Listing" });
    expect(unseenLink).toHaveAttribute("href", "https://example.com/job");
    expect(unseenLink.className).toBe("job-link");
    expect(unseenLink).toHaveAttribute("target", "_blank");
    expect(unseenLink).toHaveAttribute("rel", "noopener noreferrer");
    unseen.unmount();

    const seen = render(
      cell({ row: { original: makeRow({ seen: true, title: "Seen Role" }) } }),
    );
    expect(seen.getByRole("link", { name: "Seen Role" }).className).toBe(
      "job-link seen-link",
    );
  });

  it("renders date and array cell formatters", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-23T03:04:00Z"));

    const dateCol = findColumn("published_at");
    const dateRender = dateCol.cell as (ctx: {
      getValue: () => unknown;
    }) => JSX.Element | string;
    const renderedDate = render(
      <>{dateRender({ getValue: () => "2025-01-02T03:04:00Z" })}</>,
    );
    expect(renderedDate.getByText("3w ago")).toHaveAttribute(
      "title",
      "Jan 02, 2025 03:04",
    );
    renderedDate.unmount();
    expect(dateRender({ getValue: () => null })).toBe("");

    const countryCol = findColumn("country");
    const valuesRender = countryCol.cell as (ctx: {
      getValue: () => unknown;
    }) => string;
    expect(valuesRender({ getValue: () => ["CA", "US"] })).toBe("CA, US");
  });
});
