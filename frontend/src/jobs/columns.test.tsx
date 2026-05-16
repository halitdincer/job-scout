import { fireEvent, render, waitFor } from "@testing-library/react";
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

function preventTestNavigation(link: HTMLElement) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.cookie =
    "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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

  it("renders the title cell as an anchor with seen styling", async () => {
    const col = findColumn("title");
    const cell = col.cell as (ctx: {
      row: { original: JobGridRow };
    }) => JSX.Element;
    document.cookie = "csrftoken=title-seen-token; path=/";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ listing_id: 1, seen: true, created: true }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const unseen = render(
      cell({ row: { original: makeRow({ seen: false, title: "Listing" }) } }),
    );
    const unseenLink = unseen.getByRole("link", { name: "Listing" });
    expect(unseenLink).toHaveAttribute("href", "https://example.com/job");
    expect(unseenLink.className).toBe("job-link");
    expect(unseenLink).not.toHaveAttribute("target");
    expect(unseenLink).not.toHaveAttribute("rel");
    preventTestNavigation(unseenLink);
    fireEvent.click(unseenLink);
    expect(unseenLink.className).toContain("seen-link");
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/jobs/1/seen/");
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(new Headers(init.headers).get("X-CSRFToken")).toBe(
      "title-seen-token",
    );
    await Promise.resolve();
    unseen.unmount();

    const seen = render(
      cell({ row: { original: makeRow({ seen: true, title: "Seen Role" }) } }),
    );
    expect(seen.getByRole("link", { name: "Seen Role" }).className).toBe(
      "job-link seen-link",
    );
  });

  it("removes optimistic seen styling when marking an unseen title fails", async () => {
    const col = findColumn("title");
    const cell = col.cell as (ctx: {
      row: { original: JobGridRow };
    }) => JSX.Element;
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const rendered = render(
      cell({
        row: { original: makeRow({ seen: false, title: "Retry Later" }) },
      }),
    );
    const link = rendered.getByRole("link", { name: "Retry Later" });

    preventTestNavigation(link);
    fireEvent.click(link);
    expect(link.className).toContain("seen-link");

    await waitFor(() => expect(link.className).toBe("job-link"));
  });

  it("keeps seen styling when remarking an already seen title fails", async () => {
    const col = findColumn("title");
    const cell = col.cell as (ctx: {
      row: { original: JobGridRow };
    }) => JSX.Element;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("offline"));

    const rendered = render(
      cell({
        row: { original: makeRow({ seen: true, title: "Still Seen" }) },
      }),
    );
    const link = rendered.getByRole("link", { name: "Still Seen" });

    preventTestNavigation(link);
    fireEvent.click(link);
    expect(fetchSpy).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();

    expect(link.className).toBe("job-link seen-link");
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
