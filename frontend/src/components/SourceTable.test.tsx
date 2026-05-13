import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import type { Source } from "@/types/api";

import { SourceTable } from "./SourceTable";

const sources: Source[] = [
  {
    id: 1,
    name: "E2E Source",
    platform: "greenhouse",
    board_id: "e2e-board",
    is_active: true,
  },
  {
    id: 2,
    name: "Workday Source",
    platform: "workday",
    board_id: "tenant/site",
    is_active: false,
  },
];

describe("SourceTable", () => {
  it("renders source rows with labels and status badges", () => {
    render(<SourceTable sources={sources} />);

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);

    expect(within(rows[1]).getByText("E2E Source")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Greenhouse")).toBeInTheDocument();
    expect(within(rows[1]).getByText("e2e-board")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Active")).toBeInTheDocument();

    expect(within(rows[2]).getByText("Workday Source")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Workday")).toBeInTheDocument();
    expect(within(rows[2]).getByText("tenant/site")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Inactive")).toBeInTheDocument();
  });

  it("falls back to the raw platform if a new backend platform appears", () => {
    render(
      <SourceTable
        sources={[
          {
            ...sources[0],
            platform: "future_platform" as Source["platform"],
          },
        ]}
      />,
    );

    expect(screen.getByText("future_platform")).toBeInTheDocument();
  });
});
