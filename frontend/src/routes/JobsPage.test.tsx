import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useJobs } from "@/api/jobs";

import { JobsPage } from "./JobsPage";

vi.mock("@/api/jobs", () => ({
  useJobs: vi.fn(),
}));

vi.mock("@/components/Tabulator", () => ({
  Tabulator: ({ onSortChanged }: { onSortChanged?: (sort: unknown[]) => void }) => (
    <>
      <button
        type="button"
        onClick={() => onSortChanged?.([{ field: "title", dir: "asc" }])}
      >
        grid
      </button>
      <button type="button" onClick={() => onSortChanged?.([])}>
        clear sort
      </button>
    </>
  ),
}));

const mockUseJobs = vi.mocked(useJobs);

function mockJobsState(overrides: Partial<ReturnType<typeof useJobs>> = {}) {
  mockUseJobs.mockReturnValue({
    data: {
      results: [],
      count: 300,
      page: 1,
      page_size: 50,
      total_pages: 6,
      sort: [{ field: "first_seen_at", dir: "desc" }],
    },
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as ReturnType<typeof useJobs>);
}

describe("JobsPage", () => {
  it("renders chrome, grid, and pagination from the jobs envelope", () => {
    mockJobsState();
    render(<JobsPage />);

    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByText("grid")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 6")).toBeInTheDocument();
  });

  it("changes page size and moves pages", async () => {
    mockJobsState();
    render(<JobsPage />);

    await userEvent.selectOptions(screen.getByLabelText("Page size"), "100");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(mockUseJobs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 100,
      sort: [{ field: "first_seen_at", dir: "desc" }],
    });
  });

  it("resets to page 1 when the grid sort changes", async () => {
    mockJobsState({
      data: {
        results: [],
        count: 300,
        page: 2,
        page_size: 50,
        total_pages: 6,
        sort: [{ field: "first_seen_at", dir: "desc" }],
      },
    } as Partial<ReturnType<typeof useJobs>>);
    render(<JobsPage />);

    await userEvent.click(screen.getByText("grid"));

    expect(mockUseJobs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      sort: [{ field: "title", dir: "asc" }],
    });
  });

  it("ignores duplicate default sort events from data replacement", async () => {
    mockJobsState();
    render(<JobsPage />);

    await userEvent.click(screen.getByText("clear sort"));

    expect(mockUseJobs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      sort: [{ field: "first_seen_at", dir: "desc" }],
    });
  });

  it("renders loading and error states", () => {
    mockJobsState({ isLoading: true, data: undefined });
    const { rerender } = render(<JobsPage />);
    expect(screen.getByText(/loading jobs/i)).toBeInTheDocument();

    mockJobsState({ isError: true, data: undefined });
    rerender(<JobsPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/could not load/i);
  });
});
