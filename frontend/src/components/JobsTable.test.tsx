import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JobsTable } from "./JobsTable";
import { getJobColumns } from "@/jobs/columns";
import { mapJobRow } from "@/jobs/formatters";
import type { JobListing } from "@/types/api";

const COLUMNS = getJobColumns();
const FULL_VISIBILITY = Object.fromEntries(
  COLUMNS.map((c) => [String(c.id), c.meta?.defaultVisible !== false]),
);

afterEach(() => {
  vi.useRealTimers();
});

function buildJob(overrides: Partial<JobListing> = {}): JobListing {
  return {
    id: 1,
    source_id: 1,
    source_name: "Acme",
    external_id: "ext-1",
    title: "Senior Engineer",
    department: "Engineering",
    locations: [
      {
        name: "Toronto",
        country_code: "CA",
        region_code: "ON",
        city: "Toronto",
        geo_key: "ON-Toronto",
      },
    ],
    url: "https://example.com/jobs/1",
    status: "active",
    team: "Platform",
    employment_type: "full_time",
    workplace_type: "remote",
    country: ["CA"],
    region: ["ON"],
    city: ["Toronto"],
    expired_at: null,
    published_at: "2025-01-02T03:04:00Z",
    updated_at_source: null,
    first_seen_at: "2025-01-03T00:00:00Z",
    last_seen_at: "2025-01-04T00:00:00Z",
    seen: false,
    ...overrides,
  };
}

