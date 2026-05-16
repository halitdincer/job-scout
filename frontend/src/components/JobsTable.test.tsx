import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { JobsTable } from "./JobsTable";
import { getJobColumns } from "@/jobs/columns";
import { mapJobRow } from "@/jobs/formatters";
import type { JobListing } from "@/types/api";

const COLUMNS = getJobColumns();
const FULL_VISIBILITY = Object.fromEntries(
  COLUMNS.map((c) => [String(c.id), c.meta?.defaultVisible !== false]),
);

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
    expect(screen.getByText("Jan 02, 2025 03:04")).toBeInTheDocument();
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
});
