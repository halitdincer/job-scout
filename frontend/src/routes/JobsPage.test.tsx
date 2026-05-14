import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useJobs } from "@/api/jobs";
import { createQueryWrapper } from "@/test/queryWrapper";

import { JobsPage } from "./JobsPage";

vi.mock("@/api/jobs", () => ({
  useJobs: vi.fn(),
}));

function mockSavedViewsList(views: unknown[] = []) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(views), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

function renderJobs() {
  const Wrapper = createQueryWrapper();
  return render(
    <Wrapper>
      <JobsPage />
    </Wrapper>,
  );
}

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
    mockSavedViewsList();
    renderJobs();

    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByText("grid")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 6")).toBeInTheDocument();
  });

  it("changes page size and moves pages", async () => {
    mockJobsState();
    mockSavedViewsList();
    renderJobs();

    await userEvent.selectOptions(screen.getByLabelText("Page size"), "100");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(mockUseJobs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 100,
      sort: [{ field: "first_seen_at", dir: "desc" }],
      filter: null,
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
    mockSavedViewsList();
    renderJobs();

    await userEvent.click(screen.getByText("grid"));

    expect(mockUseJobs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      sort: [{ field: "title", dir: "asc" }],
      filter: null,
    });
  });

  it("ignores duplicate default sort events from data replacement", async () => {
    mockJobsState();
    mockSavedViewsList();
    renderJobs();

    await userEvent.click(screen.getByText("clear sort"));

    expect(mockUseJobs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      sort: [{ field: "first_seen_at", dir: "desc" }],
      filter: null,
    });
  });

  it("opens the filters sheet, applies a rule, and refetches with the new filter on page 1", async () => {
    mockJobsState({
      data: {
        results: [],
        count: 0,
        page: 3,
        page_size: 50,
        total_pages: 6,
        sort: [{ field: "first_seen_at", dir: "desc" }],
      },
    } as Partial<ReturnType<typeof useJobs>>);
    mockSavedViewsList();
    renderJobs();

    await userEvent.click(screen.getByRole("button", { name: "Open filters" }));
    await userEvent.selectOptions(
      await screen.findByLabelText("Add filter rule"),
      "title",
    );
    await userEvent.type(
      screen.getByLabelText("Value for Title"),
      "engineer",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Apply filters" }),
    );

    expect(mockUseJobs).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      sort: [{ field: "first_seen_at", dir: "desc" }],
      filter: { field: "title", operator: "contains", value: "engineer" },
    });
  });

  it("renders loading and error states", () => {
    mockJobsState({ isLoading: true, data: undefined });
    mockSavedViewsList();
    const Wrapper = createQueryWrapper();
    const { rerender } = render(
      <Wrapper>
        <JobsPage />
      </Wrapper>,
    );
    expect(screen.getByText(/loading jobs/i)).toBeInTheDocument();

    mockJobsState({ isError: true, data: undefined });
    rerender(
      <Wrapper>
        <JobsPage />
      </Wrapper>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/could not load/i);
  });

  it("completes the Save-as flow: dialog submits and currentView becomes set", async () => {
    mockJobsState();
    document.cookie = "csrftoken=t; path=/";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/views/" && (init?.method ?? "GET") === "GET") {
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "/api/views/" && init?.method === "POST") {
        const saved = {
          id: 42,
          name: "FromDialog",
          filter_expression: null,
          columns: [],
          sort: [{ field: "first_seen_at", dir: "desc" }],
          config: { page_size: 50 },
          created_at: "2025-05-01T00:00:00Z",
          updated_at: "2025-05-01T00:00:00Z",
        };
        return new Response(JSON.stringify(saved), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    renderJobs();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText(/Save as new view/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Save as new view/i));

    await user.type(await screen.findByLabelText("Name"), "FromDialog");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    // Dialog closes once save resolves.
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Save view" })).toBeNull(),
    );
  });

  it("completes the Delete flow: dialog submits and currentView resets", async () => {
    mockJobsState();
    document.cookie = "csrftoken=t; path=/";
    const view = {
      id: 99,
      name: "ToDelete",
      filter_expression: null,
      columns: [],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 50 },
      created_at: "2025-05-01T00:00:00Z",
      updated_at: "2025-05-01T00:00:00Z",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "/api/views/" && (init?.method ?? "GET") === "GET") {
        return new Response(JSON.stringify([view]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "/api/views/99/" && init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    renderJobs();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText("ToDelete")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("ToDelete"));

    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText(/Delete view/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Delete view/i));

    await user.click(screen.getByRole("button", { name: "Delete view" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Delete view" }),
      ).toBeNull(),
    );
  });

  it("opens the Save-as dialog from the menu and closes it on Cancel", async () => {
    mockJobsState();
    mockSavedViewsList();
    renderJobs();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText(/Save as new view/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Save as new view/i));

    expect(
      await screen.findByRole("heading", { name: "Save view" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Save view" })).toBeNull(),
    );
  });

  it("opens the Delete dialog from the menu and closes it on Cancel", async () => {
    mockJobsState();
    const view = {
      id: 9,
      name: "DeleteMe",
      filter_expression: null,
      columns: [],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 50 },
      created_at: "2025-05-01T00:00:00Z",
      updated_at: "2025-05-01T00:00:00Z",
    };
    mockSavedViewsList([view]);
    renderJobs();
    const user = userEvent.setup();

    // Load the view first so currentViewId is set and Delete menu item appears.
    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText("DeleteMe")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("DeleteMe"));

    // Reopen menu — Delete item now visible.
    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText(/Delete view/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Delete view/i));

    expect(
      await screen.findByRole("heading", { name: "Delete view" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Delete view" })).toBeNull(),
    );
  });

  it("opens Save-changes dialog with the current view name prefilled", async () => {
    mockJobsState();
    const view = {
      id: 11,
      name: "Renamable",
      filter_expression: null,
      columns: [],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 50 },
      created_at: "2025-05-01T00:00:00Z",
      updated_at: "2025-05-01T00:00:00Z",
    };
    mockSavedViewsList([view]);
    renderJobs();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText("Renamable")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("Renamable"));

    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText(/Save changes to/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Save changes to/i));

    const nameInput = (await screen.findByLabelText("Name")) as HTMLInputElement;
    expect(nameInput.value).toBe("Renamable");
  });

  it("loads a saved view: applies its filter, sort, and page size", async () => {
    mockJobsState();
    const view = {
      id: 1,
      name: "Eng",
      filter_expression: { field: "title", op: "contains", value: "engineer" },
      columns: [],
      sort: [{ field: "title", dir: "asc" }],
      config: { page_size: 100 },
      created_at: "2025-05-01T00:00:00Z",
      updated_at: "2025-05-01T00:00:00Z",
    };
    mockSavedViewsList([view]);
    renderJobs();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() => expect(screen.getByText("Eng")).toBeInTheDocument());
    await user.click(screen.getByText("Eng"));

    await waitFor(() =>
      expect(mockUseJobs).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 100,
        sort: [{ field: "title", dir: "asc" }],
        filter: { field: "title", op: "contains", value: "engineer" },
      }),
    );
  });

  it("toggles a column from the Columns menu", async () => {
    mockJobsState();
    mockSavedViewsList();
    renderJobs();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Columns" }));
    // "External ID" is hidden by default; clicking flips it visible. The
    // badge displays visible/total and is the simplest observable.
    const item = await screen.findByRole("menuitemcheckbox", {
      name: /External ID/,
    });
    expect(item).toHaveAttribute("aria-checked", "false");
    await user.click(item);
    await waitFor(() =>
      expect(
        screen.getByRole("menuitemcheckbox", { name: /External ID/ }),
      ).toHaveAttribute("aria-checked", "true"),
    );
  });

  it("loads a saved view's column visibility into the Columns menu", async () => {
    mockJobsState();
    const view = {
      id: 5,
      name: "WithCols",
      filter_expression: null,
      // Hide Title, show External ID — both inversions of the defaults so the
      // assertion proves the saved payload was honored.
      columns: [
        { field: "title", visible: false },
        { field: "external_id", visible: true },
      ],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 50 },
      created_at: "2025-05-01T00:00:00Z",
      updated_at: "2025-05-01T00:00:00Z",
    };
    mockSavedViewsList([view]);
    renderJobs();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() =>
      expect(screen.getByText("WithCols")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("WithCols"));

    await user.click(screen.getByRole("button", { name: "Columns" }));
    await waitFor(() =>
      expect(
        screen.getByRole("menuitemcheckbox", { name: /^Title$/ }),
      ).toHaveAttribute("aria-checked", "false"),
    );
    expect(
      screen.getByRole("menuitemcheckbox", { name: /External ID/ }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to default page size when a saved view has no page_size", async () => {
    mockJobsState();
    const view = {
      id: 2,
      name: "NoSize",
      filter_expression: null,
      columns: [],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: {},
      created_at: "2025-05-01T00:00:00Z",
      updated_at: "2025-05-01T00:00:00Z",
    };
    mockSavedViewsList([view]);
    renderJobs();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Saved views" }));
    await waitFor(() => expect(screen.getByText("NoSize")).toBeInTheDocument());
    await user.click(screen.getByText("NoSize"));

    await waitFor(() =>
      expect(mockUseJobs).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 50,
        sort: [{ field: "first_seen_at", dir: "desc" }],
        filter: null,
      }),
    );
  });
});