describe("JobsTable", () => {
  it("renders rows with formatted cells and the title link", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-23T03:04:00Z"));

    const data = [mapJobRow(buildJob({ title: "Visible Job", seen: false }))];
    render(
      <JobsTable
        columns={COLUMNS}
        data={data}
        columnVisibility={FULL_VISIBILITY}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );

    const link = screen.getByRole("link", { name: "Visible Job" });
    expect(link).toHaveAttribute("href", "https://example.com/jobs/1");
    expect(link.className).toBe("job-link");
    expect(screen.getByText("3w ago")).toHaveAttribute(
      "title",
      "Jan 02, 2025 03:04",
    );
    expect(screen.getAllByText("CA").length).toBeGreaterThan(0);
  });

  it("renders the seen-link variant when the row is seen", () => {
    const data = [mapJobRow(buildJob({ title: "Already Seen", seen: true }))];
    render(
      <JobsTable
        columns={COLUMNS}
        data={data}
        columnVisibility={FULL_VISIBILITY}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Already Seen" }).className,
    ).toBe("job-link seen-link");
  });

  it("shows the empty message when there are no rows", () => {
    render(
      <JobsTable
        columns={COLUMNS}
        data={[]}
        columnVisibility={FULL_VISIBILITY}
        sorting={[]}
        onSortingChange={vi.fn()}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("falls back to the default empty message", () => {
    render(
      <JobsTable
        columns={COLUMNS}
        data={[]}
        columnVisibility={FULL_VISIBILITY}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );
    expect(screen.getByText("No jobs found")).toBeInTheDocument();
  });

  it("respects column visibility", () => {
    const data = [mapJobRow(buildJob())];
    const visibility = { ...FULL_VISIBILITY, source_name: false };
    render(
      <JobsTable
        columns={COLUMNS}
        data={data}
        columnVisibility={visibility}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("columnheader", { name: /Source/ })).toBeNull();
  });

  it("toggles sort: unsorted -> asc -> desc -> cleared", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    const { rerender } = render(
      <JobsTable
        columns={COLUMNS}
        data={[mapJobRow(buildJob())]}
        columnVisibility={FULL_VISIBILITY}
        sorting={[]}
        onSortingChange={onSortingChange}
      />,
    );

    const titleHeader = screen.getByRole("columnheader", { name: /Title/ });
    await user.click(within(titleHeader).getByRole("button"));
    expect(onSortingChange).toHaveBeenLastCalledWith([
      { field: "title", dir: "asc" },
    ]);

    rerender(
      <JobsTable
        columns={COLUMNS}
        data={[mapJobRow(buildJob())]}
        columnVisibility={FULL_VISIBILITY}
        sorting={[{ field: "title", dir: "asc" }]}
        onSortingChange={onSortingChange}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: /Title/ }),
    ).toHaveAttribute("aria-sort", "ascending");

    await user.click(
      within(screen.getByRole("columnheader", { name: /Title/ })).getByRole(
        "button",
      ),
    );
    expect(onSortingChange).toHaveBeenLastCalledWith([
      { field: "title", dir: "desc" },
    ]);

    rerender(
      <JobsTable
        columns={COLUMNS}
        data={[mapJobRow(buildJob())]}
        columnVisibility={FULL_VISIBILITY}
        sorting={[{ field: "title", dir: "desc" }]}
        onSortingChange={onSortingChange}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: /Title/ }),
    ).toHaveAttribute("aria-sort", "descending");

    await user.click(
      within(screen.getByRole("columnheader", { name: /Title/ })).getByRole(
        "button",
      ),
    );
    expect(onSortingChange).toHaveBeenLastCalledWith([]);
  });

  it("omits inline minWidth style for columns without it", () => {
    const data = [mapJobRow(buildJob({ external_id: "ext-42" }))];
    const visibility = { ...FULL_VISIBILITY, external_id: true };
    render(
      <JobsTable
        columns={COLUMNS}
        data={data}
        columnVisibility={visibility}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );
    const header = screen.getByRole("columnheader", { name: "External ID" });
    expect(header.getAttribute("style") ?? "").not.toContain("min-width");
    const cell = screen.getByRole("cell", { name: "ext-42" });
    expect(cell.getAttribute("style") ?? "").not.toContain("min-width");
  });

  it("does not render a sort button on non-sortable headers", () => {
    render(
      <JobsTable
        columns={COLUMNS}
        data={[mapJobRow(buildJob())]}
        columnVisibility={FULL_VISIBILITY}
        sorting={[]}
        onSortingChange={vi.fn()}
      />,
    );
    const employmentHeader = screen.getByRole("columnheader", {
      name: "Employment",
    });
    expect(within(employmentHeader).queryByRole("button")).toBeNull();
  });

  describe("header filter row", () => {
    it("renders header filter widgets when filter props are supplied", () => {
      const dispatch = vi.fn();
      render(
        <JobsTable
          columns={COLUMNS}
          data={[mapJobRow(buildJob())]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[]}
          filterDispatch={dispatch}
        />,
      );
      expect(screen.getByLabelText("Filter Title")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Filter Country" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Filter First Seen")).toBeInTheDocument();
    });

    it("hydrates header filter values from filterRules and routes dispatch", async () => {
      const user = userEvent.setup();
      const dispatch = vi.fn();
      render(
        <JobsTable
          columns={COLUMNS}
          data={[mapJobRow(buildJob())]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[
            {
              id: "r1",
              field: "title",
              operator: "contains",
              value: "engineer",
            },
          ]}
          filterDispatch={dispatch}
        />,
      );
      const trigger = screen.getByRole("button", { name: "Filter Title" });
      expect(trigger).toHaveTextContent("1 filter");
      await user.click(trigger);
      expect(screen.getByLabelText("Value for rule r1")).toHaveValue(
        "engineer",
      );
      await user.selectOptions(
        screen.getByLabelText("Operator for rule r1"),
        "not_contains",
      );
      expect(dispatch).toHaveBeenNthCalledWith(1, {
        type: "UPDATE_RULE_OPERATOR",
        ruleId: "r1",
        operator: "not_contains",
      });
      expect(dispatch).toHaveBeenNthCalledWith(2, { type: "COMMIT_FILTER" });
    });

    it("populates multi-select unique values from data", async () => {
      const user = userEvent.setup();
      render(
        <JobsTable
          columns={COLUMNS}
          data={[
            mapJobRow(buildJob({ id: 1, country: ["CA"] })),
            mapJobRow(
              buildJob({
                id: 2,
                country: ["US", null as unknown as string, ""],
              }),
            ),
            mapJobRow(buildJob({ id: 3, country: ["CA"] })),
          ]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[]}
          filterDispatch={vi.fn()}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Filter Country" }));
      expect(screen.getByLabelText("CA")).toBeInTheDocument();
      expect(screen.getByLabelText("US")).toBeInTheDocument();
    });

    it("collects unique source_name values from scalar columns", async () => {
      const user = userEvent.setup();
      render(
        <JobsTable
          columns={COLUMNS}
          data={[
            mapJobRow(buildJob({ id: 1, source_name: "Acme" })),
            mapJobRow(buildJob({ id: 2, source_name: "Globex" })),
          ]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[]}
          filterDispatch={vi.fn()}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Filter Company" }));
      expect(screen.getByLabelText("Acme")).toBeInTheDocument();
      expect(screen.getByLabelText("Globex")).toBeInTheDocument();
    });

    it("renders empty filter cells for columns without a filter widget", () => {
      const dispatch = vi.fn();
      const { container } = render(
        <JobsTable
          columns={COLUMNS}
          data={[mapJobRow(buildJob())]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[]}
          filterDispatch={dispatch}
        />,
      );
      // Department has no filter widget — its header-filter cell exists but is empty.
      const headerRows = container.querySelectorAll("thead tr");
      expect(headerRows.length).toBe(2);
      // Visible columns should equal the number of filter cells in the second row.
      const filterCells = headerRows[1].querySelectorAll("th");
      const visibleColumns = container.querySelectorAll(
        "thead tr:first-child th",
      );
      expect(filterCells.length).toBe(visibleColumns.length);
    });

    it("prefers facet values over per-page derived values for multi-selects", async () => {
      const user = userEvent.setup();
      render(
        <JobsTable
          columns={COLUMNS}
          data={[mapJobRow(buildJob({ id: 1, country: ["CA"] }))]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[]}
          filterDispatch={vi.fn()}
          facets={{ country: ["CA", "GB", "US"] }}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Filter Country" }));
      expect(screen.getByLabelText("CA")).toBeInTheDocument();
      expect(screen.getByLabelText("GB")).toBeInTheDocument();
      expect(screen.getByLabelText("US")).toBeInTheDocument();
    });

    it("falls back to per-page derived values when no facet is supplied for a field", async () => {
      const user = userEvent.setup();
      render(
        <JobsTable
          columns={COLUMNS}
          data={[mapJobRow(buildJob({ id: 1, country: ["CA"] }))]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[]}
          filterDispatch={vi.fn()}
          facets={{ source_name: ["Other"] }}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Filter Country" }));
      expect(screen.getByLabelText("CA")).toBeInTheDocument();
    });

    it("groups multiple filter rules for the same field into one header filter", async () => {
      const user = userEvent.setup();
      render(
        <JobsTable
          columns={COLUMNS}
          data={[mapJobRow(buildJob())]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
          filterRules={[
            {
              id: "r1",
              field: "title",
              operator: "contains",
              value: "engineer",
            },
            {
              id: "r2",
              field: "title",
              operator: "not_contains",
              value: "intern",
            },
          ]}
          filterDispatch={vi.fn()}
        />,
      );
      const trigger = screen.getByRole("button", { name: "Filter Title" });
      expect(trigger).toHaveTextContent("2 filters");
      await user.click(trigger);
      expect(screen.getByLabelText("Operator for rule r1")).toHaveValue(
        "contains",
      );
      expect(screen.getByLabelText("Operator for rule r2")).toHaveValue(
        "not_contains",
      );
    });

    it("skips the filter row when filterRules and filterDispatch are not supplied", () => {
      const { container } = render(
        <JobsTable
          columns={COLUMNS}
          data={[mapJobRow(buildJob())]}
          columnVisibility={FULL_VISIBILITY}
          sorting={[]}
          onSortingChange={vi.fn()}
        />,
      );
      const headerRows = container.querySelectorAll("thead tr");
      expect(headerRows.length).toBe(1);
    });
  });
});
