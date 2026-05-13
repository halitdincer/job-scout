import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { useSources } from "@/api/sources";
import type { Source } from "@/types/api";

import { SourcesPage } from "./SourcesPage";

vi.mock("@/api/sources", () => ({
  useSources: vi.fn(),
}));

const mockUseSources = vi.mocked(useSources);

function mockSourcesState(state: {
  data?: Source[];
  isLoading?: boolean;
  isError?: boolean;
}) {
  mockUseSources.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as ReturnType<typeof useSources>);
}

describe("SourcesPage", () => {
  it("shows a loading state", () => {
    mockSourcesState({ isLoading: true });
    render(<SourcesPage />);
    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByText(/loading sources/i)).toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockSourcesState({ isError: true });
    render(<SourcesPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/could not load/i);
  });

  it("shows an empty state", () => {
    mockSourcesState({ data: [] });
    render(<SourcesPage />);
    expect(screen.getByText(/no sources configured/i)).toBeInTheDocument();
  });

  it("renders sources in the table", () => {
    mockSourcesState({
      data: [
        {
          id: 1,
          name: "E2E Source",
          platform: "greenhouse",
          board_id: "e2e-board",
          is_active: true,
        },
      ],
    });

    render(<SourcesPage />);

    expect(screen.getByText("E2E Source")).toBeInTheDocument();
    expect(screen.getByText("Greenhouse")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
